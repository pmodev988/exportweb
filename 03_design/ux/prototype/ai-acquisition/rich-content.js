(function(root){
  'use strict';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const types=new Set(['p','h2','h3','blockquote','ul','ol','image','video','columns','divider','table']);
  function url(value,kind='link'){
    const s=String(value||'').trim();
    if(kind==='link'&&/^#[\w-]*$/.test(s))return s;
    if(kind==='image'&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(s)&&s.length<=1500000)return s;
    try{const u=new URL(s);if(u.username||u.password)return '';if(u.protocol==='https:'||kind==='link'&&['http:','mailto:','tel:'].includes(u.protocol))return u.href;}catch{}
    return '';
  }
  function embed(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com'].includes(u.hostname)&&/^\/(embed|video)\/[A-Za-z0-9_-]+$/.test(u.pathname)?u.href:'';}catch{return '';}}
  function normalize(input){
    const doc=typeof input==='string'?JSON.parse(input||'[]'):input||[];
    if(!Array.isArray(doc)||doc.length>500||JSON.stringify(doc).length>2500000)throw Error('正文内容过大，请减少图片大小或使用图片网址。');
    const text=x=>String(x??'').slice(0,100000);
    const inline=items=>{
      if(!Array.isArray(items)||items.length>2000)throw Error('正文格式无效');
      return items.map(n=>({text:text(n?.text),...(n?.bold?{bold:true}:{}),...(n?.italic?{italic:true}:{}),...(n?.underline?{underline:true}:{}),...(n?.button?{button:true}:{}),...(typeof n?.pageId==='string'&&/^[\w-]{1,160}$/.test(n.pageId)?{pageId:n.pageId}:url(n?.href)?{href:url(n.href)}:{})}));
    };
    let count=0;
    const blocks=(nodes,depth=0)=>{
      if(!Array.isArray(nodes)||depth>6)throw Error('页面分栏层级过多');
      return nodes.filter(n=>n&&types.has(n.type)).map(n=>{
        if(++count>500)throw Error('页面内容过多');
        const align=['left','center','right'].includes(n.align)?{align:n.align}:{};
        if(n.type==='columns'){
          const layout=['product','media-text','cards','gallery','callout'].includes(n.layout)?n.layout:undefined,group=['cards','gallery','callout'].includes(layout);
          if(!Array.isArray(n.columns)||n.columns.length<(group?1:2)||n.columns.length>(group?24:3))throw Error('分栏需要两列或三列，卡片和图片组最多 24 项');
          return {type:n.type,...(layout?{layout}:{}),columns:n.columns.map(column=>blocks(column,depth+1))};
        }
        if(n.type==='table'){
          if(!Array.isArray(n.rows)||n.rows.length>100)throw Error('表格最多 100 行');
          return {type:'table',rows:n.rows.map(row=>{if(!Array.isArray(row)||row.length>30)throw Error('表格最多 30 列');return row.map(cell=>({header:!!cell.header,children:inline(cell.children||[]),colspan:Math.min(30,Math.max(1,Number(cell.colspan)||1)),rowspan:Math.min(100,Math.max(1,Number(cell.rowspan)||1))}));})};
        }
        if(n.type==='divider')return {type:n.type};
        if(['image','video'].includes(n.type)){if(n.placeholder)return {type:n.type,placeholder:true,name:text(n.name).slice(0,180),alt:text(n.alt).slice(0,300),src:url(n.src,n.type),...align};if(/^file_[a-f0-9-]{36}$/i.test(n.assetId||''))return {type:n.type,assetId:n.assetId,alt:text(n.alt).slice(0,300),...align};const src=url(n.src,n.type);if(!src)throw Error(n.type==='image'?'图片需要 PNG/JPEG/WebP/GIF 文件或 HTTPS 地址。':'视频需要 HTTPS 媒体直链（如 MP4/WebM）。');return {type:n.type,src,alt:text(n.alt).slice(0,300),...(n.caption===false?{caption:false}:{}),...(url(n.href)?{href:url(n.href)}:{}),...(n.embed&&n.type==='video'&&embed(src)?{embed:true}:{}),...align};}
        if(['ul','ol'].includes(n.type)){if(!Array.isArray(n.items)||n.items.length>500)throw Error('列表格式无效');return {type:n.type,items:n.items.map(inline),...align};}
        return {type:n.type,children:inline(n.children||[]),...align};
      });
    };
    return blocks(doc);
  }
  const fromText=text=>String(text||'').split('\n').map(line=>({type:'p',children:[{text:line}]}));
  const leaves=doc=>doc.flatMap(n=>n.columns?n.columns.flatMap(leaves):n.type==='divider'?[]:[n]);
  const plain=doc=>leaves(normalize(doc)).map(n=>n.type==='image'?(n.alt||'图片'):n.type==='video'?(n.alt||'视频'):n.rows?n.rows.flat().map(cell=>cell.children.map(x=>x.text).join('')).join('\n'):n.items?n.items.map(items=>items.map(x=>x.text).join('')).join('\n'):n.children.map(x=>x.text).join('')).join('\n');
  function html(doc){
    const inline=items=>items.map(n=>{let s=esc(n.text).replace(/\n/g,'<br>');if(n.bold)s='<strong>'+s+'</strong>';if(n.italic)s='<em>'+s+'</em>';if(n.underline)s='<u>'+s+'</u>';if(n.pageId)s=`<a href="#${esc(n.pageId)}" data-site-page-link="${esc(n.pageId)}">${s}</a>`;else if(n.href)s=`<a href="${esc(n.href)}"${n.button?' class="content-button"':''} target="_blank" rel="noopener noreferrer">${s}</a>`;return s;}).join('');
    const blocks=nodes=>nodes.map(n=>{
      const align=n.align?` data-content-align="${n.align}"`:'';
      if(n.columns){const cls={product:'rich-columns rich-columns-2 content-product','media-text':'rich-columns rich-columns-2 content-media-text',cards:'content-card-grid',gallery:'content-gallery',callout:'content-callout'}[n.layout]||`rich-columns rich-columns-${n.columns.length}`;return `<div class="${cls}">${n.columns.map(column=>`<div class="${n.layout==='cards'?'content-card':'rich-column'}">${blocks(column)}</div>`).join('')}</div>`;}
      if(n.rows)return `<figure class="table content-specs"><table><tbody>${n.rows.map(row=>`<tr>${row.map(cell=>{const tag=cell.header?'th':'td';return `<${tag}${cell.colspan>1?` colspan="${cell.colspan}"`:''}${cell.rowspan>1?` rowspan="${cell.rowspan}"`:''}>${inline(cell.children)}</${tag}>`;}).join('')}</tr>`).join('')}</tbody></table></figure>`;
      if(n.type==='divider')return '<hr class="rich-divider">';
      if(n.placeholder)return `<div class="media-placeholder" data-media-kind="${n.type}" data-media-name="${esc(n.name)}" data-media-alt="${esc(n.alt)}" data-media-source="${esc(n.src)}"><p>${n.type==='image'?'图片占位：':'视频占位：'}${esc(n.alt)}${n.alt?' · ':''}${esc(n.name)}</p></div>`;
      if(n.assetId)return `<figure${align} data-asset-id="${esc(n.assetId)}" data-asset-kind="${n.type}"><div class="detail-file-slot" data-file-id="${esc(n.assetId)}" data-file-kind="${n.type}" data-file-name="${esc(n.alt)}">${n.type==='image'?'图片':'视频'} · ${esc(n.alt||n.assetId)}</div>${n.alt?`<figcaption>${esc(n.alt)}</figcaption>`:''}</figure>`;
      if(n.type==='image')return `<figure${align}>${n.href?`<a href="${esc(n.href)}" rel="noopener noreferrer">`:''}<img src="${esc(n.src)}" alt="${esc(n.alt)}" loading="lazy">${n.href?'</a>':''}${n.alt&&n.caption!==false?`<figcaption>${esc(n.alt)}</figcaption>`:''}</figure>`;
      if(n.type==='video'&&n.embed&&embed(n.src))return `<figure${align}><iframe src="${esc(n.src)}" title="${esc(n.alt)}" sandbox="allow-scripts allow-same-origin allow-presentation" allowfullscreen></iframe>${n.alt?`<figcaption>${esc(n.alt)}</figcaption>`:''}</figure>`;
      if(n.type==='video')return `<figure${align}><video src="${esc(n.src)}" controls preload="metadata" playsinline></video>${n.alt?`<figcaption>${esc(n.alt)}</figcaption>`:''}</figure>`;
      if(n.items)return `<${n.type}${align}>${n.items.map(items=>'<li>'+inline(items)+'</li>').join('')}</${n.type}>`;
      return `<${n.type}${align}>${inline(n.children)||'<br>'}</${n.type}>`;
    }).join('');
    return blocks(normalize(doc));
  }
  function read(block){
    try{return block.rich?normalize(block.rich):fromText(block.body);}catch{return fromText(block.body);}
  }
  const render=block=>`<div class="rich-content">${html(read(block))}</div>`;
  // Persist identical inline images once, even across undo history and draft copies.
  // The in-memory document and exported website still contain ordinary image URLs.
  function packJSON(raw){
    const pattern=/data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}/g;
    const media=[...new Set(String(raw).match(pattern)||[])];if(!media.length)return raw;
    let n=0,prefix;do{prefix='__LGA_LOCAL_MEDIA_'+n+++'__';}while(raw.includes(prefix));
    const ids=new Map(media.map((value,i)=>[value,i]));
    return JSON.stringify({storageEncoding:'LGA-MEDIA-1',prefix,media,payload:raw.replace(pattern,value=>prefix+ids.get(value)+'__')});
  }
  function unpackJSON(raw){
    if(!raw)return raw;
    let stored;try{stored=JSON.parse(raw);}catch{return raw;}if(stored?.storageEncoding!=='LGA-MEDIA-1')return raw;
    if(!/^__LGA_LOCAL_MEDIA_\d+__$/.test(stored.prefix)||!Array.isArray(stored.media)||stored.media.some(src=>!url(src,'image').startsWith('data:image/'))||typeof stored.payload!=='string')throw Error('图片存档格式无效，原存档已保留。');
    return stored.payload.replace(new RegExp(stored.prefix+'(\\d+)__','g'),(_match,id)=>{if(!stored.media[Number(id)])throw Error('图片存档不完整，原存档已保留。');return stored.media[Number(id)];});
  }
  // Translations keep media and structural paragraphs; never render source HTML.
  function localized(doc,body){
    const rich=normalize(doc),lines=String(body||'').split('\n');
    const count=leaves(rich).reduce((n,b)=>n+(b.rows?b.rows.flat().length:b.items?b.items.length:1),0);
    if(count!==lines.length)return [...fromText(body),...leaves(rich).filter(n=>['image','video'].includes(n.type))];
    let at=0;const translate=nodes=>nodes.map(b=>{
      if(b.columns)return {...b,columns:b.columns.map(translate)};
      if(b.type==='divider')return b;
      if(['image','video'].includes(b.type)){at++;return b;}
      if(b.rows)return {...b,rows:b.rows.map(row=>row.map(cell=>({...cell,children:[{text:lines[at++]}]})))};
      if(b.items)return {...b,items:b.items.map(()=>[{text:lines[at++]}])};
      return {...b,children:[{text:lines[at++]}]};
    });return translate(rich);
  }
  const api={embed,esc,url,normalize,fromText,plain,html,read,render,localized,packJSON,unpackJSON};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGARichContent=api;
})(typeof globalThis!=='undefined'?globalThis:this);
