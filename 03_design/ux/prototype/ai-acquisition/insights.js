(function(root){
'use strict';
const local=typeof module!=='undefined'&&module.exports;
const A=local?require('./acquisition.js'):root.LGAAcquisition;
const actions=new Set(['insightAddPlan','insightPlanStatus']);
const periods={week:{start:'2026-10-17',end:'2026-10-23'},month:{start:'2026-09-24',end:'2026-10-23'}};
const sourceNames=['海关数据','广告线索','社媒线索','网站询盘'];
function sample(period='month'){
 const key=period==='week'?'week':'month';
 const rows=key==='week'?[[32,18,4,2,1,80],[14,8,3,2,1,160],[10,6,2,1,0,40],[8,6,3,1,1,40]]:[[120,64,12,6,2,240],[48,26,10,5,2,480],[36,20,6,3,1,120],[24,16,8,4,2,120]];
 const sources=rows.map((v,i)=>({name:sourceNames[i],leads:v[0],contacted:v[1],replied:v[2],quoted:v[3],ordered:v[4],cost:v[5]}));
 const total=Object.fromEntries(['leads','contacted','replied','quoted','ordered','cost'].map(k=>[k,sources.reduce((n,r)=>n+r[k],0)]));
 return {period:key,...periods[key],sources,total,orderValue:key==='week'?18000:42000,received:key==='week'?12000:30000,fulfillmentCost:key==='week'?10800:25200,previousReplyRate:key==='week'?25:24};
}
function localSummary(s){
 const a=A.state(s),pending=(s.inbox||[]).filter(m=>m.reception?['WAITING_HUMAN','HUMAN_ACTIVE'].includes(m.status):!m.replyReceipt&&!['CLOSED','STOPPED'].includes(m.status));
 return {tasks:a.tasks,companies:a.companies,pending,quotes:s.growth?.quotes||[],drafts:a.companies.filter(c=>c.draft&&!c.stop&&A.reviewState(c)!=='已确认'),plans:s.businessInsights?.plans||[]};
}
const issues=[
 {id:'reply',title:'海关线索回复偏低',titleEn:'Low reply rate from customs leads',basis:'近 30 天海关线索联系 64 家、回复 12 家；回复率 18.8%，低于整体 28.6%。',basisEn:'12 of 64 customs prospects replied (18.8%), compared with 28.6% overall over 30 days.',change:'先核对采购品类与买家角色，再调整首封邮件切入点。',changeEn:'Check purchase categories and buyer roles, then revise the first email.',page:'leads',action:'调整获客任务',actionEn:'Review tasks',metric:'回复率',metricEn:'Reply rate',baseline:'18.8%',target:'22%',days:14},
 {id:'ads',title:'广告线索成本偏高',titleEn:'High advertising lead cost',basis:'近 30 天广告投入 USD 480，新增 48 家去重企业，平均 USD 10 / 家。',basisEn:'USD 480 generated 48 unique companies: USD 10 per company over 30 days.',change:'比较不同市场和产品的询盘质量，先试验一个受众与落地页组合。',changeEn:'Compare lead quality by market and product; test one audience and landing-page combination.',page:'website-editor',action:'检查落地页',actionEn:'Review landing page',metric:'每家企业获客成本',metricEn:'Cost per company',baseline:'USD 10',target:'USD 8',days:14},
 {id:'followup',title:'报价后跟进需要加强',titleEn:'Improve follow-up after quotations',basis:'近 30 天同批客户中 18 家已报价、7 家已成交，另 11 家尚未确认订单。',basisEn:'7 of 18 quoted companies placed orders; 11 have no confirmed order in this 30-day cohort.',change:'逐条检查报价后的回复与异议，安排下一次跟进。',changeEn:'Review replies and objections after quotations and schedule the next follow-up.',page:'inbox-quotes',action:'查看销售报价',actionEn:'Review quotations',metric:'报价客户成交率',metricEn:'Quoted-company conversion',baseline:'38.9%',target:'45%',days:14}
];
function apply(s,type,p={}){
 const plans=JSON.parse(JSON.stringify(s.businessInsights?.plans||[]));
 if(type==='insightAddPlan'){
  const issue=issues.find(x=>x.id===p.id);if(!issue)throw Error('改进建议不存在');
  if(plans.some(x=>x.issueId===issue.id&&x.status!=='completed'))return;
  const at=new Date().toISOString();
  plans.push({id:'improvement-'+(s.sequence||0)+'-'+plans.length,issueId:issue.id,title:issue.title,change:issue.change,page:issue.page,metric:issue.metric,baseline:issue.baseline,target:issue.target,days:issue.days,status:'planned',createdAt:at,sample:true,result:null});
 }else if(type==='insightPlanStatus'){
  const plan=plans.find(x=>x.id===p.id);if(!plan)throw Error('改进计划不存在');
  if(!['planned','running','completed'].includes(p.status))throw Error('计划状态无效');
  plan.status=p.status;plan.updatedAt=new Date().toISOString();
  // Completing an action is not evidence of a successful business result.
 }else throw Error('未知改进操作');
 s.businessInsights={...(s.businessInsights||{}),plans};
}
const api={actions,periods,sample,localSummary,issues,apply};if(local)module.exports=api;else root.LGAInsights=api;
})(typeof globalThis!=='undefined'?globalThis:this);
