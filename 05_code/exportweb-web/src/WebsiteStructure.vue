<script setup lang="ts">
import {ref,watch} from 'vue';
import {ancestors,type Page} from './model';
import {menuPosition} from './site-settings';
import WebsiteTreeNode from './WebsiteTreeNode.vue';
const props=defineProps<{pages:Page[];company:string;details?:Page[];source?:string}>(),emit=defineEmits<{select:[id:string];settings:[id:string];detail:[id:string]}>();
const mode=ref('configured'),openIds=ref<string[]>([]);
const branches=()=>props.pages.filter(p=>props.pages.some(c=>c.parent===p.id));
function expand(value:string){mode.value=value;openIds.value=(value==='all'?branches():value==='auto'?branches().slice(0,1):value==='configured'?branches().filter(p=>menuPosition(props.pages,p)==='header'||ancestors(props.pages,p.id)[0]?.footerExpanded):[]).map(p=>p.id);}
watch(()=>props.pages.map(p=>[p.id,p.parent,p.navPlacement,p.footerExpanded].join(':')).join('|'),()=>expand(mode.value),{immediate:true});
function toggle(id:string){if(openIds.value.includes(id))openIds.value=openIds.value.filter(v=>v!==id);else openIds.value=mode.value==='auto'?ancestors(props.pages,id).map(p=>p.id):[...openIds.value,id];}
</script>
<template><div class="map-browser" :data-map-expansion="mode"><div class="map-browser-bar"><strong>{{company}}</strong><div class="map-expansion-controls" role="group" aria-label="架构展开方式"><button v-for="[id,label] in [['collapsed','全收缩'],['all','全展开'],['auto','自动收展']]" :key="id" :aria-pressed="id===mode" @click="expand(id)">{{label}}</button></div></div><div class="map-position-groups"><section v-for="[position,label] in [['header','页头菜单'],['footer','页脚菜单']]" :key="position" class="map-position-group"><h3>{{label}}</h3><nav class="map-navigation" :aria-label="label"><ul class="map-primary"><li v-for="node in pages.filter(p=>!p.parent&&(p.navPlacement||'header')===position)" :key="node.id" :class="['map-menu-column',{'map-menu-leaf':!pages.some(p=>p.parent===node.id)}]"><WebsiteTreeNode :node="node" :pages="pages" :details="details" :source="source" :open-ids="openIds" @select="emit('select',$event)" @settings="emit('settings',$event)" @detail="emit('detail',$event)" @toggle="toggle"/></li></ul><p v-if="!pages.some(p=>!p.parent&&(p.navPlacement||'header')===position)" class="small muted">尚未添加{{label}}</p></nav></section></div></div></template>
