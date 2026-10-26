<script setup lang="ts">
import {ref,computed} from 'vue';
import {ancestors,type Page} from './model';
const props=defineProps<{pages:Page[];parent?:string;current:string;position?:'header'|'footer';expanded?:boolean}>();
const emit=defineEmits<{select:[id:string]}>(),overrides=ref<Record<string,boolean>>({});
const items=computed(()=>props.pages.filter(p=>p.parent===(props.parent||'')&&(props.parent||(p.navPlacement||'header')===(props.position||'header'))));
function isOpen(page:Page){const currentBranch=ancestors(props.pages,props.current).some(n=>n.id===page.id);return overrides.value[page.id]??(currentBranch||(props.position==='footer'&&(props.expanded||!!page.footerExpanded)));}
function select(id:string){if(props.position!=='footer')overrides.value={};emit('select',id);}
function toggle(page:Page){const next=!isOpen(page);if(props.position!=='footer')overrides.value={};overrides.value[page.id]=next;}
function activate(page:Page){const children=props.pages.some(p=>p.parent===page.id);emit('select',page.id);if(children){const next=!isOpen(page);if(props.position!=='footer')overrides.value={};overrides.value[page.id]=next;}}
</script>
<template><ul class="site-menu-list" :class="{'site-menu-root':!parent}"><li v-for="page in items" :key="page.id" class="site-nav-item" :data-current-branch="ancestors(pages,current).some(n=>n.id===page.id)"><div class="site-nav-label"><a :class="parent?'site-menu-link':'site-nav-direct'" :href="'#preview-'+page.id" :aria-current="current===page.id?'page':undefined" @click.prevent="activate(page)">{{page.title}}</a><button v-if="pages.some(p=>p.parent===page.id)" data-site-toggle type="button" :aria-label="(isOpen(page)?'收起 ':'展开 ')+page.title" :aria-expanded="isOpen(page)" @click="toggle(page)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div><div v-if="pages.some(p=>p.parent===page.id)" class="site-dropdown" :hidden="!isOpen(page)"><SiteMenu :pages="pages" :parent="page.id" :current="current" :position="position" :expanded="expanded||page.footerExpanded" @select="select"/></div></li></ul></template>
