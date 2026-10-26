<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,watch,defineAsyncComponent} from 'vue';
import {useProject} from './store';
import {request,upload,download} from './api';
import {settings,presentation,menus,isMenu,mounts,setMounts,menuPosition,menuLabel,removeMenus,numberMenus,removeDetail,websiteSteps,type WebsiteStep} from './site-settings';
import WebsiteContentTree from './WebsiteContentTree.vue';
import WebsiteVersions from './WebsiteVersions.vue';
import WebsiteContacts from './WebsiteContacts.vue';
import {globalContacts,selectedContacts,contactTypes} from './communications';
import SiteGeo from './SiteGeo.vue';
import SiteArticles from './SiteArticles.vue';
import WebsiteLanguages from './WebsiteLanguages.vue';
import {task} from './tasks';
import {ElMessageBox} from 'element-plus';
import {applySkeleton,ancestors,updateContent,mergeImported,type Catalog,type ImportedWebsite,type Project,type Snapshot} from './model';
import SiteMenu from './SiteMenu.vue';
import SafeContent from './SafeContent.vue';
import WebsiteDesign from './WebsiteDesign.vue';
import WebsiteList from './WebsiteList.vue';
import WebsiteStructure from './WebsiteStructure.vue';
import {activeWebsite,websites,switchWebsite,websiteProject} from './websites';
import {useRoute,useRouter} from 'vue-router';
const DetailEditor=defineAsyncComponent(()=>import('./DetailEditor.vue'));
const store=useProject(),catalog=ref<Catalog>(),step=ref<WebsiteStep>('网站架构'),selected=ref('hero'),locale=ref('zh-Hans'),editing=ref(false),importing=ref(false),url=ref(''),details=ref(true),readImages=ref(true),readVideos=ref(true),busy=ref(false),error=ref('');
const route=useRoute(),router=useRouter(),list=ref<InstanceType<typeof WebsiteList>>(),opening=ref(false);
const editingSite=computed(()=>typeof route.query.site==='string'),site=computed(()=>activeWebsite(store.project)),effectiveProject=computed(()=>websiteProject(store.project));
async function openSite(id:string,importExisting=false){error.value='';opening.value=true;try{await articleEditor.value?.flush();if(store.project.websites?.activeId!==id){await store.flush();switchWebsite(store.project,id);store.changed();await store.flush();}await router.push({path:'/website',query:{site:id}});locale.value=store.project.sourceLanguage;step.value='网站架构';selected.value=store.project.pages[0]?.id||'hero';if(importExisting)importing.value=true;return true;}catch(e){error.value=e instanceof Error?e.message:String(e);return false;}finally{opening.value=false;}}
watch(()=>route.query.site,async id=>{if(typeof id==='string'&&id!==store.project.websites?.activeId){const articleJob=route.query.articleJob;if(await openSite(id)&&articleJob){await router.replace({path:'/website',query:{site:id,articleJob}});step.value='智能软文';}}});
const articleEditor=ref<InstanceType<typeof SiteArticles>>();
watch(()=>route.query.articleJob,id=>{if(id)step.value='智能软文';});
const steps=websiteSteps,siteSettings=computed(()=>settings(store.project));
const subtitles:Record<WebsiteStep,string>={'网站架构':'选择页面架构，规划客户怎样找到产品并联系你。','网站风格':'选择适合自己的视觉风格，保留已有栏目与内容。','Logo':'管理网站标识。','内容详情':'架构与风格已应用，按栏目完善文案、图片与展示内容。','GEO 优化':'改善内容可理解性，记录 AI 引用观察。','智能软文':'围绕产品写文章，核对后加入网站内容。','网站语言':'按目标市场自动翻译并保存，可直接预览或继续。','通讯设置':'','发布网站':'在这里预览、发布或更新网站。','版本记录':'保存与恢复页面和配置。'};
const contacts=computed(()=>globalContacts(store.project)),selectedCommunications=computed(()=>selectedContacts(store.project));
const unmounted=computed(()=>store.project.pages.filter(p=>!p.detailDeleted&&!isMenu(p)&&!mounts(p).length));
const menuPages=computed(()=>menus(store.project)),rootMenus=computed(()=>menuPages.value.filter(p=>!p.parent));
const allowedLanguages=computed(()=>Array.from(new Set(effectiveProject.value.company.markets.flatMap(m=>catalog.value?.marketLanguages[m]||[]))));
const chosenLanguages=computed({get:()=>siteSettings.value.publishLanguages??store.project.languages.filter(l=>allowedLanguages.value.includes(l)),set:(value:string[])=>{siteSettings.value.publishLanguages=value;for(const l of value)if(!store.project.languages.includes(l))store.project.languages.push(l);store.changed();}});
const logoStamp=ref(0),logoBusy=ref(false),versionList=ref<InstanceType<typeof WebsiteVersions>>();
const pageDisplay=computed(()=>page.value?presentation(store.project,page.value.id):{mode:'list' as const,pagination:false,pageSize:10});
async function changeStep(value:WebsiteStep){error.value='';try{await articleEditor.value?.flush();await store.flush();if(value==='内容详情'&&!catalog.value?.themes.some(t=>t.id===store.project.theme)){step.value='网站风格';throw Error('请先设定网站风格，再查看内容详情');}step.value=value;}catch(e){error.value=e instanceof Error?e.message:String(e);}}
async function saveVersion(note='保存网站页面与配置'){await store.flush();return request('/api/v1/website-versions',{method:'POST',headers:{'If-Match':String(store.revision)},body:JSON.stringify({note})});}
async function deleteDetail(id=page.value?.id){if(!id)return;try{await ElMessageBox.confirm('删除这条内容详情？栏目架构会保留。','删除详情',{confirmButtonText:'删除',cancelButtonText:'取消',type:'warning'});}catch{return;}
 const before=JSON.stringify(store.project);try{await saveVersion('删除详情前自动保存');removeDetail(store.project,id);store.changed();await store.flush();editing.value=false;}catch(e){store.project=JSON.parse(before);error.value=String(e);}}
