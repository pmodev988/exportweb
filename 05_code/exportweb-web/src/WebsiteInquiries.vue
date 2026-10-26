<script setup lang="ts">
import {onMounted,ref} from 'vue';
import {request} from './api';
type Inquiry={id:string;sender_name:string;company_name:string;email:string;country:string;subject:string;message?:string;state:string;note?:string;revision:number};
const rows=ref<Inquiry[]>([]),selected=ref<Inquiry>(),offset=ref(0),busy=ref(false),error=ref('');
async function load(){busy.value=true;error.value='';try{rows.value=await request<Inquiry[]>('/api/v1/inquiries?offset='+offset.value);}catch(e){error.value=(e as Error).message;}finally{busy.value=false;}}
async function open(id:string){error.value='';try{selected.value=await request<Inquiry>('/api/v1/inquiries/'+id);}catch(e){error.value=(e as Error).message;}}
async function page(n:number){offset.value=Math.max(0,offset.value+n);await load();}
async function save(){if(!selected.value)return;busy.value=true;error.value='';try{const s=selected.value;await request('/api/v1/inquiries/'+s.id,{method:'PUT',body:JSON.stringify({revision:s.revision,state:s.state,note:s.note||''})});selected.value=undefined;await load();}catch(e){error.value=(e as Error).message;}finally{busy.value=false;}}
onMounted(load);
</script>
<template><section class="inquiries"><h1>网站询盘</h1><p v-if="error" role="alert">{{error}}</p><p v-if="busy" role="status">正在处理…</p>
 <div class="inquiry-layout"><section><p v-if="!rows.length&&!busy">暂无询盘</p><button v-for="row in rows" :key="row.id" class="inquiry-item" @click="open(row.id)"><strong>{{row.subject}}</strong><span>{{row.company_name}} · {{row.sender_name}}</span><small>{{({NEW:'待处理',HANDLED:'已处理',SPAM:'无效询盘'} as Record<string,string>)[row.state]}}</small></button><div class="inquiry-pages"><button :disabled="busy||!offset" @click="page(-50)">上一页</button><button :disabled="busy||rows.length<50" @click="page(50)">下一页</button></div></section>
 <form v-if="selected" @submit.prevent="save"><h2>{{selected.subject}}</h2><p>{{selected.company_name}} · {{selected.country}}</p><p>{{selected.sender_name}} · {{selected.email}}</p><p class="inquiry-message">{{selected.message}}</p><label>处理状态<select v-model="selected.state"><option value="NEW">待处理</option><option value="HANDLED">已处理</option><option value="SPAM">无效询盘</option></select></label><label>处理记录<textarea v-model="selected.note" maxlength="3000" rows="5" :required="selected.state==='HANDLED'"></textarea></label><button class="primary" :disabled="busy">保存</button></form></div>
</section></template>
<style scoped>.inquiries{padding:24px}.inquiry-layout{display:grid;grid-template-columns:minmax(240px,1fr) minmax(0,2fr);gap:24px}.inquiry-item{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-bottom:12px;padding:16px}.inquiry-message{white-space:pre-wrap;overflow-wrap:anywhere}.inquiry-pages{display:flex;gap:12px}form{display:grid;gap:16px;align-content:start}label{display:grid;gap:8px}@media(max-width:760px){.inquiry-layout{grid-template-columns:1fr}}</style>
