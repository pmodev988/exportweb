(function(root){
'use strict';
// Local prototype only: deterministic synthetic steps; no network or real send side effects.
const clone=x=>JSON.parse(JSON.stringify(x)),text=(x,n=500)=>String(x??'').trim().slice(0,n);
const markets=(typeof module!=='undefined'&&module.exports?require('./site-languages.js'):root.LGASiteLanguages).markets;
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const sourceIds=['lga','ads','social','website'];
// Five synthetic source rows demonstrate one duplicate and one logistics record.
const sampleRecords=[{id:'DEMO-BOL-01',company:'ACQ-DEMO-01'},{id:'DEMO-BOL-01-COPY',company:'ACQ-DEMO-01',duplicateOf:'DEMO-BOL-01'},{id:'DEMO-BOL-02',company:'ACQ-DEMO-02'},{id:'DEMO-BOL-03',company:'ACQ-DEMO-03'},{id:'DEMO-FORWARDER',forwarder:true}];
const stages=[['discover','线索发现'],['website','官网分析'],['enrich','联系人富化'],['match','产品匹配'],['content','内容生成'],['outreach','触达执行'],['reply','回复跟进']].map(([id,label])=>({id,label}));
const actions=new Set(['acqCreate','acqDemo','acqRunDemo','acqTick','acqSelectTask','acqFilter','acqOpenCompany','acqDraft','acqSaveDraft','acqSchedule','acqStop','acqReply','acqPause','acqResume','acqImport','acqSource','acqReview','acqSaveSequence']);
function state(s,filterRuntime=true){const a={tasks:[],companies:[],selectedTask:'',selectedCompany:'',filter:{query:'',status:''},source:'lga',...clone(s.acquisition||{})};if(s.runtime&&filterRuntime){a.tasks=a.tasks.filter(t=>!t.demo);a.companies=a.companies.filter(c=>!c.demo);}return a;}
function task(s){const a=state(s);return a.tasks.find(t=>t.id===a.selectedTask)||null;}
function company(s){const a=state(s);return a.companies.find(c=>c.id===a.selectedCompany)||null;}
function stageDone(c,id){return id==='discover'?true:id==='website'?!!c.report:id==='enrich'?(c.discovery?!!c.discovery.checkedAt:!!c.email):id==='match'?(c.pipelineDone||[]).includes('match'):id==='content'?!!c.draft:id==='outreach'?!!c.sentReceipt:id==='reply'?c.stop==='客户已回复':false;}
function rows(s,filter=true){const a=state(s),t=task(s),q=a.filter.query.toLowerCase();return a.companies.filter(c=>(!t||t.companyIds.includes(c.id))&&(!filter||(!q||[c.name,c.domain,c.country,c.product].join(' ').toLowerCase().includes(q))&&(!a.filter.status||(a.filter.status.startsWith('stage:')?stageDone(c,a.filter.status.slice(6)):a.filter.status==='email'?!!c.email:a.filter.status==='report'?!!c.report:a.filter.status==='missing'?!c.email:a.filter.status==='draft'?!!c.draft:a.filter.status==='stopped'?!!c.stop:false))));}
function counts(s){const a=state(s),t=task(s),cs=rows(s,false);return {records:t?.recordCount||0,companies:cs.length,contacts:cs.filter(c=>c.email||c.discovery?.phoneCount).length,reports:cs.filter(c=>c.report).length,drafts:cs.filter(c=>c.draft).length,scheduled:cs.filter(c=>c.schedule&&!c.stop).length,replies:cs.filter(c=>c.stop==='客户已回复').length,total:a.tasks.length};}
function selectedSources(s){return [...new Set((s.prospecting?.sources||['lga']).filter(id=>sourceIds.includes(id)))];}
function runtimeStatus(s,t=task(s)){
 if(!t)return {label:'尚未选择任务',detail:'创建或选择真实获客任务后查看结果。'};
 if(t.status==='已暂停')return {label:'已暂停',detail:'任务与已取得的客户资料保留，恢复后继续。'};
 if(s.runningTask===t.id)return {label:'后台处理中',detail:'正在查询和分析实际资料；可离开页面，从任务进度查看结果。'};
 if(s.failedTask?.id===t.id)return {label:'本次运行未完成',detail:s.failedTask.message||'已取得资料保留，可重试后台任务。'};
 const count=state(s).companies.filter(c=>t.companyIds.includes(c.id)).length;
 if(t.queryCompleted||t.discoveryQueried)return count?{label:'已有查询结果',detail:'已取得实际公司资料；各环节按报告、核验记录及实际回执统计。'}:{label:'无匹配结果',detail:'查询已完成，没有符合当前关键词与地区的公司。请调整关键词或地区后重试。'};
 if(count)return {label:'待后台分析',detail:'已有客户资料已保留，运行后台任务以继续检查和分析。'};
 if(s.discoveryStatus?.checking)return {label:'正在检查数据连接',detail:'正在核对云平台共享数据库连接状态。'};
 if(t.purpose!=='reactivate'&&t.sources?.includes('lga')&&s.discoveryStatus?.connected===false)return {label:'数据连接未就绪',detail:s.discoveryStatus.message||'云平台共享数据库暂不可用，请重试。'};
 return {label:'待运行查询',detail:'任务已保存，尚未取得后台查询结果。点击运行后台任务查看实际结果。'};
}
function validTimezone(value){try{assert(value,'请选择时区');new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}}
function reviewState(c){return c.stop?'已停止':c.review?.decision==='return'?'待修改':c.review?.decision==='approve'&&c.review.revision===(c.draft?.revision||1)?'已确认':'待审核';}
function readiness(c){return [...(!c.email?['缺少邮箱']:['邮箱未验证']),...(!c.report?['待背景分析']:[]),...(c.pipelineDone&&!c.pipelineDone.includes('match')?['待核对产品匹配']:[]),...(reviewState(c)!=='已确认'?['待人工确认']:[]),...(!c.draft?.timezone?['待收件人时区']:[]),...(c.stop?[c.stop]:[]),'Amail 未接入'];}
function sequence(t){return clone(t?.followup||{version:0,enabled:true,mode:'review',steps:[{delay:0,subject:'',body:''},{delay:3,subject:'',body:''},{delay:4,subject:'',body:''}]});}
const sample=()=>[
 {id:'ACQ-DEMO-01',name:'Northstar Components',country:'US',domain:'northstar.example',product:'精密金属零件 / metal parts',role:'工业零件进口商（合成）',email:'buyer@northstar.example',person:'采购负责人 · 姓名待核实',emailStatus:'演示地址，未验证',record:'DEMO-BOL-01',date:'2026-09-18',shipments:18,hs:'732690',fact:'合成提单记录包含金属零件，近一年样例记录 18 票。',fit:'可能存在小批量配套需求；仅凭采购品类，尚不能确认正在寻找新供应商。',unknown:'企业规模、决策人身份、当前采购计划与认证要求未核实。',report:true,demo:true,source:'lga'},
 {id:'ACQ-DEMO-02',name:'Harbor Industrial',country:'US',domain:'harbor.example',product:'精密金属零件 / metal parts',role:'工业用品分销商（合成）',email:'',person:'采购 / 产品经理待补全',emailStatus:'缺少邮箱',record:'DEMO-BOL-02',date:'2026-08-30',shipments:7,hs:'732690',fact:'合成记录含工业零件采购，样例记录 7 票。',fit:'产品用途可能相关；需先核对其销售产品线与材料规格。',unknown:'没有可核验的联系人、邮箱及企业规模。',report:true,demo:true,source:'lga'},
 {id:'ACQ-DEMO-03',name:'Cedar Fabrication',country:'US',domain:'cedar.example',product:'精密金属零件 / metal parts',role:'设备配套企业（合成）',email:'sourcing@cedar.example',person:'供应链负责人 · 姓名待核实',emailStatus:'演示地址，未验证',record:'DEMO-BOL-03',date:'2026-07-12',shipments:4,hs:'732690',fact:'合成资料显示设备配套及金属件需求，样例记录 4 票。',fit:'可从图纸定制能力切入；需求、交期与预算均需要询问。',unknown:'采购周期、供应商准入条件与实际决策权未知。',report:true,demo:true,source:'lga'}
];
function draftFor(s){return {subject:'A question about your metal parts sourcing',body:`Hello,\n\nWe supply ${text(s.company.draft.product)||'precision metal parts'}. We would like to understand whether your team is currently evaluating suppliers for these components.\n\nCould you share the specifications or direct us to the colleague responsible for sourcing?\n\nBest regards,\n${text(s.company.draft.name)||'Sales team'}`,mode:'review',timezone:'',hour:'09:00',days:'weekdays'};}
function pipeline(s,t=task(s)){
 if(!t)return [];const cs=state(s).companies.filter(c=>t.companyIds.includes(c.id));
 return stages.map((stage,index)=>{
  const count=cs.filter(c=>stageDone(c,stage.id)).length,run=t.run;
  let status=count?'已有结果':'等待前序',reason='';
  if(run){
   if(index<run.step){status='已完成';if(stage.id==='enrich'||stage.id==='match'){const n=cs.length-count;if(n){status='部分完成';reason=`${n} 家${stage.id==='enrich'?'待补邮箱，不阻断其他公司':'证据不足，待核对'}`;}}}
   else if(index===run.step){status=t.status==='已暂停'?'已暂停':index<5?'运行中':'等待条件';reason=index===5?'演示邮箱未验证，Amail 未接入；未执行发送':'';}
  }else if(!count&&index===(cs.length?1:0)){status=t.status==='已暂停'?'已暂停':'等待接入';reason=cs.length?'等待官网分析服务':'数据来源尚未接入';}
  if(!run&&stage.id==='website'&&cs.some(c=>c.discovery)){const checked=cs.filter(c=>c.discovery).length;status=count===cs.length?'已有报告':count?'部分有报告':'已检查';reason=`已检查 ${checked} 家；${checked-count} 家官网分析有缺项，查看背景了解原因`; }
  if(!run&&stage.id==='enrich'&&cs.some(c=>c.discovery)){status=count===cs.length?'已检查':'部分已检查';reason=`${cs.filter(c=>c.discovery?.contactStatus==='NONE').length} 家没有联系方式；有记录仍需核实`; }
  if(!run&&!cs.length&&t.discoveryQueried){status=index===0?'无匹配结果':'等待前序';reason='请调整关键词或目标地区';}
  if(s.runtime&&!count&&index===(cs.length?1:0)){const actual=runtimeStatus(s,t);status=actual.label;reason=actual.detail;}
  if(stage.id==='outreach'&&!count)reason=reason||'仅统计发送回执，草稿与排期不计入';
  if(stage.id==='reply'&&!count)reason='尚未收到客户回复';
  return {...stage,count,status,reason};
 });
}
function pending(s,now=Date.now()){return !s.paused&&!s.isolated&&state(s).tasks.some(t=>t.demo&&t.run&&t.run.step<5&&t.status!=='已暂停'&&t.run.nextAt<=now);}
function tick(s,a,now){
 for(const t of a.tasks){
  const run=t.run;if(!t.demo||!run||run.step>=5||t.status==='已暂停'||run.nextAt>now)continue;
  const id=stages[run.step].id;
  if(id==='discover'){
   t.records=sampleRecords.map(r=>({...r,id:t.id+'-'+r.id,...(r.company?{company:t.id+'-COMPANY-'+Number(r.company.slice(-2))}:{}),...(r.duplicateOf?{duplicateOf:t.id+'-'+r.duplicateOf}:{})}));t.recordCount=t.records.length;
   t.companyIds=sample().map((item,i)=>{
    const companyId=t.id+'-COMPANY-'+(i+1);
    if(!a.companies.some(c=>c.id===companyId))a.companies.push({...item,id:companyId,record:t.id+'-'+item.record,report:false,email:'',person:'待富化',emailStatus:'等待联系人富化',fit:'等待产品匹配',pipelineDone:['discover']});
    return companyId;
   });
  }else for(const [i,companyId] of t.companyIds.entries()){
   const c=a.companies.find(c=>c.id===companyId),fixture=sample()[i];if(!c)continue;
   if(id==='website')c.report=true;
   if(id==='enrich'){c.email=fixture.email;c.person=fixture.person;c.emailStatus=fixture.emailStatus;}
   if(id==='match'){c.fit=fixture.fit;if(i!==1)c.pipelineDone.push('match');else c.fit='样例中产品用途与供货范围证据不足，待核对后再决定是否进入联络。';}
   if(id==='content'&&stageDone(c,'match')&&!c.stop)c.draft=c.draft||draftFor(s);
  }
  run.events.push({stage:id,time:new Date(now).toISOString(),message:id==='discover'?'5 条合成记录，去重并排除货代后保留 3 家公司':id==='enrich'?'2 家获得合成邮箱，1 家待补；未进行真实验证':id==='match'?'2 家通过样例匹配，1 家证据不足待核对':id==='content'?'2 家生成本地草稿；触达等待服务与邮箱条件':'3 家完成合成官网分析，未访问真实网站'});
  run.step++;run.nextAt=now+2500;t.status=run.step<5?'自动演示运行中':'等待触达条件';
 }
}
function apply(s,type,p={}){
 assert(!s.runtime||!['acqDemo','acqRunDemo','acqTick','acqReply'].includes(type),'正式工作台只处理真实资料；演示请进入原型审核页');
 const a=state(s,false),t=a.tasks.find(t=>t.id===a.selectedTask),c=a.companies.find(c=>c.id===(p.id||a.selectedCompany));
 if(type==='acqCreate'){
  const keyword=text(p.keyword,160),regions=Object.keys(p).filter(k=>k.startsWith('region:')&&p[k]==='on').map(k=>k.slice(7));
  assert(keyword,'请填写产品关键词');assert(regions.length&&regions.every(id=>Object.hasOwn(markets,id)),'请选择有效的目标地区');
  const limit=Number(p.limit||50);assert(Number.isInteger(limit)&&limit>=1&&limit<=200,'目标公司数请输入 1–200');
  const language=['en','zh','ja','es','ar','ru'].includes(p.language)?p.language:'en',cadence=p.cadence==='daily'?'daily':'once',scheduleTimezone=text(p.scheduleTimezone,80),scheduleHour=text(p.scheduleHour||'09:00',5);
  if(cadence==='daily'){assert(validTimezone(scheduleTimezone),'每日任务请选择有效的执行时区');assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleHour),'每日任务请选择有效的执行时间');}
  const id='TASK-'+(++s.sequence),sources=selectedSources(s),purpose=p.purpose==='reactivate'?'reactivate':'new';
  const matches=purpose==='reactivate'?a.companies.filter(c=>c.source==='crm'&&regions.includes(c.country)&&[c.name,c.product,c.fact].join(' ').toLowerCase().includes(keyword.toLowerCase())).slice(0,limit):[];
  a.tasks.unshift({id,name:text(p.name,120)||keyword,keyword,buyerRoles:text(p.buyerRoles,300),searchTerms:text(p.searchTerms,500),language,mode:p.mode==='automatic'?'automatic':'review',cadence,scheduleTimezone:cadence==='daily'?scheduleTimezone:'',scheduleHour:cadence==='daily'?scheduleHour:'',regions,limit,sources,purpose,linkedin:p.linkedin==='on',status:matches.length?'待背景分析':'待接入数据',companyIds:matches.map(c=>c.id),recordCount:matches.length,created:new Date().toISOString(),demo:false});a.selectedTask=id;a.selectedCompany='';a.filter={query:'',status:''};
 }else if(type==='acqRunDemo'){
  const id='TASK-AUTO-'+(++s.sequence),now=Date.now();
  a.tasks.unshift({id,name:'精密金属零件',regions:['US'],limit:50,sources:['lga'],purpose:'new',status:'自动演示运行中',companyIds:[],recordCount:0,demo:true,created:new Date(now).toISOString(),run:{step:0,nextAt:now+1500,events:[]}});
  a.selectedTask=id;a.selectedCompany='';a.filter={query:'',status:''};
 }else if(type==='acqTick'){
  const now=Number(p.now??Date.now());assert(Number.isFinite(now)&&now>0,'演示时间无效');tick(s,a,now);
 }else if(type==='acqDemo'){
  let d=a.tasks.find(t=>t.id==='TASK-DEMO');
  if(!d){d={id:'TASK-DEMO',name:'精密金属零件',regions:['US'],limit:50,sources:['lga'],purpose:'new',status:'演示结果已就绪',companyIds:[...new Set(sampleRecords.filter(r=>!r.forwarder).map(r=>r.company))],records:clone(sampleRecords),recordCount:sampleRecords.length,demo:true};a.tasks.unshift(d);}
  for(const item of sample())if(!a.companies.some(c=>c.id===item.id))a.companies.push(item);
  a.selectedTask=d.id;a.selectedCompany=d.companyIds[0];a.filter={query:'',status:''};
 }else if(type==='acqSelectTask'){assert(a.tasks.some(t=>t.id===p.id),'任务不存在');a.selectedTask=p.id;a.selectedCompany='';a.filter={query:'',status:''};
 }else if(type==='acqFilter'){a.filter={query:text(p.query,160),status:['email','report','missing','draft','stopped',...stages.map(x=>'stage:'+x.id)].includes(p.status)?p.status:''};
 }else if(type==='acqOpenCompany'){assert(c,'请选择公司');a.selectedCompany=c.id;
 }else if(type==='acqSource'){assert(['lga','ads','social','website','crm'].includes(p.id),'来源不存在');a.source=p.id;
 }else if(type==='acqPause'){assert(t,'请选择任务');if(t.status!=='已暂停'){t.beforePause=t.status;t.status='已暂停';}
 }else if(type==='acqResume'){assert(t,'请选择任务');if(t.status==='已暂停'){t.status=t.beforePause||'待接入数据';delete t.beforePause;if(t.run)t.run.nextAt=Date.now()+1500;}
 }else if(type==='acqReview'){
  assert(t,'请先选择任务');assert(['approve','return'].includes(p.decision),'请选择审核操作');
  const ids=[...new Set(Array.isArray(p.ids)?p.ids:[])];assert(ids.length,'请勾选需要审核的邮件');
  const selected=ids.map(id=>a.companies.find(c=>c.id===id&&t.companyIds.includes(id)));
  assert(selected.every(c=>c?.draft&&!c.stop&&!c.schedule),'所选邮件包含其他任务、无草稿、已停止或已安排的客户，请重新选择');
  const note=text(p.note,500);assert(p.decision!=='return'||note,'退回修改请填写原因');
  for(const item of selected){const event={decision:p.decision,revision:item.draft.revision||1,note,at:new Date().toISOString()};item.review=event;item.reviewHistory=[...(item.reviewHistory||[]),event].slice(-50);}
  a.reviewNotice=`${ids.length} 封邮件${p.decision==='approve'?'已确认内容':'已退回修改'}；没有发送邮件。`;
 }else if(type==='acqSaveSequence'){
  assert(t&&p.id===t.id,'任务已切换，请重新打开当前任务的跟进设置');
  const count=Number(p.count);assert(Number.isInteger(count)&&count>=0&&count<=2,'请选择 0–2 次跟进');
  const steps=[{delay:0,subject:'',body:''}];
  for(let i=1;i<=count;i++){const delay=Number(p['delay'+i]);assert(Number.isInteger(delay)&&delay>=1&&delay<=90,`第 ${i} 次跟进间隔请输入 1–90 天`);steps.push({delay,subject:text(p['subject'+i],200),body:text(p['body'+i],2000)});}
  t.followup={version:(t.followup?.version||0)+1,enabled:p.enabled==='on',mode:p.mode==='automatic'?'automatic':'review',steps};
 }else if(type==='acqImport'){
  const name=text(p.name,120),domain=text(p.domain,200).toLowerCase(),reference=text(p.reference,500),country=text(p.country,2),evidence=text(p.evidence,1500);
  assert(name&&reference&&Object.hasOwn(markets,country),'请填写公司名称、有效国家和来源位置');assert(!domain||/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain),'公司域名请只填写域名，例如 example.com');
  const duplicate=a.companies.find(c=>domain&&c.domain===domain&&c.country===country||!domain&&c.name===name&&c.reference===reference&&c.country===country);
  if(duplicate){a.selectedCompany=duplicate.id;a.importNotice='已匹配已有客户，保留原记录，没有重复新增。';}
  else{const id='ASSET-'+(++s.sequence);a.companies.push({id,name,country,domain,product:evidence,role:'已有客户资料',email:'',person:'待补全',fact:evidence||'尚未提供业务资料',fit:'尚未分析',unknown:'资料待独立核验',report:false,demo:false,source:'crm',reference});a.selectedCompany=id;a.importNotice='客户资料已保存，作为已有资产参与去重；未计入新增获客。';}
 }else{
  assert(c,'请先选择客户');
  if(type==='acqDraft'){
   assert(c.demo,'客户资料尚未连接 AI，请手工编辑研究后再准备邮件');
   c.draft=c.draft||{subject:'A question about your metal parts sourcing',body:`Hello,\n\nWe supply ${text(s.company.draft.product)||'precision metal parts'}. We would like to understand whether your team is currently evaluating suppliers for these components.\n\nCould you share the specifications or direct us to the colleague responsible for sourcing?\n\nBest regards,\n${text(s.company.draft.name)||'Sales team'}`,mode:'review',timezone:'',hour:'09:00',days:'weekdays'};a.selectedCompany=c.id;
  }else if(type==='acqSaveDraft'){
   assert(c.draft,'请先生成草稿');assert(!c.schedule||c.stop,'请先停止演示排期，再修改草稿');
   assert(text(p.subject,200)&&text(p.body,4000),'请填写邮件主题和正文');
   const tz=text(p.timezone,80);if(tz)try{new Intl.DateTimeFormat('en',{timeZone:tz});}catch{throw Error('请选择有效的收件人时区');}
   assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(p.hour),'请选择有效的发送时间');
   const previous=c.draft;
   const next={subject:text(p.subject,200),body:text(p.body,4000),mode:p.mode==='automatic'?'automatic':'review',timezone:tz,hour:p.hour,days:'weekdays'};
   const changed=Object.keys(next).some(key=>next[key]!==previous[key]);c.draft={...next,revision:(previous.revision||1)+(changed?1:0)};if(changed)delete c.review;
  }else if(type==='acqSchedule'){
   assert(c.demo,'本原型只对合成客户演示排期');assert(c.email,'缺少邮箱，请先补全联系人');assert(c.draft,'请先生成草稿');assert(!c.stop,'该客户已停止联系，不能安排跟进');assert(c.draft.timezone,'请先选择并保存收件人时区');
   c.schedule=c.schedule||{id:'PREVIEW-'+c.id,timezone:c.draft.timezone,hour:c.draft.hour,mode:c.draft.mode,status:'仅演示，未提交 Amail'};
  }else if(type==='acqStop'||type==='acqReply'){
   assert(c.demo,'演示事件只用于合成客户');c.stop=type==='acqReply'?'客户已回复':'手动停止';if(c.schedule)c.schedule.status='已停止';
  }
 }
 s.acquisition=a;
}
const api={actions,state,task,company,rows,counts,selectedSources,runtimeStatus,stages,pipeline,pending,reviewState,readiness,sequence,apply};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGAAcquisition=api;
})(typeof globalThis!=='undefined'?globalThis:this);
