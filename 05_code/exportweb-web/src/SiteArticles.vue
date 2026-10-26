<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {useProject} from './store';
import {business,type Article} from './business-workspace';
import {websiteProject} from './websites';
import {menus,menuLabel} from './site-settings';
import {onBeforeRouteLeave,useRoute} from 'vue-router';
import {task} from './tasks';
import {request} from './api';
const store=useProject(),emit=defineEmits<{open:[id:string];structure:[]}>();
const selected=ref(''),busy=ref(false),error=ref(''),notice=ref('');
const route=useRoute();
async function flush(){if(draft.value.title.trim()||draft.value.body.trim()||draft.value.facts.trim()||draft.value.audience.trim()){if(!draft.value.title.trim())draft.value.title='未命名文章';await save();}}
defineExpose({flush});
onBeforeRouteLeave(flush);
const siteId=computed(()=>store.project.websites?.activeId||'primary');
const items=computed(()=>business(store.project).articles.filter(x=>x.siteId===siteId.value));
const blank=():Article=>({id:'',siteId:siteId.value,title:'',keywords:websiteProject(store.project).company.product,audience:'',language:store.project.sourceLanguage,facts:'',body:'',pageId:'',revision:0,history:[]});
const draft=ref<Article>(blank()),menuItems=computed(()=>menus(store.project));
watch(siteId,()=>{selected.value='';draft.value=blank();error.value='';});
function select(){draft.value=structuredClone(JSON.parse(JSON.stringify(items.value.find(a=>a.id===selected.value)||blank())));notice.value='';}
async function choose(){const target=selected.value;await flush();selected.value=target;select();}
async function save(){
 error.value='';const d=draft.value;if(!d.title.trim())throw Error('请填写文章主题');if(d.title.length>180)throw Error('文章主题不能超过 180 字');
 const all=business(store.project).articles,old=all.find(a=>a.id===d.id);if(old&&JSON.stringify({...d,history:[]})===JSON.stringify({...old,history:[]})){await store.flush();return;}
 const next:Article={...JSON.parse(JSON.stringify(d)),id:d.id||crypto.randomUUID(),siteId:siteId.value,revision:(old?.revision||0)+1,history:[...(old?.history||[]),...(old?[{revision:old.revision,title:old.title,body:old.body,savedAt:new Date().toISOString()}]:[])].slice(-30)};
 if(old)all.splice(all.indexOf(old),1,next);else all.push(next);
 draft.value=JSON.parse(JSON.stringify(next));selected.value=next.id;store.changed();await store.flush();notice.value='文章已保存';
}
async function action(fn:()=>Promise<void>){error.value='';try{await fn();}catch(e){error.value=e instanceof Error?e.message:String(e);}}
async function generate(){
 await save();busy.value=true;const articleId=draft.value.id,websiteId=siteId.value,originalBody=draft.value.body;
 try{const result=await task<{articleId:string;siteId:string;title:string;body:string}>('/api/v1/articles/generate',store.revision,{articleId,siteId:websiteId});if(siteId.value!==websiteId||draft.value.id!==articleId||draft.value.body!==originalBody){notice.value='生成结果已保存到后台任务，请从任务中恢复';return;}draft.value.body=result.body;notice.value='已生成，请核对后保存。原文保留在历史中。';}
 finally{busy.value=false;}
}
async function recover(){const id=new URLSearchParams(location.hash.split('?')[1]||'').get('articleJob');if(!id)return;try{const ticket=await request<{kind:string;status:string;result:{articleId:string;siteId:string;body:string}}>('/api/v1/jobs/'+id);if(ticket.kind!=='ARTICLE'||ticket.status!=='SUCCEEDED')return;const result=ticket.result;if(result.siteId!==siteId.value)throw Error('生成结果属于另一个网站，请先进入对应网站');selected.value=result.articleId;select();draft.value.body=result.body;notice.value='已恢复生成结果，请核对后保存';}catch(e){error.value=String(e);}}
watch(()=>route.query.articleJob,async(id,previous)=>{if(id&&id!==previous){await flush();await recover();}});
void recover();
function html(body:string){return body.split(/\n\s*\n/).map(p=>'<p>'+p.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)).replaceAll('\n','<br>')+'</p>').join('');}
async function adopt(){
 if(!draft.value.body.trim())throw Error('请先填写文章正文');const parent=menuItems.value.find(p=>p.id===draft.value.pageId);if(!parent)throw Error('请选择有效的网站栏目');
 await save();const id=crypto.randomUUID(),language=draft.value.language;
 if(!store.project.languages.includes(language))store.project.languages.push(language);
 store.project.pages.push({id,parent:'',title:draft.value.title,path:'/article-'+id+'/',kind:'detail',ownerPageId:parent.id,mountIds:[parent.id],hidden:true,content:{[language]:{title:draft.value.title,html:html(draft.value.body)}},entry:{date:'',summary:'',image:''}});
 // Keep the selected placement but hide the new detail from published output until reviewed.
 draft.value.detailId=id;const a=business(store.project).articles.find(a=>a.id===draft.value.id)!;a.detailId=id;
 store.changed();await store.flush();notice.value='已加入隐藏详情草稿，请核对后开启显示';emit('open',id);
}
</script>
<template><section class="card article-studio"><div class="insight-heading"><div><h2>智能软文</h2><p>围绕产品写文章，核对后加入网站内容。</p></div><div class="article-toolbar"><label>已保存文章<select aria-label="已保存文章" v-model="selected" :disabled="busy" @change="action(choose)"><option value="">新文章</option><option v-for="a in items" :key="a.id" :value="a.id">{{a.title}} · v{{a.revision}}</option></select></label><button :disabled="busy" @click="action(async()=>{await flush();selected='';select()})">新建文章</button></div></div><p v-if="error" role="alert" class="error">{{error}}</p><p v-if="notice" role="status">{{notice}}</p><form @submit.prevent="action(save)"><div class="field-grid"><label>文章主题<input v-model="draft.title" maxlength="180" required></label><label>产品关键词<input v-model="draft.keywords" maxlength="500"></label><label>目标读者<input v-model="draft.audience" maxlength="500"></label><label>文章语言<select aria-label="文章语言" v-model="draft.language"><option value="zh-Hans">中文</option><option value="en">English</option><option v-for="l in store.project.languages.filter(l=>!['zh-Hans','en'].includes(l))" :key="l">{{l}}</option></select></label></div><label>参考事实与写作要求<textarea id="article-facts" v-model="draft.facts" rows="3" maxlength="5000" placeholder="补充已核实的用途、参数、特色或案例；留空时参考当前网站公司资料。"/></label><div class="article-generate"><small>使用当前网站资料与参考事实，不编造认证、价格或交期。后台生成后可继续修改。</small><button type="button" class="primary" :disabled="busy" @click="action(generate)">{{busy?'正在生成…':draft.body?'重新生成草稿':'生成草稿'}}</button></div><div class="article-edit-grid"><label>文章正文 · 可直接修改<textarea v-model="draft.body" rows="12" maxlength="30000"/></label><div><h3>正文预览</h3><div class="article-preview">{{draft.body||'正文会显示在这里。'}}</div></div></div><div class="article-toolbar"><label>加入网站栏目<select aria-label="加入网站栏目" v-model="draft.pageId"><option value="">请选择栏目</option><option v-for="p in menuItems" :key="p.id" :value="p.id">{{menuLabel(store.project.pages,p)}}</option></select></label><button v-if="!menuItems.length" type="button" @click="emit('structure')">前往网站架构</button><small>加入后为隐藏的详情草稿；在内容详情中核对图片与显示菜单。</small></div><details v-if="draft.history.length"><summary>历史正文 · {{draft.history.length}} 个版本</summary><div v-for="h in [...draft.history].reverse()" :key="h.revision" class="article-history"><strong>v{{h.revision}} · {{h.title}}</strong><pre>{{h.body}}</pre><button type="button" @click="draft.title=h.title;draft.body=h.body;notice='已载入历史正文，保存后生成新版本'">使用此正文</button></div></details><div class="page-actions"><span class="small muted">{{draft.id?'v'+draft.revision+' · 历史正文保留':'新文章尚未保存'}}</span><button :disabled="busy">保存文章</button><button v-if="draft.detailId" type="button" @click="emit('open',draft.detailId!)">查看已加入的详情</button><button type="button" class="primary" :disabled="busy" @click="action(adopt)">{{draft.detailId?'另存为新详情草稿':'加入网站草稿'}}</button></div></form></section></template>
<style scoped>.article-history pre{white-space:pre-wrap;max-height:180px;overflow:auto}.article-history{padding:12px;border-bottom:1px solid var(--line)}.article-preview{white-space:pre-wrap;overflow-wrap:anywhere}</style>
