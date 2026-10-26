<script setup lang="ts">
import {nextTick,watch,onBeforeUnmount,ref,computed} from 'vue';
import {BalloonEditor,Essentials,Paragraph,Heading,Bold,Italic,Underline,Link,LinkImage,List,BlockQuote,Table,TableToolbar,Image,ImageCaption,ImageToolbar,ImageStyle,ImageUpload,ImageInsert,MediaEmbed,GeneralHtmlSupport,Alignment,HorizontalLine,Undo,Plugin} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import translations from 'ckeditor5/translations/zh-cn.js';
import {mediaItems,replaceMedia} from './detail-media';
import {importedContent,contentLayouts} from './imported-content';
import {menus,mounts,menuLabel} from './site-settings';
import {upload} from './api';
import SafeContent from './SafeContent.vue';
import {useProject} from './store';
import {task} from './tasks';
import type {Project,Snapshot,EntryInfo} from './model';
import WebsitePreview from './WebsitePreview.vue';
import type {Catalog} from './model';
const props=defineProps<{title:string;html:string;theme:string;pageId?:string;project?:Project;saving?:boolean;entry?:EntryInfo;hasEntry?:boolean;hidden?:boolean}>();
const emit=defineEmits<{change:[title:string,html:string];close:[];remove:[];preview:[];entryChange:[entry:EntryInfo];mountChange:[ids:string[]];visibility:[visible:boolean];ready:[editor:BalloonEditor]}>();
const mediaHtml=ref(props.html);
const layoutChoice=ref('media-text');
function insertLayout(){
 if(!editor||!ready.value)return;const html=contentLayouts.templates[layoutChoice.value];if(!html)return;
 const fragment=editor.data.toModel(editor.data.processor.toView(html));
 editor.model.change(writer=>{
  const root=editor!.model.document.getRoot()!;
  // Insert whole blocks at the root: selection correction can otherwise move
  // an end-of-document caret into the last card or gallery caption.
  writer.insert(fragment,root,'end');writer.setSelection(root,'end');
 });
 editor.editing.view.focus();changed();
}
const mounted=computed(()=>{const page=props.project?.pages.find(p=>p.id===props.pageId);return page?mounts(page):[];});
function toggleMount(id:string,checked:boolean){emit('mountChange',checked?[...mounted.value,id]:mounted.value.filter(value=>value!==id));}
const media=computed(()=>mediaItems(mediaHtml.value));
const host=ref<HTMLElement>(),title=ref(props.title),error=ref(''),ready=ref(false),uploads=ref(0);
let editor:BalloonEditor|undefined,disposed=false;
const entryDraft=ref<EntryInfo>({...props.entry||{date:'',summary:'',image:''}});
function entryChanged(){emit('entryChange',{...entryDraft.value});}
const mode=ref('ai'),mediaOpen=ref(false),instruction=ref('请根据当前页面内容与公司资料优化表达，沿用网站架构和风格；保留真实参数，不补造事实；使用所选图片与视频。'),aiBusy=ref(false),catalog=ref<Catalog>();
const store=useProject();
const previewTheme=computed(()=>catalog.value?.themes.find(t=>t.id===props.project?.theme));
fetch('/workspace/catalog.json').then(r=>r.json()).then(value=>catalog.value=value).catch(()=>{});
async function editWithAi(){if(!instruction.value.trim()||!props.pageId)return;aiBusy.value=true;error.value='';try{changed();await store.flush();const snapshot=await task<Snapshot>('/api/v1/website-edit',store.revision,{pageId:props.pageId,instruction:instruction.value});if(disposed)return;store.accept(snapshot);const page=snapshot.project.pages.find(p=>p.id===props.pageId),content=page?.content[snapshot.project.sourceLanguage];if(content){title.value=content.title;editor?.setData(content.html);}mode.value='manual';}catch(e){error.value=e instanceof Error?e.message:String(e);}finally{aiBusy.value=false;}}
class Uploads extends Plugin {
 init(){this.editor.plugins.get('FileRepository').createUploadAdapter=loader=>{
  const controller=new AbortController();
  return {upload:async()=>{uploads.value++;try{const file=await loader.file;if(!file)throw Error('没有选择图片');return {default:await upload(file,controller.signal)};}finally{uploads.value--;}},abort(){controller.abort();}};
 };}
}
function changed(){if(editor&&ready.value){mediaHtml.value=importedContent(editor.getData());emit('change',title.value,mediaHtml.value);}}
async function video(event:Event){const files=Array.from((event.target as HTMLInputElement).files||[]);if(!editor)return;for(const file of files){uploads.value++;try{const src=await upload(file);if(disposed)return;const html=file.type.startsWith('image/')?`<figure class="image"><img src="${src}"></figure>`:`<video controls src="${src}"></video>`;const view=editor.data.processor.toView(html);editor.model.insertContent(editor.data.toModel(view));}catch(e){error.value=e instanceof Error?e.message:String(e);}finally{uploads.value--;}}}

