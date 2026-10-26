<script setup lang="ts">
import {ref,watch} from 'vue';
import {skins,defaults,readAppearance,applyAppearance} from './appearance';
const props=defineProps<{account:string}>(),open=ref(false),value=ref({...defaults});
watch(()=>props.account,account=>{value.value=readAppearance(account);applyAppearance(value.value);},{immediate:true});
function change(){applyAppearance(value.value);try{localStorage.setItem('exportweb-appearance:'+props.account,JSON.stringify(value.value));}catch{}}
</script>
<template><button class="settings-button" aria-label="外观设置" title="外观设置" @click="open=true">⚙</button><el-dialog v-model="open" title="外观设置" width="min(480px,94vw)">
 <label>界面配色<select v-model="value.skin" @change="change"><option v-for="s in skins" :key="s.id" :value="s.id">{{s.name}}</option></select></label>
 <label>显示模式<select v-model="value.mode" @change="change"><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label>
 <label>内容间距<select v-model="value.density" @change="change"><option value="compact">紧凑</option><option value="standard">标准</option><option value="comfortable">舒适</option></select></label>
 <p>保存在当前浏览器，按账号和组织区分。网站内容使用你选择的网站风格。</p><button @click="open=false">完成</button>
</el-dialog></template>
