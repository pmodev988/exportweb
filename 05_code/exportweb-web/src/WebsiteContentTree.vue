<script setup lang="ts">
import {computed} from 'vue';
import type {Page} from './model';
import FolderIcon from './FolderIcon.vue';
import {isMenu,detailsFor} from './site-settings';
import SharedDetailIcon from './SharedDetailIcon.vue';
const props=defineProps<{node:Page;pages:Page[];source:string}>(),emit=defineEmits<{edit:[id:string];add:[id:string];remove:[id:string]}>();
const children=computed(()=>props.pages.filter(p=>isMenu(p)&&p.parent===props.node.id));
const entries=computed(()=>detailsFor(props.pages,props.node.id));
</script>
<template><div class="content-map-heading"><FolderIcon/><strong :title="node.title">{{node.title}}</strong><button type="button" class="content-icon" :aria-label="'新增详情 '+node.title" title="新增详情" @click="emit('add',node.id)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div><ul class="content-title-list"><li v-for="entry in entries" :key="entry.id" class="content-entry-row"><button class="content-title-link" :title="entry.content[source]?.title||entry.title" @click="emit('edit',entry.id)">{{entry.content[source]?.title||entry.title}}</button><span v-if="entry.hidden" class="tag">隐藏草稿</span><SharedDetailIcon :entry="entry" :pages="pages"/><span v-if="!entry.content[source]?.html.trim()" class="content-pending" title="待填写">·</span><button class="content-icon content-delete" :aria-label="'删除详情 '+(entry.content[source]?.title||entry.title)" title="删除详情" @click="emit('remove',entry.id)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"/></svg></button></li></ul><div v-if="children.length" class="map-dropdown"><ul><li v-for="child in children" :key="child.id"><WebsiteContentTree :node="child" :pages="pages" :source="source" @edit="emit('edit',$event)" @add="emit('add',$event)" @remove="emit('remove',$event)"/></li></ul></div></template>