async function replaceFile(event:Event,index:number,kind:'image'|'video'){
 const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file||!editor)return;
 const original=editor.getData();uploads.value++;error.value='';
 try{const url=await upload(new File([file],crypto.randomUUID()+'-'+file.name,{type:file.type}));if(disposed)return;
 if(editor.getData()!==original)throw Error('上传期间正文已变化，请重新选择要替换的媒体');
 editor.setData(replaceMedia(original,index,kind,url,file.name));changed();
 }catch(e){error.value=e instanceof Error?e.message:String(e);}finally{uploads.value--;input.value='';}
}
watch(host,async()=>{
 await nextTick();if(!host.value||editor||disposed)return;
 try{
  const instance=await BalloonEditor.create(host.value,{
   licenseKey:'GPL',language:'zh-cn',translations:[translations],initialData:importedContent(props.html),plugins:[Essentials,Paragraph,Heading,Bold,Italic,Underline,Link,LinkImage,List,BlockQuote,Table,TableToolbar,Image,ImageCaption,ImageToolbar,ImageStyle,ImageUpload,ImageInsert,MediaEmbed,GeneralHtmlSupport,Alignment,HorizontalLine,Undo,Uploads],
   toolbar:{items:['undo','redo','|','heading','bold','italic','underline','|','alignment','bulletedList','numberedList','|','link','insertImage','mediaEmbed','insertTable','blockQuote','horizontalLine'],shouldNotGroupWhenFull:false},
   image:{toolbar:['toggleImageCaption','imageTextAlternative','linkImage','imageStyle:inline','imageStyle:block','imageStyle:side']},
   table:{contentToolbar:['tableColumn','tableRow','mergeTableCells']},
   mediaEmbed:{previewsInData:true},
   htmlSupport:{allow:[{name:/^(div|section|figure|a|img|video|source|iframe)$/,attributes:{src:true,controls:true,type:true,title:true,'data-media-kind':true,'data-media-name':true,'data-media-alt':true,'data-media-source':true},classes:['media-placeholder','rich-columns','rich-columns-2','rich-columns-3','rich-column','content-products','content-product','content-card-grid','content-card','content-media-text','content-gallery','content-specs','content-callout','content-button']}]},
   link:{defaultProtocol:'https://',addTargetToExternalLinks:true}
  });
  if(disposed){await instance.destroy();return;}editor=instance;ready.value=true;
  editor.model.document.on('change:data',changed);
  emit('ready',editor);
 }catch(e){error.value=e instanceof Error?e.message:String(e);}
});
function close(){if(uploads.value){error.value='正在上传文件，请等上传完成后关闭';return;}changed();emit('close');}
onBeforeUnmount(()=>{disposed=true;if(editor)void editor.destroy();});
</script>
<template><el-dialog :model-value="true" :show-close="false" :close-on-click-modal="false" :close-on-press-escape="false" width="min(1500px,96vw)" class="detail-dialog website-detail-dialog" @keydown.esc.stop="close"><section class="approved-page detail-editor">
<header class="detail-dialog-header"><h2>{{html?'修改内容':'添加内容'}} · {{title}}</h2><span role="status">{{store.error?'保存未完成':(saving||store.pending)?'正在保存…':'已自动保存'}}</span><button class="detail-delete" aria-label="删除详情" title="删除详情" @click="emit('remove')"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"/></svg></button><button aria-label="关闭编辑" @click="close">×</button></header>
<div class="detail-title-row"><label for="detail-title">页面标题</label><input id="detail-title" v-model="title" @input="changed"><span class="small muted">沿用网站风格</span></div>
 <label v-if="hasEntry" class="check"><input type="checkbox" :checked="!hidden" @change="emit('visibility',($event.target as HTMLInputElement).checked)">在网站显示这条详情</label><div v-if="project" class="detail-mounts"><label>挂载菜单</label><details class="detail-mount-picker"><summary>已选 {{mounted.length}} 个菜单</summary><div><label v-for="menu in menus(project)" :key="menu.id"><input type="checkbox" :checked="mounted.includes(menu.id)" @change="toggleMount(menu.id,($event.target as HTMLInputElement).checked)">{{menuLabel(project.pages,menu)}}</label></div></details></div>
