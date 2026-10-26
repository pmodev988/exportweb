(function(root){
  'use strict';
  const local=typeof module!=='undefined'&&module.exports;
  const L=local?require('./site-languages.js'):root.LGASiteLanguages;
  const copy=x=>JSON.parse(JSON.stringify(x)),check=(ok,message)=>{if(!ok)throw Error(message);};
  const SC=local?require('./site-communications.js'):root.LGASiteCommunications;
  const actions=new Set(['saveGlobalCommunication','removeGlobalCommunication','saveWebsiteCommunications','saveWebsitePublication','prepareWebsitePublication','removePageDetail','addPageDetail','savePagePresentation','savePageEntry','removePageEntry','savePublishLanguages','saveWebsiteVersion','restoreWebsiteVersion','rehearseWebsiteRelease']);
  const modes={list:'列表',tabs:'Tab',carousel:'轮播'};
  const text=(x,n=500)=>String(x??'').trim().slice(0,n);
  const mounts=b=>b.detailDeleted?[]:b.mountIds||[b.parentPageId||b.id];
  function menuLabel(s,node){const path=[node.title],nodes=s.site.sitemap?.nodes||[];let current=node,seen=new Set([node.id]);while(current.parent){current=nodes.find(n=>n.id===current.parent);if(!current||seen.has(current.id))break;seen.add(current.id);path.unshift(current.title);}return ((current?.navPlacement||'header')==='footer'?'页脚':'页头')+' / '+path.join(' / ');}
  function mountIcon(b){return b&&mounts(b).length>1?'<span class="shared-detail-icon" title="多位置显示，共 '+mounts(b).length+' 个菜单" aria-label="多位置显示，共 '+mounts(b).length+' 个菜单"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8V4h11v11h-4M4 9h11v11H4Z"/></svg></span>':'';}
  const detailsFor=(s,id)=>s.site.blocks.filter(b=>mounts(b).includes(id));
  function setMounts(s,b,ids){const valid=s.site.sitemap?.nodes||[];check(ids.every(id=>valid.some(n=>n.id===id)),'请选择有效菜单');b.mountIds=[...new Set(ids)];if(b.parentPageId||b.kind==='detail'){b.kind='detail';b.parentPageId=b.mountIds[0]||'';}}
  function config(s,id){const saved=s.site.presentations?.[id];return {pagination:false,pageSize:10,entries:[],...saved,mode:saved?.mode||'list'};}
  function publication(s){return {target:s.site.publication?.target||'platform'};}
  function languages(s){const c=L.settings(s),allowed=L.recommend(c.markets);return c.enabled.filter(id=>allowed.includes(id));}
  function selectedLanguages(s){const allowed=languages(s);return (s.site.publishLanguages||allowed).filter(id=>allowed.includes(id));}
  function snapshot(s){return copy({blocks:s.site.blocks,logo:s.site.logo??s.company.logo??'',sitemap:s.site.sitemap||null,design:s.site.design||null,presentations:s.site.presentations||{},languages:s.site.languages||null,publishLanguages:selectedLanguages(s),publication:publication(s),communications:SC.settings(s),communicationIds:s.site.communicationIds,domain:s.site.domain,companyRevision:s.site.companyRevision});}
  function saveVersion(s,note){
    const versions=s.site.sourceVersions||=[];
    const item={id:'W'+String(versions.length+1).padStart(4,'0'),at:new Date().toISOString(),note:text(note)||'保存网站页面与配置',revision:s.site.revision,document:snapshot(s)};
    versions.push(item);return item;
  }
  function errors(s){
    const out=[];
    try{SC.normalize(SC.settings(s));}catch(err){out.push(err.message);}
    if(s.faults?.intakeFail)out.push('询盘接收演练失败，请先修复接收设置');
    if(!s.site.blocks.length)out.push('请先建立网站架构');
    for(const n of s.site.blocks.filter(n=>n.visible&&!n.parentPageId)){
      const p=config(s,n.id);if(!modes[p.mode])out.push(n.title+'：请选择栏目显示方式');
      for(const row of p.entries||[])if(row.detailId&&!s.site.blocks.some(b=>b.id===row.detailId&&b.visible))out.push(n.title+'：详情页已移除或隐藏');
    }
    if(!selectedLanguages(s).length)out.push('请从目标市场选择至少一种发布语言');
    for(const id of selectedLanguages(s))if(!L.ready(s).includes(id))out.push(L.name(id,'zh-CN')+'：请先完成该语言内容');
    if(!s.site.domain)out.push('请先在网站设置中登记访问地址');
    return out;
  }
  function apply(s,type,p){
    if(type==='saveGlobalCommunication'){const list=SC.migrate(s),c=SC.contact(p);c.id||='communication-'+(++s.sequence);const i=list.findIndex(x=>x.id===c.id);if(i<0)list.push(c);else list[i]=c;return;
    }else if(type==='removeGlobalCommunication'){SC.migrate(s);s.communications=s.communications.filter(c=>c.id!==p.id);for(const site of [s.site,...(s.business?.sites||[]).map(w=>w.document)])site.communicationIds=site.communicationIds.filter(id=>id!==p.id);return;
    }else if(type==='saveWebsiteCommunications'){
      if(Array.isArray(p.ids)){const list=SC.migrate(s);check(p.ids.every(id=>list.some(c=>c.id===id)),'请选择有效通讯');s.site.communicationIds=[...new Set(p.ids)];}else{s.site.communications=SC.normalize(p);delete s.site.communicationIds;}s.site.publicationPackage=null;s.site.releaseRehearsal=null;s.site.intake=null;s.site.correctionRequired=true;return;
    }else if(type==='saveWebsitePublication'){
      check(['platform','external'].includes(p.target),'请选择本站发布或外部发布');
      if(publication(s).target===p.target&&s.site.publication)return;
      s.site.publication={target:p.target};s.site.publicationPackage=null;return;
    }else if(type==='prepareWebsitePublication'){
      const failures=errors(s);check(!failures.length,failures.join('；'));
      const version=saveVersion(s,publication(s).target==='external'?'外部发布包':'本站发布包');
      s.site.publicationPackage={version:version.id,at:new Date().toISOString(),target:publication(s).target,domain:s.site.domain,locales:selectedLanguages(s),status:'PACKAGE_READY',revision:s.site.revision,signature:JSON.stringify(snapshot(s))};return;
    }else if(type==='removePageDetail'){
      check(p.confirm===true,'请确认删除这条详情');
      let block;
      if(p.entryId){const c=s.site.presentations?.[p.pageId],entry=c?.entries.find(x=>x.id===p.entryId);check(entry,'详情不存在');block=s.site.blocks.find(b=>b.id===entry.detailId&&b.parentPageId===p.pageId&&b.entryId===entry.id);saveVersion(s,'删除详情前自动保存');c.entries=c.entries.filter(x=>x.id!==entry.id);}
      else{block=s.site.blocks.find(b=>b.id===p.id);check(block,'详情不存在');saveVersion(s,'删除详情前自动保存');}
      if(block?.parentPageId||block?.kind==='detail'){
        s.site.blocks=s.site.blocks.filter(b=>b.id!==block.id);
        for(const c of Object.values(s.site.presentations||{}))c.entries=c.entries.filter(x=>x.detailId!==block.id);
        const strip=value=>{if(!value||typeof value!=='object')return;if(value.pageId===block.id)delete value.pageId;for(const child of Object.values(value))strip(child);};
        for(const b of s.site.blocks)strip(b.rich);
      }else if(block){Object.assign(block,{body:'',rich:[],visible:false,pending:true,detailDeleted:true});}
    }else if(type==='addPageDetail'){
      const page=s.site.blocks.find(b=>b.id===p.pageId&&!b.parentPageId);check(page,'栏目不存在');
      s.site.presentations||={};const c=s.site.presentations[p.pageId]||=copy(config(s,p.pageId));
      let entry=p.entryId?c.entries.find(x=>x.id===p.entryId):null;check(!p.entryId||entry,'记录不存在');
      if(entry?.detailId&&s.site.blocks.some(b=>b.id===entry.detailId))return;
      if(!entry){entry={id:'item-'+(++s.sequence),title:text(p.title,200)||'新详情',date:'',summary:'',image:'',detailId:''};c.entries.push(entry);}
      const id='detail-'+(++s.sequence);entry.detailId=id;
      s.site.blocks.push({id,kind:'detail',mountIds:[page.id],parentPageId:page.id,entryId:entry.id,title:entry.title,body:'',rich:[],rights:'OWN',visible:false,pending:true});
    }else if(type==='savePagePresentation'){
      check(s.site.blocks.some(b=>b.id===p.id&&!b.parentPageId)||s.site.sitemap?.nodes.some(n=>n.id===p.id),'栏目不存在');check(modes[p.mode],'请选择列表、Tab 或轮播');
      const pageSize=Number(p.pageSize);check(Number.isInteger(pageSize)&&pageSize>=1&&pageSize<=100,'每页数量须为 1—100 的整数');
      s.site.presentations||={};s.site.presentations[p.id]={...copy(config(s,p.id)),mode:p.mode,pagination:p.pagination===true||p.pagination==='on',pageSize};
    }else if(type==='savePageEntry'){
      check(s.site.blocks.some(b=>b.id===p.pageId&&!b.parentPageId),'栏目不存在');
      const c=config(s,p.pageId);check(modes[c.mode],'请选择有效的栏目显示方式');s.site.presentations||={};s.site.presentations[p.pageId]=c;
      check(text(p.title),'请填写标题');check(!p.date||/^\d{4}-\d{2}-\d{2}$/.test(p.date),'请填写有效日期');
      check(!p.image||/^https:\/\//i.test(p.image),'图片地址须以 https:// 开头');
      check(!p.detailId||s.site.blocks.some(b=>b.id===p.detailId&&b.visible),'请选择有效的详情页');
      const item={id:p.id||'item-'+(++s.sequence),date:text(p.date,10),title:text(p.title,200),summary:text(p.summary,2000),image:text(p.image,1500),detailId:text(p.detailId,100)};
      const at=c.entries.findIndex(n=>n.id===item.id);check(!p.id||at>=0,'记录不存在');if(at<0)c.entries.push(item);else c.entries[at]=item;
      const detail=s.site.blocks.find(b=>b.id===item.detailId&&b.parentPageId===p.pageId&&b.entryId===item.id);if(detail)detail.title=item.title;
    }else if(type==='removePageEntry'){
      const c=config(s,p.pageId);check(c.entries.some(n=>n.id===p.id),'记录不存在');s.site.presentations[p.pageId]={...c,entries:c.entries.filter(n=>n.id!==p.id)};
    }else if(type==='savePublishLanguages'){
      const allowed=languages(s);check(Array.isArray(p.locales)&&p.locales.length>0,'请至少选择一种发布语言');
      check(p.locales.every(id=>allowed.includes(id)),'发布语言必须来自当前目标市场');s.site.publishLanguages=[...new Set(p.locales)];
    }else if(type==='saveWebsiteVersion'){
      check(s.site.blocks.length,'请先建立网站架构');saveVersion(s,p.note);return;
    }else if(type==='restoreWebsiteVersion'){
      const v=s.site.sourceVersions?.find(v=>v.id===p.id);check(v,'版本不存在');
      const versions=s.site.sourceVersions,assets=s.site.assets,domain=s.site.domain;
      saveVersion(s,'恢复 '+v.id+' 前自动保存');Object.assign(s.site,copy(v.document),{sourceVersions:versions,assets,domain,communications:copy(v.document.communications||{}),publicationPackage:null});
      s.site.revision++;s.site.intake=null;s.site.correctionRequired=true;s.site.releaseRehearsal=null;saveVersion(s,'从 '+v.id+' 恢复为草稿');return;
    }else if(type==='rehearseWebsiteRelease'){
      const failures=errors(s);check(!failures.length,failures.join('；'));
      const version=saveVersion(s,p.note||'发布演练版本');s.site.releaseRehearsal={version:version.id,at:new Date().toISOString(),locales:selectedLanguages(s),status:'LOCAL_REHEARSAL_ONLY',domain:s.site.domain,revision:s.site.revision,signature:JSON.stringify(snapshot(s))};return;
    }else throw Error('未知网站操作');
    s.site.revision++;s.site.intake=null;s.site.correctionRequired=true;s.site.releaseRehearsal=null;s.site.publicationPackage=null;
  }
  function syncDetailEntry(s,block,p={}){
    const entry=s.site.presentations?.[block.parentPageId]?.entries.find(x=>x.id===block.entryId);if(!entry)return;
    const date=Object.hasOwn(p,'entryDate')?text(p.entryDate,10):entry.date,image=Object.hasOwn(p,'entryImage')?text(p.entryImage,1500):entry.image;
    check(!date||/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date,'请填写有效日期');
    check(!image||/^https:\/\//i.test(image),'图片地址须以 https:// 开头');
    Object.assign(entry,{title:block.title,date,image,summary:Object.hasOwn(p,'entrySummary')?text(p.entrySummary,2000):entry.summary});
  }
  function currentReceipt(s){const r=s.site.releaseRehearsal;return r&&r.revision===s.site.revision&&r.signature===JSON.stringify(snapshot(s))?r:null;}
  function currentPackage(s){const r=s.site.publicationPackage;return r&&r.revision===s.site.revision&&r.signature===JSON.stringify(snapshot(s))?r:null;}
  const api={mounts,menuLabel,mountIcon,detailsFor,setMounts,publication,currentPackage,syncDetailEntry,currentReceipt,actions,modes,config,languages,selectedLanguages,snapshot,errors,apply};
  if(local)module.exports=api;else root.LGASelfWebsite=api;
})(typeof globalThis!=='undefined'?globalThis:this);
