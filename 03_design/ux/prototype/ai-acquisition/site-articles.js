(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),text=(x,n=1000)=>String(x??'').trim().slice(0,n);
const actions=new Set(['articleSave','articleGenerate','articleSelect','articleNew','articleLink']);
function state(s){return clone(s.site.articles||{items:[],selectedId:''});}
function current(s){const a=state(s);return a.items.find(x=>x.id===a.selectedId)||{id:'',revision:0,title:'',keywords:'',audience:'',language:'zh-CN',pageId:'',facts:'',body:''};}
function generate(d,s){
 const product=text(s.company.draft.product,200),facts=d.facts||text(s.company.draft.facts,4000);
 if(!d.title)throw Error('请填写文章主题');
 if(d.language==='en')return `${d.title}\n\nWhat should buyers clarify first?\nWhen evaluating ${d.keywords||'a product or service'}, begin with its intended use, specifications and operating conditions.\n\nInformation to discuss\n${facts?`Provided company or product facts (verify before use):\n${facts}`:'Add verified product specifications and service details here.'}\n\nQuestions to ask a supplier\nConfirm material, tolerances, order quantity, quality checks and delivery requirements. Pricing, lead times and certifications should be agreed for the actual project.\n\nNext step\nShare your requirements or drawings with our team to discuss fit.\n\n[Prototype draft: manually review all statements before publishing.]`;
 return `${d.title}\n\n先明确应用需求\n选择${d.keywords||product||'产品或服务'}时，可以先梳理使用场景、规格要求与需要解决的问题。${d.audience?'本文面向'+d.audience+'。':''}\n\n产品与服务资料\n${facts||'请在这里补充已经核实的产品参数、服务范围与应用案例。'}\n\n采购前值得确认的事项\n建议确认材料、尺寸公差、采购数量、质量检验方式和交付条件。具体价格、交期和认证情况应以双方核实的资料为准。\n\n下一步沟通\n欢迎提供需求、图纸或应用条件，一起确认是否适合合作。\n\n【原型演示草稿，请人工核对后使用。】`;
}
function apply(s,type,p={}){
 const a=state(s);
 if(type==='articleSelect'){if(!a.items.some(x=>x.id===p.id))throw Error('文章不存在');a.selectedId=p.id;}
 else if(type==='articleNew')a.selectedId='';
 else if(type==='articleLink'){const d=a.items.find(x=>x.id===p.id);if(!d||!s.site.blocks.some(b=>b.id===p.detailId))throw Error('文章或详情不存在');d.detailId=p.detailId;d.linkedRevision=d.revision;}
 else {
  let d=p.id?a.items.find(x=>x.id===p.id):null;if(p.id&&!d)throw Error('文章不存在');
  if(!d){d={id:'article-'+(++s.sequence),revision:0,history:[]};a.items.push(d);}
  if(d.revision)d.history.push(clone({...d,history:undefined}));
  for(const k of ['title','keywords','audience','language','pageId','facts','body'])if(k in p)d[k]=text(p[k],k==='body'?30000:k==='facts'?5000:500);
  d.language=['zh-CN','en'].includes(d.language)?d.language:'zh-CN';
  if(type==='articleGenerate'){d.body=generate(d,s);d.generatedDemo=true;}
  d.revision++;d.updatedAt=new Date().toISOString();a.selectedId=d.id;
 }
 s.site.articles=a;
}
const api={actions,state,current,generate,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGASiteArticles=api;
})(typeof globalThis!=='undefined'?globalThis:this);
