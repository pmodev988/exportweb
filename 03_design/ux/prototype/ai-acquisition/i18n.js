(function(root){
'use strict';
const local=typeof module!=='undefined'&&module.exports,dict=local?require('./ui-en.js'):root.LGAEnglish;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let enabled=false,protectedValues=new Set(),saved=[];const missing=new Set();
const keys=Object.keys(dict).sort((a,b)=>b.length-a.length);
function t(value,language){const on=language?language==='en':enabled,s=String(value??'');if(!on)return s;if(dict[s])return dict[s];let result=s.replace(/第 (\d+) 轮/g,'Round $1').replace(/资料第 (\d+) 版/g,'Profile v$1').replace(/本轮 (\d+)/g,'Round $1').replace(/本地草稿第 (\d+) 版/g,'Local draft v$1').replace(/你的网站草稿 · 第 (\d+) 版/g,'Your website draft · v$1').replace(/本次脚本 · 第 (\d+) 版/g,'Script · v$1').replace(/(\d+) 点以内/g,'Up to $1 points').replace(/(\d+) 体验点/g,'$1 demo points').replace(/(\d+) 点/g,'$1 points').replace(/(\d+) 条示例询问待处理/g,'$1 pending sample inquiries').replace(/(\d+) 条待处理/g,'$1 pending').replace(/已选 (\d+) 家/g,'$1 companies selected').replace(/已有 (\d+) 个栏目，可以继续完善与检查。/g,'$1 sections are ready for editing and review.').replace(/(\d+) 个栏目暂未显示，可补充资料后启用。/g,'$1 sections are hidden. Add content to enable them.');for(const k of keys)if(result.includes(k))result=result.split(k).join(dict[k]);if(/[\u3400-\u9fff]/.test(result.replace(/\uE000\d+\uE001/g,'')))missing.add(s);return result;}
function keep(html){if(!enabled)return html;const id=saved.push(String(html))-1;return '\uE000'+id+'\uE001';}
function value(x){const s=String(x??'');return enabled&&protectedValues.has(s)?keep(esc(s)):esc(t(s));}
function render(state,language,fn){
 if(language!=='en')return fn();
 const prev={enabled,protectedValues,saved};enabled=true;protectedValues=new Set();saved=[];
 const visit=x=>{if(typeof x==='string')protectedValues.add(x);else if(x&&typeof x==='object')Object.values(x).forEach(visit);};visit(state);
 try{let html=fn();html=html.split(/(<[^>]*>)/g).map(part=>part.startsWith('<')?part.replace(/(aria-label|title|placeholder)="([^"]*)"/g,(_,a,v)=>`${a}="${t(v)}"`):t(part)).join('');
   // Restore nested protected fragments without interpreting customer HTML as UI.
   for(let i=0;i<4;i++)html=html.replace(/\uE000(\d+)\uE001/g,(_,id)=>saved[Number(id)]??'');return html;
 }finally{({enabled,protectedValues,saved}=prev);}
}
const api={t,value,keep,render,missing};if(local)module.exports=api;else root.LGAI18n=api;
})(typeof globalThis!=='undefined'?globalThis:this);
