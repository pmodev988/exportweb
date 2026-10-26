<script setup lang="ts">
import {computed} from 'vue';
import type {Page} from './model';
import {detailsFor} from './site-settings';
import SharedDetailIcon from './SharedDetailIcon.vue';
const props=defineProps<{menuId:string;pages:Page[];source:string}>(),emit=defineEmits<{edit:[id:string]}>();
const entries=computed(()=>detailsFor(props.pages,props.menuId).filter(p=>p.content[props.source]?.html.trim()));
</script>
<template><ul v-if="entries.length" class="map-menu-details"><li v-for="entry in entries" :key="entry.id"><button class="content-title-link" :title="entry.content[source]?.title||entry.title" @click="emit('edit',entry.id)">{{entry.content[source]?.title||entry.title}}</button><SharedDetailIcon :entry="entry" :pages="pages"/></li></ul></template>
