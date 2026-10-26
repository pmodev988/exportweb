<script setup lang="ts">
import {computed,ref} from 'vue';
import {ancestors,type Catalog,type Project,type Design,type Page} from './model';
import SiteMenu from './SiteMenu.vue';
import SafeContent from './SafeContent.vue';
import DOMPurify from 'dompurify';
import {importedContent} from './imported-content';
import WebsiteContacts from './WebsiteContacts.vue';
import WebsiteCollection from './WebsiteCollection.vue';
import {marketLanguages,languageLabels} from './generated/language-catalog';
import {selectedContacts} from './communications';
import {isMenu,mounts,defaultSiteSettings} from './site-settings';
const props=defineProps<{project:Project;theme:Catalog['themes'][number];motion?:Design['motion'];pageId?:string}>();
const current=ref(''),mobileOpen=ref(false);
const choice=ref('');
const site=computed(()=>props.project.site||defaultSiteSettings());
const languages=computed(()=>{const allowed=new Set(props.project.company.markets.flatMap(m=>marketLanguages[m]||[]));return (site.value.publishLanguages??props.project.languages).filter(l=>allowed.has(l));});
const locale=computed({get:()=>languages.value.includes(choice.value)?choice.value:languages.value[0]||props.project.sourceLanguage,set:(value:string)=>{choice.value=value;}});
const labels=computed(()=>site.value.labels?.[locale.value]||{});
const pages=computed(()=>props.project.pages.filter(isMenu).map(p=>({...p,title:p.content[locale.value]?.menuTitle||p.title})));
const home=computed(()=>pages.value.find(p=>p.path==='/')||pages.value[0]);
const single=computed(()=>props.project.design?.pageMode==='single');
const visible=computed(()=>{const selected=props.project.pages.find(p=>p.id===(current.value||props.pageId||home.value?.id));return single.value&&selected&&isMenu(selected)?pages.value:selected?[selected]:[];});
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function hero(p:Page){const content=p.content[locale.value],contact=pages.value.find(n=>n.id==='contact');const action=contact?`<a class="mock-cta" href="#preview-${escape(contact.id)}" data-preview-page="${escape(contact.id)}">${escape(labels.value.cta??((locale.value.startsWith('zh')?props.theme.cta:languageLabels[locale.value]?.cta)||contact.title))}</a>`:'';const values:Record<string,string>={EXPORTWEB_TITLE_SLOT:escape(content?.title||p.title),EXPORTWEB_COMPANY_SLOT:escape(props.project.company.name),EXPORTWEB_BODY_SLOT:DOMPurify.sanitize(importedContent(content?.html||'')),EXPORTWEB_ACTION_SLOT:action};return props.theme.heroes[props.motion||props.project.design?.motion||'static'].replace(/EXPORTWEB_TITLE_SLOT|EXPORTWEB_COMPANY_SLOT|EXPORTWEB_BODY_SLOT|EXPORTWEB_ACTION_SLOT/g,s=>values[s]);}
function select(id:string){current.value=id;mobileOpen.value=false;if(single.value)setTimeout(()=>document.getElementById('design-preview-'+id)?.scrollIntoView({block:'nearest',behavior:'smooth'}),0);}
function jump(event:MouseEvent){const id=(event.target as Element).closest('[data-preview-page]')?.getAttribute('data-preview-page');if(id){event.preventDefault();select(id);}}
function trail(p:Page){return p.ownerPageId?[...ancestors(props.project.pages,p.ownerPageId),p]:ancestors(props.project.pages,p.id);}
function detailLayout(p:Page){const html=p.content[locale.value]?.html||'';if(/<(img|video|iframe)\b/i.test(html))return 'detail-layout-media';if(/<table\b/i.test(html))return 'detail-layout-data';return 'detail-layout-reading';}

</script>
<template><article :class="[theme.classes,'website-preview-surface',{'has-site-contacts':selectedContacts(project).length>0}]" :data-mobile-open="mobileOpen" :data-page-mode="single?'single':'multi'" @click="jump"><WebsiteContacts :items="selectedContacts(project)"/><header class="mock-nav"><label class="site-language-control"><select v-model="locale" aria-label="语言"><option v-for="code in languages" :key="code" :value="code">{{new Intl.DisplayNames([code],{type:'language'}).of(code)}}</option></select></label><div class="site-brand"><img v-if="site.logo" class="site-logo" :src="site.logo" alt="Logo"><b>{{project.company.name}}</b></div><button type="button" class="site-mobile-toggle" :aria-expanded="mobileOpen" aria-label="打开或关闭网站菜单" @click="mobileOpen=!mobileOpen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><nav :aria-label="labels.nav||'网站栏目'"><SiteMenu :pages="pages" :current="current||pageId||home?.id||''" @select="select"/></nav></header><p v-if="labels.notice" class="mock-notice">{{labels.notice}}</p><div class="site-modules"><section v-for="p in visible" :id="'design-preview-'+p.id" :key="p.id" :class="['site-page',p.id===home?.id?'site-lead':'mock-section site-detail',p.id===home?.id?'':detailLayout(p)]"><div v-if="p.id===home?.id" v-html="hero(p)"></div><template v-else><div v-if="!single||p.ownerPageId" class="site-page-breadcrumb"><template v-for="(n,i) in trail(p)" :key="n.id"><span v-if="i" aria-hidden="true"> / </span><a :href="'#preview-'+n.id" @click.prevent="select(n.id)">{{n.content[locale]?.menuTitle||n.title}}</a></template></div><div class="module-heading"><h2>{{p.content[locale]?.title||p.title}}</h2></div><div class="module-copy smart-detail-content"><SafeContent :html="p.content[locale]?.html||''"/></div></template><WebsiteCollection v-if="isMenu(p)" :entries="project.pages.filter(n=>n.id!==p.id&&mounts(n).includes(p.id)&&!n.detailDeleted&&n.content[locale]?.html)" :display="site.presentations[p.id]||{mode:'list',pagination:false,pageSize:10}" :locale="locale" @select="select"/></section><p v-if="!pages.length" class="site-detail">请先选择网站架构。</p></div><footer class="mock-footer"><nav class="site-footer-nav" aria-label="页脚菜单"><SiteMenu :pages="pages" position="footer" :current="current||pageId||home?.id||''" @select="select"/></nav>{{labels.footer??project.company.name}}</footer></article></template>
