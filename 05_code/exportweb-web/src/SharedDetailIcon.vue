<script setup lang="ts">
import {computed} from 'vue';
import type {Page} from './model';
import {mounts,menuLabel} from './site-settings';
const props=defineProps<{entry:Page;pages:Page[]}>();
const names=computed(()=>mounts(props.entry).map(id=>props.pages.find(p=>p.id===id)).filter((p):p is Page=>!!p).map(p=>menuLabel(props.pages,p)));
</script>
<template><span v-if="names.length>1" class="shared-detail-icon" :title="'多位置显示：'+names.join('；')" :aria-label="'多位置显示，共 '+names.length+' 个菜单'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8V4h11v11h-4M4 9h11v11H4Z"/></svg></span></template>
