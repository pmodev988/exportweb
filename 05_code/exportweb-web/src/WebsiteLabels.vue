<script setup lang="ts">
import {useProject} from './store';
import {settings} from './site-settings';
const props=defineProps<{locale:string}>(),store=useProject();
const fields={cta:'联系按钮',nav:'导航名称',notice:'预览说明',footer:'页脚说明'};
function value(key:string){return settings(store.project).labels?.[props.locale]?.[key]||'';}
function update(key:string,text:string){const labels=settings(store.project).labels||={};(labels[props.locale]||={})[key]=text;store.changed();}
</script>
<template><details><summary>网站按钮与说明</summary><template v-for="(label,key) in fields" :key="key"><label :for="'site-label-'+locale+'-'+key">{{label}}</label><input :id="'site-label-'+locale+'-'+key" :value="value(key)" :lang="locale" maxlength="600" @input="update(key,($event.target as HTMLInputElement).value)"></template></details></template>
