import {defineStore} from 'pinia';
import {computed,ref} from 'vue';
import {request,ApiError} from './api';
import {mergeProject} from './project-merge';
import {emptyProject,type Project,type Snapshot} from './model';
import {synchronizeWebsite,activeWebsite} from './websites';
import {globalContacts} from './communications';
export const useProject=defineStore('project',()=>{
  const project=ref<Project>(emptyProject()),revision=ref(0),loaded=ref(false),saving=ref(false),error=ref(''),publicUrl=ref<string|null>(null);
  let queue:Promise<void>=Promise.resolve(),generation=0,lastSaved='',timer:ReturnType<typeof setTimeout>|undefined;
  const history=ref<string[]>([]),position=ref(-1),pending=ref(false),conflict=ref(false);
  function record(){const value=JSON.stringify(project.value);if(history.value[position.value]===value)return;history.value=history.value.slice(0,position.value+1);history.value.push(value);if(history.value.length>30)history.value.shift();position.value=history.value.length-1;}
  function accept(s:Snapshot){if(loaded.value)record();lastSaved=JSON.stringify(s.project);project.value=s.project;if([project.value.site,...project.value.websites?.items.map(w=>w.document.site)||[]].some(site=>Object.values(site?.communications||{}).some(Boolean)))globalContacts(project.value);revision.value=s.revision;publicUrl.value=s.publicUrl;pending.value=lastSaved!==JSON.stringify(project.value);record();}
  async function load(){accept(await request<Snapshot>('/api/v1/project'));loaded.value=true;error.value='';conflict.value=false;}
  function downloadDraft(){const blob=new Blob([JSON.stringify({revision:revision.value,project:project.value},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ExportWeb-未保存编辑-'+new Date().toISOString().replaceAll(':','-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function reloadAfterConflict(){if(!pending.value||confirm('重新载入会放弃本页未保存的编辑。需要保留时，请先点击“下载当前编辑”。是否继续？')){clearTimeout(timer);await queue.catch(()=>{});await load();history.value=[];position.value=-1;record();}}
  function changed(){generation++;pending.value=true;clearTimeout(timer);timer=setTimeout(()=>void flush().catch(()=>{}),500);}
  function flush():Promise<void>{
    clearTimeout(timer);
    queue=queue.catch(()=>{}).then(async()=>{
      if(!loaded.value)throw Error('资料尚未载入');
      synchronizeWebsite(project.value);record();
      let at=generation,payload=JSON.stringify(project.value);if(payload===lastSaved){pending.value=false;error.value='';conflict.value=false;return;}saving.value=true;
      try{
        for(let attempt=0;attempt<2;attempt++){
          try{
            const s=await request<Snapshot>('/api/v1/project',{method:'PUT',headers:{'If-Match':String(revision.value)},body:payload});
            revision.value=s.revision;error.value='';conflict.value=false;
            lastSaved=JSON.stringify(s.project);
            if(at===generation){project.value=s.project;publicUrl.value=s.publicUrl;pending.value=false;}
            return;
          }catch(e){
            if(!(e instanceof ApiError)||e.status!==409)throw e;
            conflict.value=true;
            if(attempt===1)throw Error('服务器资料仍在更新，当前编辑已保留。请稍后重试同步保存。');
            const latest=await request<Snapshot>('/api/v1/project');
            const merged=mergeProject(JSON.parse(lastSaved),project.value,latest.project);
            if(merged.conflicts.length)throw Error('本页与服务器同时修改了相同资料，当前编辑已保留。请下载当前编辑，再重新载入核对。');
            lastSaved=JSON.stringify(latest.project);revision.value=latest.revision;publicUrl.value=latest.publicUrl;
            project.value=merged.value;history.value=[lastSaved];position.value=0;record();
            at=generation;payload=JSON.stringify(project.value);pending.value=payload!==lastSaved;
            if(!pending.value){error.value='';conflict.value=false;return;}
          }
        }
      }catch(e){error.value=e instanceof Error?e.message:String(e);throw e;}
      finally{saving.value=false;}
    });
    return queue;
  }
  async function publish(){await flush();const r=await request<{url:string}>('/api/v1/publications',{method:'POST',headers:{'If-Match':String(revision.value)},body:JSON.stringify({host:activeWebsite(project.value)?.domain||''})});publicUrl.value=r.url;return r.url;}
  const canUndo=computed(()=>position.value>0||(position.value===0&&history.value[0]!==JSON.stringify(project.value)));
  const canRedo=computed(()=>position.value<history.value.length-1&&history.value[position.value]===JSON.stringify(project.value));
  function undo(){record();if(position.value<=0)return;project.value=JSON.parse(history.value[--position.value]);changed();}
  function redo(){if(!canRedo.value)return;project.value=JSON.parse(history.value[++position.value]);changed();}
  return {project,revision,loaded,saving,pending,error,conflict,publicUrl,load,changed,flush,publish,accept,downloadDraft,reloadAfterConflict,canUndo,canRedo,undo,redo};
});
