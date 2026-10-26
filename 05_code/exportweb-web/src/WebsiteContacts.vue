<script setup lang="ts">
import {computed} from 'vue';
import {contactHref,contactTypes} from './communications';
import type {Contact,Communication} from './model';
const props=defineProps<{contacts?:Communication;items?:Contact[];sample?:boolean}>();
const icons:Record<string,string>={whatsapp:'M20 11.5a8 8 0 0 1-12 7L3 20l1.5-5A8 8 0 1 1 20 11.5ZM8 7c0 5 4 8 7 8l1-2-3-1-1 1-2-2 1-1-1-3Z',email:'M3 5h18v14H3ZM3 6l9 7 9-7',phone:'M6 3h4l1 5-3 2a14 14 0 0 0 6 6l2-3 5 1v4a3 3 0 0 1-3 3C9 20 4 15 3 6a3 3 0 0 1 3-3Z',link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'};
const links=computed(()=>props.items?props.items.map(c=>({id:c.type,name:c.label,href:contactHref(c),icon:icons[c.type]||icons.link})).filter(c=>c.href):[
 {id:'whatsapp',name:'WhatsApp',href:props.contacts?.whatsapp?'https://wa.me/'+props.contacts?.whatsapp.replace(/\D/g,''):'',icon:'M20 11.5a8 8 0 0 1-12 7L3 20l1.5-5A8 8 0 1 1 20 11.5ZM8 7c0 5 4 8 7 8l1-2-3-1-1 1-2-2 1-1-1-3Z'},
 {id:'email',name:'邮件',href:props.contacts?.email?'mailto:'+props.contacts?.email:'',icon:'M3 5h18v14H3ZM3 6l9 7 9-7'},
 {id:'phone',name:'电话',href:props.contacts?.phone?'tel:'+props.contacts?.phone.replace(/[^+\d]/g,''):'',icon:'M6 3h4l1 5-3 2a14 14 0 0 0 6 6l2-3 5 1v4a3 3 0 0 1-3 3C9 20 4 15 3 6a3 3 0 0 1 3-3Z'},
 {id:'link',name:'在线咨询',href:/^https:\/\//.test(props.contacts?.link||'')?props.contacts!.link:'',icon:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'}
].filter(x=>x.href));
</script>
<template><nav v-if="links.length" :class="['site-contact-widget',{'site-contact-sample':sample}]" aria-label="联系"><a v-for="link in links" :key="link.href+link.name" :class="['site-contact','site-contact-'+link.id]" :href="link.href" :aria-label="link.name" :title="link.name" :target="link.href.startsWith('https:')?'_blank':undefined" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="link.icon"/></svg></a></nav></template>