function addDetail(owner:string){const id=crypto.randomUUID();store.project.pages.push({id,parent:'',ownerPageId:owner,kind:'detail',mountIds:[owner],title:'新详情',path:'/detail-'+id+'/',content:{[store.project.sourceLanguage]:{title:'新详情',html:''}}});selected.value=id;locale.value=store.project.sourceLanguage;editing.value=true;store.changed();}
async function setLogo(event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)){error.value='Logo 请选择 PNG、JPEG 或 WebP 图片';return;}
 const owner=store.project.websites?.activeId;logoBusy.value=true;error.value='';try{await store.flush();const url=await upload(file);if(owner!==store.project.websites?.activeId)return;const old=siteSettings.value.logo;siteSettings.value.logo=url;logoStamp.value=Date.now();store.changed();try{await store.flush();}catch(e){siteSettings.value.logo=old;throw e;}}catch(e){error.value=e instanceof Error?e.message:String(e);}finally{logoBusy.value=false;}}
const exportBusy=ref(false),publicationMessage=ref('');
const publicationUrl=computed(()=>site.value?.domain?'https://'+site.value.domain+'/':'');
const publishedHere=computed(()=>!!publicationUrl.value&&store.publicUrl===publicationUrl.value);
watch(()=>site.value?.id,()=>{publicationMessage.value='';});
async function exportSite(){if(busy.value)return;const owner=site.value?.id,name=(site.value?.name||'website')+'-完整展示网站.zip';busy.value=true;exportBusy.value=true;error.value='';publicationMessage.value='';try{await store.flush();if(owner!==site.value?.id)throw Error('网站已切换，请在目标网站重新下载');await download('/api/v1/website-export',store.revision,name);if(owner===site.value?.id)publicationMessage.value='网站 ZIP 已下载。解压后按包内“部署说明”上传到服务器；下载不会自动上线。';}catch(e){if(owner===site.value?.id)error.value=e instanceof Error?e.message:String(e);}finally{busy.value=false;exportBusy.value=false;}}
async function saveContacts(){try{store.changed();await store.flush();}catch(e){error.value=String(e);}}
const imported=ref<ImportedWebsite>();
const showArchitectures=ref(false);
const structure=ref(false),addingMenu=ref(false),menuName=ref(''),parentId=ref(''),navPlacement=ref<'header'|'footer'>('header'),footerExpanded=ref(false);
const structureInfo=computed(()=>siteSettings.value.structure||{template:catalog.value?.skeletons.find(s=>s.nodes.length===menuPages.value.length&&s.nodes.every(n=>menuPages.value.some(p=>p.id===n.id)))?.id||'',revision:1});
const structureLabel=computed(()=>catalog.value?.skeletons.find(s=>s.id===structureInfo.value.template)?.name||'自定义架构');
const displayDraft=ref({mode:'list' as 'list'|'tabs'|'carousel',pagination:false,pageSize:10});
function structureChanged(template=structureInfo.value.template){siteSettings.value.structure={template,revision:structureInfo.value.revision+1};}
const languageChoices=computed(()=>{
 const labels:Record<string,string>={'zh-Hans':'中文（简体）',en:'English',ja:'日本語',de:'Deutsch',fr:'Français',es:'Español',ar:'العربية'};
 for(const code of [store.project.sourceLanguage,...store.project.languages])if(!labels[code])labels[code]=code;
 return Object.entries(labels);
});
let importController:AbortController|undefined;
onBeforeUnmount(()=>{importController?.abort();window.removeEventListener('hashchange',recoverImport);});
const page=computed(()=>store.project.pages.find(p=>p.id===selected.value)||store.project.pages[0]);
const localizedPages=computed(()=>menuPages.value.map(p=>({...p,title:p.content[locale.value]?.menuTitle||p.title})));
const content=computed(()=>page.value?.content[locale.value]||{title:page.value?.title||'',html:''});
const theme=computed(()=>catalog.value?.themes.find(t=>t.id===store.project.theme)?.classes||'');
onMounted(async()=>{const articleJob=route.query.articleJob;catalog.value=await (await fetch('/workspace/catalog.json')).json();locale.value=store.project.sourceLanguage;websites(store.project);if(typeof route.query.site==='string')await openSite(route.query.site);await recoverImport();if(articleJob){await router.replace({path:'/website',query:{site:store.project.websites?.activeId,articleJob}});step.value='智能软文';}window.addEventListener('hashchange',recoverImport);});
async function recoverImport(){const id=new URLSearchParams(location.hash.split('?')[1]||'').get('import');if(!id||!/^[a-f0-9-]{36}$/.test(id))return;try{const ticket=await request<{kind:string;status:string;result:ImportedWebsite}>('/api/v1/jobs/'+id);if(ticket.kind==='IMPORT'&&ticket.status==='SUCCEEDED'){const siteId=ticket.result.siteId||(store.project.websites?.items.length===1?store.project.websites.activeId:'');if(!siteId)throw Error('该历史导入任务没有网站标识，请进入目标网站重新读取');if(!await openSite(siteId))return;imported.value=ticket.result;url.value=ticket.result.source;importing.value=true;}}catch(e){error.value=e instanceof Error?e.message:String(e);}}
async function skeleton(id:string){const s=catalog.value?.skeletons.find(s=>s.id===id);if(!s)return;if(store.project.pages.length){try{await ElMessageBox.confirm('更换网站架构会调整栏目，原有正文按页面路径保留。当前架构会先保存为版本。','更换行业架构',{confirmButtonText:'更换',cancelButtonText:'保留当前架构'});await saveVersion('更换架构前自动保存');}catch{return;}}store.project=applySkeleton(store.project,s.nodes);structureChanged(id);selected.value=store.project.pages[0].id;store.changed();showArchitectures.value=false;step.value='网站架构';}
function select(id:string){selected.value=id;document.querySelectorAll('.site-menu details[open]').forEach(d=>d.removeAttribute('open'));}
function change(title:string,html:string){if(page.value){store.project=updateContent(store.project,page.value.id,locale.value,title,html);const changed=store.project.pages.find(p=>p.id===page.value!.id);if(changed&&html.trim())changed.detailDeleted=false;store.changed();}}
async function done(){try{await store.flush();editing.value=false;}catch(e){error.value=String(e);}}
async function read(){
 busy.value=true;error.value='';imported.value=undefined;importController=new AbortController();
 try{await store.flush();const result=await task<ImportedWebsite>('/api/v1/website-import',store.revision,{url:url.value,details:details.value,images:readImages.value,videos:readVideos.value},importController.signal);if(!importController.signal.aborted)imported.value=result;}
 catch(e){if(!importController.signal.aborted)error.value=e instanceof Error?e.message:String(e);}
 finally{busy.value=false;}
}
function cancelImport(){importController?.abort();importing.value=false;imported.value=undefined;}
async function applyImport(){
 if(!imported.value)return;
 if(imported.value.siteId&&imported.value.siteId!==store.project.websites?.activeId){error.value='导入结果属于另一个网站，请重新打开原网站';return;}
 busy.value=true;
 try{store.project=mergeImported(store.project,imported.value);store.changed();await store.flush();selected.value=store.project.pages[0]?.id||'hero';locale.value=store.project.sourceLanguage;importing.value=false;imported.value=undefined;step.value='网站风格';}
 catch(e){error.value=e instanceof Error?e.message:String(e);}
 finally{busy.value=false;}
}
function languageChanged(){if(!store.project.languages.includes(store.project.sourceLanguage))store.project.languages.unshift(store.project.sourceLanguage);locale.value=store.project.sourceLanguage;store.changed();}
async function translate(){busy.value=true;error.value='';try{await store.flush();const result=await task<Snapshot>('/api/v1/translations',store.revision);store.accept(result);}catch(e){error.value=e instanceof Error?e.message:String(e);}finally{busy.value=false;}}
async function preview(){
 const tab=window.open('about:blank','_blank');if(!tab){error.value='浏览器阻止了预览窗口，请允许打开新窗口';return;}tab.opener=null;
 try{await store.flush();tab.location.replace('/api/v1/preview?locale='+encodeURIComponent(locale.value)+'&page='+encodeURIComponent(page.value?.id||'hero'));}
 catch(e){tab.close();error.value=e instanceof Error?e.message:String(e);}
}
async function publish(){busy.value=true;error.value='';publicationMessage.value='';try{await saveVersion('发布网站前保存');const address=await store.publish();publicationMessage.value='已发布到 '+address;}catch(e){error.value=e instanceof Error?e.message:String(e);}finally{busy.value=false;}}
function addPage(parent=''){menuName.value='';parentId.value=parent;navPlacement.value=parent?menuPosition(menuPages.value,menuPages.value.find(p=>p.id===parent)!):'header';footerExpanded.value=false;addingMenu.value=true;structure.value=true;}
const parentOptions=computed(()=>menuPages.value.filter(p=>p.id!==page.value?.id&&!ancestors(store.project.pages,p.id).some(a=>a.id===page.value?.id)));
function openStructure(){if(!page.value)return;addingMenu.value=false;menuName.value=page.value.content[locale.value]?.menuTitle||page.value.title;parentId.value=page.value.parent;navPlacement.value=menuPosition(menuPages.value,page.value);footerExpanded.value=!!page.value.footerExpanded;displayDraft.value={...presentation(store.project,page.value.id)};structure.value=true;}
function saveStructure(){if(!menuName.value.trim())return;if(addingMenu.value){const id=crypto.randomUUID();store.project.pages.push({id,parent:parentId.value,navPlacement:navPlacement.value,footerExpanded:footerExpanded.value,title:menuName.value.trim(),path:'/page-'+id+'/',content:{}});selected.value=id;addingMenu.value=false;structure.value=false;numberMenus(store.project);structureChanged();store.changed();return;}if(!page.value)return;const p=page.value;
 if(locale.value===store.project.sourceLanguage)p.title=menuName.value.trim();
 p.content[locale.value]={...content.value,menuTitle:menuName.value.trim()};p.parent=parentId.value;p.navPlacement=navPlacement.value;p.footerExpanded=footerExpanded.value;siteSettings.value.presentations[p.id]={...displayDraft.value};numberMenus(store.project);structureChanged();store.changed();structure.value=false;
}
function move(direction:number){if(!page.value)return;const siblings=menuPages.value.filter(p=>p.parent===page.value!.parent&&(p.parent||menuPosition(menuPages.value,p)===menuPosition(menuPages.value,page.value!))),index=siblings.findIndex(p=>p.id===page.value!.id),target=siblings[index+direction];if(!target)return;const all=store.project.pages,a=all.indexOf(page.value),b=all.indexOf(target);[all[a],all[b]]=[all[b],all[a]];numberMenus(store.project);structureChanged();store.changed();}
async function removePage(){if(!page.value)return;try{await ElMessageBox.confirm('删除当前栏目及其下级页面？当前架构会先保存为版本。','删除栏目',{confirmButtonText:'删除',cancelButtonText:'保留',type:'warning'});await saveVersion('移除栏目之前自动保存');}catch(e){if(e instanceof Error)error.value=e.message;return;}
 const id=page.value.id,remove=new Set(store.project.pages.filter(p=>ancestors(store.project.pages,p.id).some(a=>a.id===id)).map(p=>p.id));removeMenus(store.project,remove);selected.value=store.project.pages[0]?.id||'hero';numberMenus(store.project);structureChanged();store.changed();structure.value=false;
}

