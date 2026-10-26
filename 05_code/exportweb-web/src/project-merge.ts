// Rebase local edits onto the latest server snapshot without reviving remotely deleted rows.
const absent=Symbol('absent');
type Value=unknown|typeof absent;
const equal=(a:Value,b:Value)=>a===absent||b===absent?a===b:JSON.stringify(a)===JSON.stringify(b);
const object=(v:Value):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keyed=(v:unknown[]):v is {id:string}[]=>v.every(x=>object(x)&&typeof x.id==='string')&&new Set(v.map(x=>(x as {id:string}).id)).size===v.length;
export function mergeProject<T>(base:T,local:T,remote:T):{value:T;conflicts:string[]}{
 const conflicts:string[]=[];
 function merge(b:Value,l:Value,r:Value,path:string):Value{
  if(equal(l,b))return r;
  if(equal(r,b)||equal(l,r))return l;
  if(/\.acquisition\.(selectedTask|selectedCompany|filter)(\.|$)/.test(path))return l;
  if(object(b)&&object(l)&&object(r)){
   const out:Record<string,unknown>=Object.create(null);
   for(const key of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){
    const next=merge(Object.hasOwn(b,key)?b[key]:absent,Object.hasOwn(l,key)?l[key]:absent,Object.hasOwn(r,key)?r[key]:absent,path?path+'.'+key:key);
    if(next!==absent)out[key]=next;
   }
   return out;
  }
  if(Array.isArray(b)&&Array.isArray(l)&&Array.isArray(r)&&keyed(b)&&keyed(l)&&keyed(r)){
   const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),rm=new Map(r.map(x=>[x.id,x]));
   const common=b.map(x=>x.id).filter(id=>lm.has(id)&&rm.has(id));
   const lo=l.map(x=>x.id).filter(id=>common.includes(id)),ro=r.map(x=>x.id).filter(id=>common.includes(id));
   if(!equal(lo,common)&&!equal(ro,common)&&!equal(lo,ro)){conflicts.push(path);return l;}
   const preferred=!equal(lo,common)?l:r;
   const order=[...l.filter(x=>!bm.has(x.id)&&!rm.has(x.id)),...preferred,...l,...r,...b].map(x=>x.id);
   const out:unknown[]=[];
   for(const id of new Set(order)){
    const next=merge(bm.get(id)??absent,lm.get(id)??absent,rm.get(id)??absent,path+'['+id+']');
    if(next!==absent)out.push(next);
   }
   return out;
  }
  conflicts.push(path||'资料');return l;
 }
 return {value:merge(base,local,remote,'') as T,conflicts};
}
