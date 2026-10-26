<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,provide,ref,watch} from 'vue';
import {useProject} from './store';
import {activeTask,cancelTask,type Ticket} from './tasks';
import {request,ApiError,onAuthenticationRequired} from './api';
import {useRoute} from 'vue-router';
import AppearanceSettings from './AppearanceSettings.vue';
import {navigation} from './navigation';
import {beginLogin,completeLogin,leaveAfterLogout} from './login-session';
interface Session {personId:string;orgId:string;name:string;login?:string;productName:string;organizations:{orgId:string;name:string}[];sharedEntry:boolean}
const store=useProject(),error=ref(''),recent=ref<Ticket[]>([]),session=ref<Session>({personId:'anonymous',orgId:'',name:'',productName:'302',organizations:[],sharedEntry:false}),route=useRoute(),collapsed=ref(false),showTasks=ref(false);
const accountExpanded=ref(false);
function positionAccount(event:Event){if((event as ToggleEvent).newState!=='open')return;const panel=event.target as HTMLElement,header=panel.closest('header')!;panel.style.top=Math.max(12,header.getBoundingClientRect().bottom+8)+'px';}
function closeAccount(){const panel=document.getElementById('workspace-account-details');if(panel?.matches(':popover-open'))panel.hidePopover();}
watch(()=>route.path,closeAccount);
const pendingTask=computed(()=>activeTask.value?.status==='QUEUED'||activeTask.value?.status==='RUNNING');
const displayName=computed(()=>{const name=session.value.productName?.trim();return name&&name!=='302'?name:'独立网站';});
const accountLoading=ref(true),scopeLoaded=ref(false),accountFailure=ref(false),loginExpired=ref(false),connectingLogin=ref(false);
const accountName=computed(()=>[session.value.name,session.value.login].map(s=>s?.trim()).find(s=>s&&s!==session.value.personId)||'账号资料待更新');
const organizationName=computed(()=>!scopeLoaded.value?'组织信息未取得':session.value.organizations.find(org=>org.orgId===session.value.orgId)?.name||'组织名称未取得');
provide('catalog-product-name',displayName);
provide('has-company-plan',computed(()=>!!store.project.plan));
function toggleSidebar(){collapsed.value=!collapsed.value;try{localStorage.setItem('exportweb-workspace-sidebar',collapsed.value?'collapsed':'expanded');}catch{/* Navigation remains usable without local storage. */}}
function sessionError(e:unknown){
 if(e instanceof ApiError&&e.status===401){
  loginExpired.value=loginExpired.value||session.value.personId!=='anonymous';session.value={personId:'anonymous',orgId:'',name:'',productName:'独立网站',organizations:[],sharedEntry:false};scopeLoaded.value=false;store.loaded=false;recent.value=[];activeTask.value=undefined;
  error.value=loginExpired.value?'登录已失效，请重新登录。':'';
 }else{
  if(e instanceof ApiError&&e.status===403){scopeLoaded.value=false;store.loaded=false;recent.value=[];activeTask.value=undefined;}
  error.value=e instanceof Error?e.message:String(e);
 }
}
async function recentTasks(){try{recent.value=await request('/api/v1/jobs');}catch(e){sessionError(e);}}
async function cancelRecent(id:string){try{await request('/api/v1/jobs/'+id+'/cancel',{method:'POST',body:'{}'});await recentTasks();}catch(e){sessionError(e);}}
let sessionLoad:Promise<void>|undefined,loadedScope='',loadedPerson='';
function loadSession(){
 if(!sessionLoad)sessionLoad=readSession().finally(()=>{sessionLoad=undefined;});
 return sessionLoad;
}
async function readSession(){
 const previousPerson=session.value.personId,previousOrg=session.value.orgId,hadScope=scopeLoaded.value;
 accountLoading.value=true;accountFailure.value=false;error.value='';
 try{
  const identity=await request<Pick<Session,'personId'|'name'|'login'>>('/api/v1/account');
  connectingLogin.value=false;
  completeLogin(); // Restoring only the hash does not reload the document; continue reading the authenticated session.
  if(loadedPerson&&loadedPerson!==identity.personId){scopeLoaded.value=false;store.loaded=false;location.reload();return;}
  session.value={...session.value,...identity};loginExpired.value=false;accountLoading.value=false;
  const current=await request<Session>('/api/v1/session');
  if(current.personId!==identity.personId)throw new ApiError('登录账号已变化，请刷新后重试。',403);
  if(!current.orgId||current.organizations.length!==1||current.organizations[0]?.orgId!==current.orgId)throw new ApiError('独立网站仅向已获授权的组织用户开放，请联系管理员核对账号所属组织。',403);
  session.value=current;
  scopeLoaded.value=true;document.title=displayName.value;
  const currentScope=session.value.personId+':'+session.value.orgId;
  if((loadedScope&&loadedScope!==currentScope)||(previousPerson!=='anonymous'&&(previousPerson!==session.value.personId||previousOrg!==session.value.orgId))){store.loaded=false;location.reload();return;}
  if(session.value.orgId){if(!store.loaded)await store.load();loadedScope=currentScope;loadedPerson=session.value.personId;await recentTasks();}
 }catch(e){
  if(!hadScope||(e instanceof ApiError&&[401,403].includes(e.status))){scopeLoaded.value=false;store.loaded=false;recent.value=[];activeTask.value=undefined;}
  sessionError(e);if(e instanceof ApiError&&e.status===401&&!loginExpired.value&&!loadedPerson)connectingLogin.value=beginLogin(true);
  if(!(e instanceof ApiError&&e.status===401))accountFailure.value=session.value.personId==='anonymous';
 }finally{accountLoading.value=false;}
}
const stopAuthenticationListener=onAuthenticationRequired(()=>sessionError(new ApiError('请先登录',401)));
function resumeSession(){void loadSession();}
function showSession(event:PageTransitionEvent){if(event.persisted)resumeSession();}
function visibleSession(){if(document.visibilityState==='visible')resumeSession();}
onBeforeUnmount(()=>{stopAuthenticationListener();window.removeEventListener('focus',resumeSession);window.removeEventListener('pageshow',showSession);document.removeEventListener('visibilitychange',visibleSession);});
onMounted(()=>{try{collapsed.value=localStorage.getItem('exportweb-workspace-sidebar')==='collapsed';}catch{}window.addEventListener('focus',resumeSession);window.addEventListener('pageshow',showSession);document.addEventListener('visibilitychange',visibleSession);void loadSession();});
async function logout(){try{await request('/logout',{method:'POST'});leaveAfterLogout();}catch(e){sessionError(e);}}
</script>
<template>
 <a class="skip-link" href="#workspace-main">跳到主要内容</a>
 <div class="workspace-shell" :class="{'sidebar-collapsed':collapsed}">
 <aside class="workspace-sidebar" :inert="pendingTask&&!['ARTICLE'].includes(activeTask?.kind||'')">
  <div class="sidebar-heading"><RouterLink class="app-brand" to="/" :aria-label="displayName+' 工作台首页'"><img class="brand-logo-light" :src="'/workspace/brand/logo-on-light.svg'" alt="" width="110" height="60"><img class="brand-logo-dark" :src="'/workspace/brand/logo-on-dark.svg'" alt="" width="110" height="60"><span class="visually-hidden">{{displayName}}</span></RouterLink><button class="sidebar-toggle" :aria-label="collapsed?'展开导航':'收起导航'" :aria-expanded="!collapsed" aria-controls="workspace-navigation" @click="toggleSidebar"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16m7-11-3 3 3 3"/></svg></button></div>
  <div class="nav-label">独立网站工作台</div>
  <nav id="workspace-navigation" class="workspace-nav" aria-label="主导航"><RouterLink v-for="item in navigation" :key="item.path" :to="item.path" :aria-current="route.path===item.path?'page':undefined" :title="item.label"><span class="nav-icon" aria-hidden="true">{{item.icon}}</span><span class="nav-text">{{item.label}}</span></RouterLink></nav>
  <div class="sidebar-bottom"><button v-if="store.loaded" @click="showTasks=!showTasks;showTasks&&recentTasks()" :aria-expanded="showTasks" aria-controls="workspace-tasks">查看任务</button><p>网站编辑与发布</p></div>
 </aside>
 <div class="workspace-body">
 <header class="workspace-topbar" :inert="pendingTask&&!['ARTICLE'].includes(activeTask?.kind||'')"><div class="workspace-account"><span v-if="store.saving||store.error" class="save-state" role="status">{{store.error?'保存未完成':'正在保存…'}}</span>
 <div v-if="session.personId!=='anonymous'" class="account-identity" aria-label="当前登录账号">
  <button type="button" class="account-trigger" popovertarget="workspace-account-details" aria-controls="workspace-account-details" :aria-expanded="accountExpanded" :aria-label="accountName+' · '+organizationName+'，查看账号资料'" :title="accountName+' · '+organizationName">
   <span class="account-summary"><strong>{{accountName}}</strong><span class="account-organization" aria-label="所属组织">{{organizationName}}</span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
  </button>
  <div id="workspace-account-details" class="account-details" popover="auto" role="region" aria-label="账号资料" @beforetoggle="positionAccount" @toggle="accountExpanded=($event as ToggleEvent).newState==='open'">
   <dl><dt>登录账号</dt><dd>{{accountName}}</dd><template v-if="session.login&&session.login!==accountName&&session.login!==session.personId"><dt>邮箱</dt><dd>{{session.login}}</dd></template><dt>所属组织</dt><dd>{{organizationName}}</dd></dl>
   <a v-if="accountName==='账号资料待更新'" href="/oauth2/authorization/exportweb" @click.prevent="beginLogin(false)">更新账号资料</a>
  </div>
 </div><span v-else class="account-state">{{connectingLogin?'正在接续登录…':accountLoading?'正在读取账号…':accountFailure?'账号信息读取失败':'未登录'}}</span><a v-if="session.personId==='anonymous'&&!accountLoading&&!accountFailure&&!connectingLogin" href="/oauth2/authorization/exportweb" @click.prevent="beginLogin(false)">登录</a><button v-else-if="session.personId!=='anonymous'" @click="logout">退出</button><AppearanceSettings :account="session.orgId+':'+session.personId"/></div></header>
 <aside v-if="activeTask" class="task-status" role="status">{{activeTask.message||'任务已排队'}} · {{activeTask.progress}}% <button v-if="['QUEUED','RUNNING'].includes(activeTask.status)" @click="cancelTask">取消任务</button></aside>
 <section v-if="store.loaded&&scopeLoaded&&showTasks" id="workspace-tasks" class="recent-tasks"><h2>任务进度</h2><p v-if="!recent.length">还没有任务</p><div v-for="job in recent" :key="job.id">{{({IMPORT:'读取网站',PLAN:'目标计划',TRANSLATE:'翻译页面',EDIT:'编辑页面',ARTICLE:'智能软文'} as Record<string,string>)[job.kind]||job.kind}} · {{job.message||'等待处理'}} <button v-if="['QUEUED','RUNNING'].includes(job.status)" @click="cancelRecent(job.id)">取消</button><RouterLink v-if="job.status==='SUCCEEDED'&&job.kind==='IMPORT'" :to="'/website?import='+job.id">查看导入结果</RouterLink><RouterLink v-else-if="job.status==='SUCCEEDED'&&job.kind==='ARTICLE'" :to="{path:'/website',query:{site:(job.result as any)?.siteId,articleJob:job.id}}">查看文章结果</RouterLink><button v-else-if="job.status==='SUCCEEDED'" @click="store.load()">载入已保存结果</button></div></section>
 <main id="workspace-main" class="workspace-content" tabindex="-1"><div v-if="error" role="alert" class="error">{{error}} <a v-if="loginExpired" href="/oauth2/authorization/exportweb" @click.prevent="beginLogin(false)">重新登录</a><button v-else :disabled="accountLoading" @click="loadSession">重试</button></div><div v-if="store.loaded&&scopeLoaded&&store.error" role="alert" class="error">{{store.error}} <button @click="store.flush().catch(()=>{})">同步后重试保存</button><template v-if="store.conflict"><button @click="store.downloadDraft">下载当前编辑</button><button @click="store.reloadAfterConflict().catch(()=>{})">重新载入</button></template></div><p v-if="accountLoading||connectingLogin" role="status">{{connectingLogin?'正在接续登录…':'正在读取账号…'}}</p><RouterView v-if="scopeLoaded&&!!session.orgId&&session.personId!=='anonymous'&&store.loaded"/><p v-else-if="!accountLoading&&!connectingLogin&&!error&&session.personId==='anonymous'">请先<a href="/oauth2/authorization/exportweb" @click.prevent="beginLogin(false)">登录</a>后继续。</p></main>
 </div></div>
</template>
