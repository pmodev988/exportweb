<script setup lang="ts">
import {computed,ref} from 'vue';
import {useProject} from './store';
import {business} from './business-workspace';
import {websiteProject} from './websites';
import Geo from './generated/site-geo.js';
const store=useProject(),emit=defineEmits<{open:[id:string];articles:[]}>(),message=ref(''),error=ref('');
const id=computed(()=>store.project.websites?.activeId||'primary');
const html=computed(()=>Geo.render({name:websiteProject(store.project).company.name,product:websiteProject(store.project).company.product,pages:store.project.pages.filter(p=>!p.detailDeleted).map(p=>({id:p.id,title:p.content[store.project.sourceLanguage]?.title||p.title,html:p.content[store.project.sourceLanguage]?.html||'',summary:p.entry?.summary||''})),observations:business(store.project).geo?.[id.value]||[]}));
function click(event:MouseEvent){const b=(event.target as Element).closest<HTMLElement>('[data-action]');if(!b)return;if(b.dataset.action==='geoEdit')emit('open',b.dataset.id!);if(b.dataset.action==='navigate')emit('articles');if(b.dataset.action==='geoRefresh')message.value='已重新检查当前网站草稿';}
async function submit(event:Event){event.preventDefault();error.value='';try{const record=Geo.observation(Object.fromEntries(new FormData(event.target as HTMLFormElement))),data=business(store.project);data.geo||={};const rows=data.geo[id.value]||=[];if(rows.length>=300)throw Error('观察记录已达 300 条');rows.unshift(record);store.changed();await store.flush();message.value='观察记录已保存';}catch(e){error.value=String(e);}}
</script>
<template><div><p v-if="message" role="status">{{message}}</p><p v-if="error" role="alert" class="error">{{error}}</p><div @click="click" @submit="submit" v-html="html"/></div></template>
