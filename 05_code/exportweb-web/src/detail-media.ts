export interface MediaItem {index:number;kind:'image'|'video';name:string;alt:string;placeholder:boolean;source:string}
const selector='img,video,iframe,.media-placeholder';
export function mediaItems(html:string):MediaItem[]{return Array.from(new DOMParser().parseFromString(html,'text/html').body.querySelectorAll(selector)).map((node,index)=>{const source=node.getAttribute('src')||node.querySelector('source')?.getAttribute('src')||node.getAttribute('data-media-source')||'';return {index,kind:node.tagName==='IMG'||node.getAttribute('data-media-kind')==='image'?'image':'video',name:node.getAttribute('data-media-name')||node.getAttribute('title')||source.split('/').pop()?.split('?')[0]||'媒体文件',alt:node.getAttribute('alt')||node.getAttribute('data-media-alt')||'',placeholder:node.classList.contains('media-placeholder'),source};});}
export function replaceMedia(html:string,index:number,kind:'image'|'video',url:string,name:string):string{
 const doc=new DOMParser().parseFromString(html,'text/html'),old=doc.body.querySelectorAll(selector)[index];if(!old)throw Error('媒体已变化，请重新选择');
 const node=doc.createElement(kind==='image'?'img':'video');node.setAttribute('src',url);node.setAttribute('title',name);
 const alt=old.getAttribute('alt')||old.getAttribute('data-media-alt')||name;
 if(kind==='image')node.setAttribute('alt',alt);else {node.setAttribute('controls','');node.setAttribute('data-media-alt',alt);}
 old.replaceWith(node);return doc.body.innerHTML;
}