<details v-if="hasEntry" class="detail-entry-fields"><summary>列表信息</summary><div class="grid2"><label>日期<input v-model="entryDraft.date" type="date" @input="entryChanged"></label><label>封面图片地址<input v-model="entryDraft.image" placeholder="https://…" @input="entryChanged"></label></div><label>摘要<textarea v-model="entryDraft.summary" rows="2" maxlength="2000" @input="entryChanged"></textarea></label></details>
<div class="detail-mode-bar"><div class="detail-mode-tabs" role="tablist" aria-label="编辑方式"><button v-for="[id,label] in [['manual','人工编排'],['ai','✦ AI 编辑'],['preview','最终效果']]" :key="id" role="tab" :aria-selected="mode===id" @click="changed();mode=id">{{label}}</button></div><div class="inline"><button @click="mediaOpen=!mediaOpen">图片与视频 {{media.length}}</button><button class="primary" @click="changed();emit('preview')">预览详情页</button></div></div>
<div class="detail-body-scroll">
<div v-if="mode==='manual'" class="detail-layout-tools"><label>常用布局<select v-model="layoutChoice" aria-label="常用布局"><option v-for="layout in contentLayouts.components" :key="layout.id" :value="layout.id">{{layout.name}}</option></select></label><button :disabled="!ready" @click="insertLayout">添加到文末</button><small>沿用当前网站风格</small></div>
<section v-if="mediaOpen" class="card detail-media-panel"><div class="between"><h3>图片与视频</h3><label class="detail-upload">上传图片 / 视频<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" multiple :disabled="!ready||!!uploads" @change="video"></label></div><ul class="detail-media-list"><li v-for="item in media" :key="item.index"><span><strong>{{item.kind==='image'?'图片':'视频'}}{{item.placeholder?'占位':''}}</strong><span :title="item.alt+' · '+item.name">{{item.alt||item.name}}<small v-if="item.alt">{{item.name}}</small></span></span><label class="file-button">替换<input type="file" :accept="item.kind==='image'?'image/png,image/jpeg,image/gif,image/webp':'video/mp4,video/webm'" :disabled="!ready||!!uploads" @change="replaceFile($event,item.index,item.kind)"></label></li></ul><p v-if="uploads" role="status">正在上传 {{uploads}} 个文件…</p></section>
<div v-show="mode==='manual'" :class="['editor-document','theme-detail-editor',theme]"><p v-if="!ready" role="status">{{error?'编辑器加载未完成，原有内容保留':'正在载入编辑器…'}}</p><SafeContent v-if="!ready" :html="html"/><div ref="host" class="ck-content smart-detail-content"></div></div>
<section v-if="mode==='ai'" class="detail-ai-panel"><div class="detail-ai-brief"><label for="edit-instruction">让 AI 怎样编辑这一页？</label><textarea id="edit-instruction" v-model="instruction" rows="5" placeholder="例如：以产品特点、应用场景、合作流程编排；使用产品主图和演示视频；保留已有参数。"></textarea><div class="between"><span class="small muted">沿用当前内容、架构与风格</span><button class="primary" :disabled="aiBusy||!instruction.trim()" @click="editWithAi">{{aiBusy?'正在编辑…':'生成详情页'}}</button></div></div></section>
<div v-if="mode==='preview'" class="detail-result"><WebsitePreview v-if="project&&previewTheme" :project="project" :theme="previewTheme!" :page-id="pageId"/><SafeContent v-else :html="html"/></div>

<p v-if="error||store.error" role="alert" class="error">{{error||store.error}}</p>
</div></section></el-dialog></template>
