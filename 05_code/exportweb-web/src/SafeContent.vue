<script setup lang="ts">
import {ref,watchEffect} from 'vue';
import DOMPurify from 'dompurify';
import {importedContent} from './imported-content';
const props=defineProps<{html:string}>(),host=ref<HTMLElement>();
watchEffect(()=>{
 if(host.value)host.value.innerHTML=DOMPurify.sanitize(importedContent(props.html),{
  ADD_TAGS:['video','source','iframe'],ADD_ATTR:['controls','allowfullscreen','sandbox'],
  FORBID_TAGS:['script','style','form','input','button','object','embed'],
  FORBID_ATTR:['srcdoc']
 });
 if(host.value)for(const frame of host.value.querySelectorAll('iframe')){
  try{
   const url=new URL(frame.src);
   if(url.protocol!=='https:'||!['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com'].includes(url.hostname)||!/^\/(embed|video)\/[\w-]+$/.test(url.pathname)){frame.remove();continue;}
   frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');
  }catch{frame.remove();}
 }
});
</script>
<template><div ref="host" class="ck-content rich-content"></div></template>
