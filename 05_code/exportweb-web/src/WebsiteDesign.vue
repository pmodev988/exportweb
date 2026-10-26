<script setup lang="ts">
import {computed,ref} from 'vue';
import {useProject} from './store';
import type {Catalog,Design} from './model';
import WebsitePreview from './WebsitePreview.vue';
import {websiteProject} from './websites';
const props=defineProps<{catalog:Catalog}>(),emit=defineEmits<{next:[]}>(),store=useProject();
const filter=ref(''),candidate=ref(''),motion=ref<Design['motion']>('static');
const current=computed(()=>props.catalog.themes.find(t=>t.id===store.project.theme));
const picked=computed(()=>props.catalog.themes.find(t=>t.id===candidate.value));
const themes=computed(()=>props.catalog.themes.filter(t=>!filter.value||t.style===filter.value));
const mode=computed({get:()=>store.project.design?.pageMode||'multi',set:(pageMode:Design['pageMode'])=>{store.project.design={pageMode,motion:store.project.design?.motion||'static'};store.changed();}});
function select(id:string){candidate.value=id;motion.value=store.project.design?.motion||'static';}
async function apply(){if(!picked.value)return;store.project.theme=picked.value.id;store.project.design={pageMode:mode.value,motion:motion.value};store.changed();try{await store.flush();candidate.value='';emit('next');}catch{/* Store shows the save failure; keep the preview available. */}}
</script>
<template>
 <section class="card page-mode-settings"><h2>页面形式</h2><p>先确定客户怎样浏览网站，再选择视觉风格。切换形式会保留架构和内容。</p><div class="page-mode-choices" role="radiogroup" aria-label="页面形式"><label v-for="id in (['multi','single'] as const)" :key="id" class="page-mode-choice"><input v-model="mode" type="radio" name="sitePageMode" :value="id"><span :class="['page-mode-picture','picture-'+id]" aria-hidden="true"><i></i><i></i><i></i></span><span><strong>{{id==='multi'?'多页面 · 默认':'单页 · 集中展示'}}</strong><small>{{id==='multi'?'每个栏目独立显示，点击菜单进入对应页面。':'全部栏目在同一页，点击菜单滚动到对应内容。'}}</small></span></label></div></section>
 <section v-if="picked" class="card"><div class="between"><div><p class="eyebrow">{{catalog.styles.find(s=>s.id===picked?.style)?.name}}</p><h2>{{picked.id}} {{picked.name}}</h2></div><button @click="candidate=''">返回方案</button></div><p>{{picked.goal}}</p><p class="muted">{{picked.distinction}}</p><p class="small muted">下方使用你已选的架构和公司内容预览风格。菜单可直接操作，页面按上方选择的形式显示。栏目与层级在预览和导出中保持一致。</p><div class="site-preview"><div class="preview-browser-bar"><span>● ● ●　可编辑页面预览</span><span>{{store.project.company.name}}</span></div><WebsitePreview :project="websiteProject(store.project)" :theme="picked" :motion="motion"/></div><label for="site-motion">动效方式</label><select id="site-motion" v-model="motion"><option value="static">静态</option><option value="subtle">轻动效</option><option value="expressive">沉浸动效</option></select><p class="small muted">增强首屏动感，正文保持清晰。系统选择减少动态效果时会自动静态显示。</p><p class="small muted">修改外观会保留现有栏目和正文。</p><div class="card-actions"><button class="primary" :disabled="store.saving" @click="apply">应用风格，设置 Logo</button></div></section>
 <template v-else><section class="card"><h2>选一种适合你的展示方式</h2><p>{{catalog.styles.length}} 种风格，{{catalog.themes.length}} 套方案。这一项只选择网站外观，栏目与正文保持不变。</p><p v-if="current" class="hint">当前外观：{{current.name}}。可继续修改外观，现有内容保持不变。</p><div class="card-actions"><button class="primary" @click="emit('next')">保留风格，设置 Logo</button></div><div class="style-filters" role="group" aria-label="按网站风格筛选"><button :aria-pressed="filter===''" @click="filter=''">全部</button><button v-for="style in catalog.styles" :key="style.id" :aria-pressed="filter===style.id" @click="filter=style.id">{{style.name}}</button></div><p class="small muted">网站风格决定页面外观；文案语气在内容详情中设置。</p></section>
 <div class="design-choices"><article v-for="t in themes" :key="t.id" class="card design-choice" :data-theme-id="t.id"><div class="design-art" v-html="t.thumbnail"></div><p class="eyebrow">{{t.id}} · {{catalog.styles.find(s=>s.id===t.style)?.name}}</p><h2>{{t.name}}</h2><p>{{t.audience}}</p><p class="small muted">{{t.distinction}}</p><div class="card-actions"><button class="primary" @click="select(t.id)">查看与选择</button></div></article></div></template>
</template>
