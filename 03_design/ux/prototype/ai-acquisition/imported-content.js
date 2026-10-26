(function(root){
 'use strict';
 // Recognize layout lists by their relationships, never by a supplier's CSS names.
 function normalize(root){
  const doc=root.ownerDocument;
  function parts(item){
   const nested=item.children.length===1?item.firstElementChild:null;
   if(!nested?.matches('ol,ul')||nested.children.length!==2||item.childNodes.length&&[...item.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return null;
   const [media,copy]=nested.children;
   if(!media.matches('li')||!copy.matches('li')||media.querySelectorAll('img,.media-placeholder').length!==1||copy.querySelector('img,video,iframe,.media-placeholder'))return null;
   const withoutMedia=media.cloneNode(true);withoutMedia.querySelectorAll('img,.media-placeholder').forEach(n=>n.remove());
   const link=media.querySelector('a[href]'),title=copy.querySelector('a[href]');
   if(withoutMedia.textContent.trim()||!link||!title?.textContent.trim()||link.getAttribute('href')!==title.getAttribute('href')||!/^https:\/\/|^\/(?!\/)|^#/.test(link.getAttribute('href')))return null;
   return [media,copy];
  }
  for(const list of [...root.querySelectorAll('ul,ol')]){
   if(!root.contains(list)||!list.children.length||[...list.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
   const rows=[...list.children].map(n=>n.matches('li')?parts(n):null);if(rows.some(n=>!n))continue;
   const group=doc.createElement('div');group.className='content-products';
   for(const pair of rows){
    const row=doc.createElement('div');row.className='rich-columns rich-columns-2 content-product';
    for(const source of pair){const column=doc.createElement('div');column.className='rich-column';for(const node of source.childNodes)column.append(node.cloneNode(true));row.append(column);}
    const copy=row.lastElementChild,title=copy.querySelector('a[href]');
    if(title?.parentElement===copy){const heading=doc.createElement('h3');title.replaceWith(heading);heading.append(title);}
    group.append(row);
   }
   // Category labels are headings, not isolated underlined paragraphs.
   const parent=list.parentElement,label=parent?.previousElementSibling;
   if(parent?.children.length===1&&label?.matches('div')&&label.children.length===1&&label.firstElementChild.matches('a')&&label.textContent.trim()===label.firstElementChild.textContent.trim()){
    const heading=doc.createElement('h2');while(label.firstChild)heading.append(label.firstChild);label.replaceWith(heading);
   }
   list.replaceWith(group);
  }
  const imageOnly=node=>{if(node.querySelectorAll('img,.media-placeholder').length!==1)return false;const copy=node.cloneNode(true);copy.querySelectorAll('img,.media-placeholder,figcaption').forEach(n=>n.remove());return !copy.textContent.trim();};
  for(const list of [...root.querySelectorAll('ul,ol')]){
   const items=[...list.children];if(!items.length||!items.every(n=>n.matches('li'))||list.closest('.content-product'))continue;
   const gallery=items.every(imageOnly);
   const cards=!gallery&&items.every(n=>{const image=n.querySelector('img,.media-placeholder'),link=image?.closest('a[href]'),title=[...n.querySelectorAll('a[href]')].find(a=>a.textContent.trim());return n.querySelectorAll('img,.media-placeholder').length===1&&!n.querySelector('ul,ol')&&link&&title&&link.getAttribute('href')===title.getAttribute('href')&&n.querySelector('p');});
   if(!gallery&&!cards)continue;
   const group=doc.createElement('div');group.className=gallery?'content-gallery':'content-card-grid';
   for(const item of items){const box=doc.createElement(gallery?'figure':'div');if(cards)box.className='content-card';for(const n of item.childNodes)box.append(n.cloneNode(true));if(cards){const title=[...box.querySelectorAll('a[href]')].find(a=>a.textContent.trim());if(title?.parentElement===box){const h=doc.createElement('h3');title.replaceWith(h);h.append(title);}}group.append(box);}
   list.replaceWith(group);
  }
  for(const container of root.querySelectorAll('div,section')){
   if(container.matches('.content-product,.content-card,.content-media-text')||container.children.length!==2)continue;
   const [media,copy]=container.children;
   if(!media.matches('div,figure')||!copy.matches('div,section')||!imageOnly(media)||copy.querySelector('img,video,iframe')||!copy.querySelector('h2,h3')||!copy.querySelector('p'))continue;
   container.classList.add('rich-columns','rich-columns-2','content-media-text');media.classList.add('rich-column');copy.classList.add('rich-column');
  }
  for(const table of root.querySelectorAll('table')){
   let wrapper=table.parentElement;if(!wrapper.matches('figure')){wrapper=doc.createElement('figure');table.replaceWith(wrapper);wrapper.append(table);}wrapper.classList.add('table','content-specs');
  }
  for(const link of root.querySelectorAll('a[href]')){
   if(!link.textContent.trim())continue;
   const named=/^(?:btn|button|btn[-_].+|button[-_].+|view[-_]?more|read[-_]?more|more)$/i;
   const inProduct=link.closest('.content-product,.content-card'),isTitle=!!link.closest('h2,h3,h4');
   const standalone=link.parentElement.matches('.rich-column,.content-card')||link.parentElement.matches('p')&&link.parentElement.textContent.trim()===link.textContent.trim();
   if([...link.classList].some(c=>named.test(c))||inProduct&&!isTitle&&standalone&&!link.querySelector('img'))link.classList.add('content-button');
  }
  return root;
 }
 const api={normalize};root.LGAImportedContent=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