</script>
<template>
<div class="approved-page website-workspace"><div class="workspace"><div class="stack">
 <div class="pagehead"><div class="sw-heading-line"><h1>{{editingSite?step:'独立网站'}}</h1><p v-if="editingSite&&subtitles[step]">{{subtitles[step]}}</p></div></div>
 <WebsiteList :editor="editingSite" ref="list" @edit="openSite"/>
 <template v-if="editingSite">
 <div class="biz-site-bar"><strong>{{site?.name}}</strong><span class="small">{{site?.profileMode==='independent'?'独立公司资料':'共用公司资料'}}</span><div class="inline"><button @click="list?.open(site)">网站设置</button><button :disabled="opening||logoBusy" @click="store.flush().then(()=>router.push('/website')).catch(e=>error=String(e))">全部网站</button></div></div>
 <div class="site-workflow-bar"><nav class="task-tabs" aria-label="网站编辑"><button v-for="s in steps" :key="s" :class="{active:step===s}" :aria-current="step===s?'step':undefined" @click="changeStep(s)">{{s}}</button></nav><button :disabled="!page" @click="preview">独立窗口预览</button></div>
 <p v-if="error" role="alert" class="error">{{error}}</p>
 <section v-if="step==='网站架构'" class="card site-map-overview">
  <div class="between"><div><h2>{{menuPages.length?'网站架构':'选取网站架构'}}</h2><p>点栏目名称或铅笔修改架构与显示设置；箭头展开下级。</p></div><div class="inline"><span v-if="menuPages.length" class="tag">{{structureLabel}} · v{{structureInfo.revision}}</span><button v-if="menuPages.length" @click="addPage('')">添加一级菜单</button><button v-if="menuPages.length" @click="showArchitectures=!showArchitectures">{{showArchitectures?'返回当前架构':'更换网站架构'}}</button><button @click="importing=true">从已有网站读取</button></div></div>
  <WebsiteStructure v-if="menuPages.length&&!showArchitectures" :pages="localizedPages" :company="effectiveProject.company.name" :details="store.project.pages" :source="store.project.sourceLanguage" @detail="select($event);locale=store.project.sourceLanguage;editing=true" @select="select($event);openStructure()" @settings="select($event);openStructure()"/>
  <div v-else class="catalog"><button v-for="s in catalog?.skeletons" :key="s.id" @click="skeleton(s.id)"><strong>{{s.name}}</strong><small>{{s.nodes.filter(n=>!n.parent).map(n=>n.title).join(' · ')}}</small></button></div>
  <section v-if="structure&&(page||addingMenu)" class="map-properties"><div class="between"><h3>{{addingMenu?(parentId?'添加下级栏目':'添加一级菜单'):'编辑栏目 · '+page?.title}}</h3></div><form @submit.prevent="saveStructure"><div class="grid2"><div><label for="menu-title">栏目名称</label><input id="menu-title" v-model="menuName" required maxlength="180"></div><div><label for="menu-parent">放在哪个菜单下？</label><select id="menu-parent" v-model="parentId"><option value="">一级菜单</option><option v-for="p in (addingMenu?menuPages:parentOptions)" :key="p.id" :value="p.id">{{menuLabel(menuPages,p)}}</option></select></div><div v-if="!parentId"><label for="menu-placement">显示位置</label><select id="menu-placement" v-model="navPlacement"><option value="header">页头</option><option value="footer">页脚</option></select></div><label v-if="!parentId&&navPlacement==='footer'" class="menu-expanded-choice"><input v-model="footerExpanded" type="checkbox">默认展开</label></div><fieldset v-if="!addingMenu" class="map-display-settings"><legend>栏目显示设置</legend><div class="grid2"><div><label for="menu-mode">显示方式</label><select id="menu-mode" v-model="displayDraft.mode"><option value="list">列表</option><option value="tabs">Tab</option><option value="carousel">轮播</option></select></div><div><label for="menu-pagination">分页</label><select id="menu-pagination" v-model="displayDraft.pagination"><option :value="false">不分页</option><option :value="true">分页</option></select></div><div><label for="menu-page-size">每页显示数量</label><input id="menu-page-size" v-model.number="displayDraft.pageSize" type="number" min="1" max="100" required></div></div></fieldset><div class="card-actions"><template v-if="!addingMenu&&page"><button type="button" @click="addPage(page.id)">添加下级栏目</button><button type="button" @click="removePage">移除栏目</button><button type="button" @click="move(-1)">上移</button><button type="button" @click="move(1)">下移</button></template><button type="button" @click="structure=false">收起编辑</button><button class="primary">{{addingMenu?'添加栏目':'保存栏目'}}</button></div></form></section>
  <p class="small muted">点栏目名称或铅笔，修改栏目名称、层级和显示设置。</p><p class="small muted">保存栏目即更新网站草稿。可继续修改，或直接选择网站风格。</p><div v-if="menuPages.length" class="card-actions"><button class="primary" @click="changeStep('网站风格')">下一步：网站风格</button></div>
 </section>
 <WebsiteDesign v-else-if="step==='网站风格'&&catalog" :catalog="catalog" @next="changeStep('Logo')"/>
 <section v-else-if="step==='Logo'" class="card"><h2>Logo</h2><div class="logo-settings"><div class="logo-preview"><img v-if="siteSettings.logo" :src="siteSettings.logo+(logoStamp?'?v='+logoStamp:'')" alt="当前 Logo"><span v-else>尚未设置 Logo</span></div><label class="file-button">{{siteSettings.logo?'更换 Logo':'选择 Logo'}}<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="logoBusy" @change="setLogo"></label><span v-if="logoBusy" role="status">正在上传…</span></div><div class="card-actions"><button class="primary" @click="changeStep('内容详情')">下一步：内容详情</button></div></section>
 <section v-else-if="step==='内容详情'" class="website-content-workspace"><header class="between website-content-header"><div class="sw-heading-line"><h2>内容详情</h2><p class="small muted">按完整网站架构查看内容。点击标题修改详情，或在所属栏目新增一条详情。</p></div><button :disabled="busy" @click="exportSite">{{exportBusy?'正在整理页面与媒体…':'下载完整网站 ZIP'}}</button></header><div class="website-content-index"><div class="map-browser"><div class="map-browser-bar"><strong>{{effectiveProject.company.name}}</strong></div><div class="map-position-groups"><section v-for="[position,label] in [['header','页头菜单'],['footer','页脚菜单']]" :key="position" class="map-position-group"><h3>{{label}}</h3><nav class="map-navigation" :aria-label="'内容详情'+label"><ul class="map-primary"><li v-for="node in rootMenus.filter(p=>(p.navPlacement||'header')===position)" :key="node.id" class="map-menu-column"><WebsiteContentTree :node="node" :pages="store.project.pages" :source="store.project.sourceLanguage" @edit="select($event);locale=store.project.sourceLanguage;editing=true" @add="addDetail" @remove="deleteDetail"/></li></ul></nav></section><section v-if="unmounted.length" class="map-position-group"><h3>未挂载详情</h3><button v-for="entry in unmounted" :key="entry.id" @click="select(entry.id);editing=true">{{entry.content[store.project.sourceLanguage]?.title||entry.title}}</button></section></div></div></div><div class="card-actions"><button class="primary" @click="changeStep('网站语言')">下一步：网站语言</button></div></section>
 <SiteGeo v-else-if="step==='GEO 优化'" @articles="changeStep('智能软文')" @open="select($event);locale=Object.keys(page?.content||{})[0]||store.project.sourceLanguage;editing=true"/>
 <SiteArticles ref="articleEditor" v-else-if="step==='智能软文'" @structure="changeStep('网站架构')" @open="select($event);locale=Object.keys(page?.content||{})[0]||store.project.sourceLanguage;editing=true"/>
 <WebsiteLanguages v-else-if="step==='网站语言'&&catalog" :catalog="catalog" @next="changeStep('通讯设置')"/>
 <section v-else-if="step==='通讯设置'" class="card sw-card website-communications"><header class="between"><div class="sw-heading-line"><h2>通讯设置</h2><p class="small muted">选择本站使用的联系方式，图标固定在网站左上角。</p></div><button @click="store.flush().then(()=>router.push({path:'/settings',query:{tab:'communications'}})).catch(e=>error=String(e))">管理全局通讯</button></header><form @submit.prevent="saveContacts"><div class="communication-grid"><label v-for="contact in contacts" :key="contact.id" class="communication-card communication-choice"><input v-model="siteSettings.communicationIds" type="checkbox" :value="contact.id" @change="store.changed()"><span><strong>{{contact.label}}</strong><small>{{contactTypes.find(t=>t[0]===contact.type)?.[1]}}</small><span>{{contact.value}}</span></span></label></div><p v-if="!contacts.length" class="empty">请先在系统设置的通讯设置中添加联系方式。</p><div class="website-communication-actions"><WebsiteContacts :items="selectedCommunications" sample/><div class="card-actions"><button>保存通讯选择</button><button type="button" class="primary" @click="changeStep('发布网站')">下一步：发布网站</button></div></div></form></section>
 <section v-else-if="step==='发布网站'" class="card sw-card sw-publication">
  <header class="between"><div class="sw-heading-line"><h2>发布网站</h2><p class="small muted">选择平台托管，或下载到自己的服务器。</p></div></header>
  <fieldset class="sw-publication-targets"><legend>发布方式</legend><label v-for="target in (['platform','external'] as const)" :key="target" class="sw-publication-choice"><input v-model="siteSettings.publicationTarget" type="radio" :value="target" :disabled="busy" @change="store.changed();publicationMessage='' "><span><strong>{{target==='platform'?'平台托管':'独立部署'}}</strong><small>{{target==='platform'?'发布到平台 server':'下载 ZIP，自有服务器托管'}}</small></span></label></fieldset>
  <div class="sw-grid sw-publication-info"><div><span class="small muted">{{siteSettings.publicationTarget==='platform'?'拟发布地址':'网站域名（独立部署时配置）'}}</span><p><strong>{{publicationUrl||'尚未设置域名'}}</strong> <button :disabled="busy" @click="list?.open(site)">修改</button></p></div><div><span class="small muted">发布语言</span><p>{{chosenLanguages.map(l=>catalog?.languageNames[l]||l).join('、')||'尚未选择'}}</p></div></div>
  <p v-if="siteSettings.publicationTarget==='platform'" class="small sw-platform-note">管理员先完成本站域名登记、解析、HTTPS 和访问入口配置，再点击发布。内容发布到上方地址；以后修改后点击更新，无需手工上传 ZIP。</p>
  <p v-else class="small sw-external-note">下载 ZIP 并完整解压，上传到服务器的网站目录，再为该目录配置域名和 HTTPS。可部署到我们自己的 server 或其他网站空间，无需运行平台后台。</p>
  <p class="small muted sw-package-note">ZIP 包含全部公开页面、已选发布语言、样式、脚本、图片、视频和部署说明；保留邮箱、电话等联系入口，不含询盘或 AI 接待后台。媒体未读入、下载失败或嵌入视频未替换时会提示，避免遗漏文件。</p>
  <p v-if="publicationMessage" role="status">{{publicationMessage}}</p><p v-if="exportBusy" role="status">正在整理页面、图片和视频，完成后自动下载…</p>
  <div class="card-actions"><button :disabled="busy" @click="changeStep('版本记录')">版本记录</button><button :disabled="busy" @click="preview">网站预览</button><button :disabled="busy" @click="store.flush().then(()=>publicationMessage='发布设置已保存').catch(e=>error=String(e))">保存发布设置</button><a v-if="publishedHere" :href="publicationUrl" target="_blank" rel="noopener">查看已发布网站</a><button :class="{primary:siteSettings.publicationTarget==='external'}" :disabled="busy||!page" @click="exportSite">{{exportBusy?'正在打包…':'下载完整网站 ZIP'}}</button><button v-if="siteSettings.publicationTarget==='platform'" class="primary" :disabled="busy||!page||!publicationUrl" @click="publish">{{busy&&!exportBusy?'正在发布…':publishedHere?'更新网站':'发布网站'}}</button></div>
 </section>
 <WebsiteVersions v-else-if="step==='版本记录'" ref="versionList"/>
 <DetailEditor v-if="editing&&page" :key="page.id+'-'+locale" :title="content.title" :html="content.html" :theme="theme" :page-id="page.id" :project="effectiveProject" :saving="store.saving" :hidden="page.hidden" @visibility="page.hidden=!$event;store.changed()" :entry="page.entry" :has-entry="!isMenu(page)" @mount-change="setMounts(page,$event);store.changed()" @entry-change="page.entry=$event;store.changed()" @change="change" @close="done" @remove="deleteDetail()" @preview="preview"/>
 <el-dialog class="approved-page website-import-dialog" v-model="importing" title="从已有网站读取" width="min(920px,calc(100vw - 32px))" align-center append-to-body :close-on-click-modal="false" @closed="cancelImport">
  <template #header><div class="website-import-heading"><h2>从已有网站读取</h2><p class="small muted">先检查读取结果，再采用；之后可人工或 AI 编辑。</p></div></template>
  <form id="website-import-form" class="website-import-form" @submit.prevent="read">
   <div class="website-import-fields"><label for="website-import-url">已有网站网址<input id="website-import-url" v-model="url" type="url" required placeholder="https://www.example.com/" :disabled="busy" @input="imported=undefined"></label></div>
   <div class="website-import-options"><label class="website-import-scope" for="website-import-scope">读取范围<select id="website-import-scope" v-model="details" :disabled="busy" @change="imported=undefined"><option :value="false">仅架构</option><option :value="true">架构 + 明细</option></select></label><div v-if="details" class="website-import-media"><label><input v-model="readImages" type="checkbox" :disabled="busy" @change="imported=undefined">读取图片</label><label><input v-model="readVideos" type="checkbox" :disabled="busy" @change="imported=undefined">读取视频</label><span class="small muted">未读取的媒体保留占位，可在详情中替换。</span></div></div>
   <p v-if="error" role="alert" class="error">{{error}}</p>
   <div v-if="imported" class="website-import-result"><strong>已读取 {{imported.pages.length}} 个栏目</strong><p class="small muted">采用后将替换当前网站架构与明细；原内容可从版本记录恢复。</p><ul><li v-for="p in imported.pages" :key="p.id" :title="p.title">{{p.title}}</li></ul><p v-for="w in imported.warnings" :key="w" class="error">{{w}}</p></div>
  </form>
  <template #footer><div class="website-import-actions"><button type="button" @click="cancelImport">{{busy?'取消读取':'取消'}}</button><button type="submit" form="website-import-form" :disabled="busy">{{busy?'正在读取…':imported?'重新读取':'读取网站'}}</button><button v-if="imported" type="button" class="primary" :disabled="busy" @click="applyImport">采用读取结果</button></div></template>
 </el-dialog>
 </template></div></div></div>
</template>
