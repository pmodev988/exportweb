import type {Project} from './model';
import {settings} from './site-settings';
const keys=['cta','nav','notice','footer'];
const quote=(s:string)=>'"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';
const unprotect=(s:string)=>/^'[=+\-@\t\r]/.test(s)?s.slice(1):s;
async function sourceKey(p:Project){const source=JSON.stringify([p.websites?.activeId||'primary',p.company,p.sourceLanguage,p.pages.map(n=>[n.id,n.parent,n.ownerPageId,n.content[p.sourceLanguage]]),p.site?.labels?.[p.sourceLanguage]]);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function translationSheet(p:Project,locale:string):Promise<string> {
 const rows=[['kind','id','field','locale','text']],source=await sourceKey(p);
 for(const page of p.pages)for(const field of ['menuTitle','title','html'] as const)rows.push(['page',page.id,field,locale,page.content[locale]?.[field]||'']);
 for(const key of keys)rows.push(['label','site',key,locale,settings(p).labels?.[locale]?.[key]||'']);
 return '\uFEFF'+rows.map((row,i)=>[i===0?'source_key':source,...row].map(quote).join(',')).join('\r\n');
}
function parse(text:string):string[][] {
 if(text.length>3000000)throw Error('翻译表超过 3 MB');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('翻译表引号未闭合');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
export async function importTranslation(p:Project,locale:string,csv:string):Promise<Project> {
 const rows=parse(csv);if(rows.shift()?.join(',')!=='source_key,kind,id,field,locale,text')throw Error('翻译表格式不正确，请使用下载的翻译表');const expected=await sourceKey(p);
 if(rows.length!==p.pages.length*3+4)throw Error('翻译表栏目不完整');
 const result=JSON.parse(JSON.stringify(p)) as Project,seen=new Set<string>();
 for(const row of rows){const [source,kind,id,field,language,raw,...extra]=row;if(source!==expected)throw Error('网站或原文已变化，请重新下载翻译表');if(extra.length||raw===undefined||language!==locale)throw Error('翻译表语言与当前语言不一致');const text=unprotect(raw),key=[kind,id,field].join(':');if(seen.has(key))throw Error('翻译表包含重复项目');seen.add(key);
  if(kind==='page'){const page=result.pages.find(n=>n.id===id);if(!page||!['menuTitle','title','html'].includes(field)||text.length>(field==='html'?100000:180))throw Error('翻译表栏目或文字长度无效');const current=page.content[locale]||{title:'',html:''};page.content[locale]={...current,[field]:text};}
  else if(kind==='label'&&id==='site'&&keys.includes(field)&&text.length<=600){const labels=settings(result).labels||={};(labels[locale]||={})[field]=text;}
  else throw Error('翻译表项目无效');
 }return result;
}
