(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),clean=(x,n=500)=>String(x??'').trim().slice(0,n);
const check=(ok,message)=>{if(!ok)throw Error(message);};
const L=typeof module!=='undefined'&&module.exports?require('./site-languages.js'):root.LGASiteLanguages;
const A=typeof module!=='undefined'&&module.exports?require('./acquisition.js'):root.LGAAcquisition;
const markets=Object.keys(L.markets).map(id=>({id,zh:L.name(id,'zh-CN','region')}));
const sources=[
 {id:'lga',name:'LGA 客户数据',detail:'海关贸易记录找买家，企业与联系人资料补全背景',page:'leads'},
 {id:'ads',name:'我的广告线索',detail:'广告表单留下的客户；点击量和花费不算客户',page:'ads'},
 {id:'social',name:'我的社媒线索',detail:'客户私信、咨询与留资；点赞量不算客户',page:'social-channels'},
 {id:'website',name:'我的网站询盘',detail:'网站表单与主动咨询；匿名访问不算客户',page:'website-publish'},
 {id:'crm',name:'我的客户名单',detail:'已有询盘、CRM 与客户资料，继续发现合作机会',page:'inbox'}
];
const suppliers=[['腾道','贸易数据 / 企业资料'],['ImportGenius','海关贸易记录'],['Panjiva','供应链与贸易记录'],['特易资讯','外贸与海关数据'],['国贸通','外贸数据'],['外贸邦','贸易与企业资料'],['Apollo','企业与商务联系人'],['RocketReach','商务联系人'],['ImportYeti','美国海运进口记录']];
function settings(s){return copy({sources:['lga'],filters:{keyword:'',country:'',months:'12',buyerOnly:true},searched:false,resultIds:[],...s.prospecting});}
function sourceName(id){return sources.find(x=>x.id===id)?.name||'历史资料';}
function buyerProfile(s){
 const d=s.company.draft,words=d.product+' '+d.strength,markets=L.settings(s).markets;
 let kind='待核对客户类型',buyers='优先确认会使用或销售该产品的企业',use='先补充产品用途、材料与供货方式',keywords=[d.product],roles='采购或业务负责人',hs='产品信息不足，暂不建议 HS 编码';
 if(/零件|加工|machin|metal parts|precision/i.test(words)){
  kind='制造与配套采购';buyers='设备制造商、系统集成商、工业零件进口商';use='设备配套、替换零件、小批量试制';keywords=[d.product,'machined metal parts','metal brackets'];roles='采购经理、工程/技术负责人';hs='材料与用途待确认；732690 仅可作其他钢铁制品的候选方向，不能直接认定适用';
 }else if(/服务|设计|咨询|software|consult/i.test(words)){
  kind='企业服务采购';buyers='有产品开发、设计或专业服务需求的企业';use='新产品开发、项目协作、专业能力补充';keywords=[d.product,'industrial design'];roles='产品负责人、研发负责人、采购负责人';hs='服务采购通常不通过货物海关记录识别，优先企业项目资料与自有询盘';
 }else if(/设备|机床|machine|equipment/i.test(words)){
  kind='设备采购与经销';buyers='设备进口商、经销商、具备相关工艺的制造企业';use='产线建设、设备更新与加工能力扩充';keywords=[d.product,'industrial machinery'];roles='设备采购、生产或技术负责人';hs='需先确认设备功能、加工对象和型号，再确定 HS 编码';
 }
 const shortTrial=/小批量|试制|试样|small batch|prototype/i.test(d.strength);
 return {kind,buyers,use,roles,keywords:keywords.filter(Boolean),hs,markets,country:markets[0]||'',months:'12',buyerOnly:true,
  dataRoute:kind==='企业服务采购'?'企业业务与项目需求资料、自有询盘；海关记录仅作补充':'LGA 客户数据：先查同类商品贸易记录，再核对企业业务与联系人',
  priority:shortTrial?'优先有试制/配套需求的中小型制造买家；企业规模仍需外部资料核对':'先验证业务适配，再判断采购规模',
  exclusions:'排除已识别货代；核对主营无关企业，避免把物流公司当买家',
  basis:[`产品：${d.product||'未填写'}`,`强项：${d.strength||'未填写'}`,`业务边界：${d.constraint||'未填写'}`,`目标市场：${markets.map(id=>L.name(id,'zh-CN','region')).join('、')||'尚未选择'}`],companyRevision:s.company.revision};
}
function provenance(c){return c.provenance||{sourceId:'legacy',provider:'历史演示资料',upstream:c.source||'未记录',recordId:c.source||c.id,date:'未记录',collected:'未记录',coverage:c.region||'未知',method:'旧版本样例，待补来源',isDemo:true};}
function samples(s){
 const rows=[
  ['BUY-DEMO-01','Northstar Components · 示例买家','US','美国','进口商 / 待核验','2026-09-18',18,'精密金属零件 / machined metal parts','732690','buyer@northstar.example'],
  ['BUY-DEMO-02','Harbor Industrial · 示例买家','US','美国','进口商 / 待核验','2026-04-22',7,'金属支架 / metal brackets','732690',''],
  ['BUY-DEMO-03','Ocean Transit · 示例货代','US','美国','物流 / 货代','2026-10-01',32,'机械零件 / machinery parts','848790','']
 ];
 return rows.map(([id,name,country,region,role,date,count,product,hs,contact])=>({id,name,country,region,role,contact,status:'CANDIDATE',companyRevision:s.company.revision,isTest:true,license:'ALLOW',permission:true,
  product,hs,lastTrade:date,shipments:count,isForwarder:id==='BUY-DEMO-03',sourceId:'lga',
  evidence:`合成贸易样例：商品“${product}”，最近记录 ${date}，样例范围内 ${count} 票。`,
  hypothesis:`需用“${s.company.draft.product}”与记录中的商品描述、规格和用途核对；同类商品仅表示潜在适配，不代表当前采购需求。`,
  unknown:'实际买家身份、具体规格、当前需求及联系人任职仍待核实',
  nextStep:'核对官网业务与采购角色，再询问规格、数量和采购计划。',
  provenance:{sourceId:'lga',provider:'LGA 本地合成样例（非供应商返回）',upstream:'模拟美国海运进口提单字段；无真实上游记录',recordId:'DEMO-BOL-'+id.slice(-2),date,collected:'2026-10-21',coverage:'美国 / 海运进口 / 固定样例',method:'合成演示；未调用海关或商业接口',isDemo:true}
 }));
}
function resultRows(s){const p=settings(s);return p.searched?p.resultIds.map(id=>s.leads.candidates.find(x=>x.id===id)).filter(Boolean):[...s.leads.candidates].sort((a,b)=>(b.lastTrade||'').localeCompare(a.lastTrade||'')||(b.shipments||0)-(a.shipments||0));}
const actions=new Set([...A.actions,'saveProspectSources','adoptProspectSuggestion','searchProspects','saveProspectNext','prepareAmail','addOwnProspect']);
function apply(s,type,p){
 if(A.actions.has(type)){A.apply(s,type,p);return;}
 const cfg=settings(s);
 if(type==='saveProspectSources'){
  check(Array.isArray(p.ids)&&p.ids.every(id=>sources.some(x=>x.id===id)),'请选择有效线索来源');
  cfg.sources=[...new Set(p.ids)];cfg.searched=false;s.prospecting=cfg;return;
 }
 if(type==='adoptProspectSuggestion'){
  const profile=buyerProfile(s);cfg.filters={keyword:profile.keywords[0]||'',country:profile.country,months:profile.months,buyerOnly:profile.buyerOnly};
  cfg.suggestionRevision=profile.companyRevision;cfg.searched=false;s.prospecting=cfg;return;
 }
 if(type==='searchProspects'){
  check(cfg.sources.length,'先选择至少一个线索来源');check(p.demo===true,'数据服务尚未接通，请使用明确标记的示例体验');
  const keyword=clean(p.keyword,100),country=clean(p.country,2),months=String(p.months||'12');
  check(!country||Object.hasOwn(L.markets,country),'请选择列表中的市场');check(['3','6','12','24'].includes(months),'请选择有效时间范围');
  cfg.filters={keyword,country,months,buyerOnly:p.buyerOnly!==false};
  cfg.goal=clean(p.goal,1500)||`根据 ${s.company.draft.name} 的产品与供货能力，寻找适合联系的买家。`;
  const cutoff=new Date('2026-10-21T00:00:00Z');cutoff.setUTCMonth(cutoff.getUTCMonth()-Number(months));
  const incoming=cfg.sources.includes('lga')?samples(s):[];
  // Preserve decisions and customer-added data. Only refresh untouched sample candidates.
  for(const item of incoming){const old=s.leads.candidates.find(x=>x.id===item.id);if(!old)s.leads.candidates.push(item);else if(old.status==='CANDIDATE')Object.assign(old,item);}
  const matches=s.leads.candidates.filter(c=>cfg.sources.includes(c.sourceId)&&c.status!=='DISCARDED'&&(!country||c.country===country)&&(!cfg.filters.buyerOnly||!c.isForwarder)&&(!keyword||(c.product+' '+c.hs+' '+c.name+' '+(c.evidence||'')).toLowerCase().includes(keyword.toLowerCase()))&&(!c.lastTrade||new Date(c.lastTrade+'T00:00:00Z')>=cutoff));
  matches.sort((a,b)=>(b.lastTrade||'').localeCompare(a.lastTrade||'')||(b.shipments||0)-(a.shipments||0));
  cfg.resultIds=matches.map(c=>c.id);cfg.searched=true;cfg.asOf='2026-10-21';
  cfg.searchTrace=[
   {tool:'企业画像分析',state:'本地规则演示',detail:`依据公司资料第 ${s.company.revision} 版；检索目标已保留。`},
   {tool:'海关贸易检索工具',state:cfg.sources.includes('lga')?'未调用真实接口':'本轮未选择',detail:cfg.sources.includes('lga')?'使用 3 条固定合成记录演示；自然语言目标尚未由模型解析。':'未使用 LGA 合成贸易记录。'},
   {tool:'企业官网 / 联系人核验工具',state:'待接入',detail:'没有声称已核对企业官网或真实联系人。'},
   {tool:'筛选、去重与来源整理',state:'本地处理完成',detail:`按下方检索计划处理，返回 ${matches.length} 家；已有跟进机会保持不变。`}
  ];
  s.prospecting=cfg;return;
 }
 if(type==='addOwnProspect'){
  const name=clean(p.name,120),evidence=clean(p.evidence,1500),reference=clean(p.reference,600),date=clean(p.date,10),country=clean(p.country,2);
  check(name&&evidence&&reference,'请填写公司名称、需求或业务资料及来源位置');
  check(Object.hasOwn(L.markets,country),'请选择客户所在国家');
  check(/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date&&date<=new Date().toISOString().slice(0,10),'请填写有效的资料日期（不能在未来）');
  const existing=s.leads.candidates.find(c=>c.sourceId==='crm'&&c.name===name&&c.provenance?.recordId===reference);
  check(!existing,'这家公司及来源已在名单中，请继续跟进已有记录');
  const id='OWN-'+(++s.sequence);
  s.leads.candidates.push({id,name,country,region:L.name(country,'zh-CN','region'),role:'客户提供 / 角色待核实',sourceId:'crm',status:'CANDIDATE',license:'ALLOW',permission:false,isTest:false,companyRevision:s.company.revision,contact:'',product:'',hs:'',evidence,hypothesis:`根据提供的资料，需进一步核对与“${s.company.draft.product}”的适配性。`,unknown:'资料真实性、当前需求和联系方式待核对',nextStep:'核对业务资料与客户需求，补充商务联系人。',provenance:{sourceId:'crm',provider:'客户自行提供',upstream:reference,recordId:reference,date,collected:new Date().toISOString().slice(0,10),coverage:'本公司提供的单条客户资料',method:'人工录入，未经独立核验',isDemo:false}});
  if(!cfg.sources.includes('crm'))cfg.sources.push('crm');cfg.searched=false;s.prospecting=cfg;return;
 }
 const c=s.leads.candidates.find(x=>x.id===(p.id||s.leads.selected));check(c&&c.status==='ACCEPTED','先选择要跟进的客户');
 if(type==='saveProspectNext'){check(clean(p.next),'请填写下一步安排');c.nextStep=clean(p.next,1500);return;}
 if(type==='prepareAmail'){
  check(!s.leads.suppressions.some(x=>x.candidate===c.id),'这位客户已停止联系');
  check(c.companyRevision===s.company.revision,'公司资料已变化，请先重新核对客户匹配依据');
  // Only stable cross-product references. Drafts and email status belong to Amail.
  c.amailRef=c.amailRef||{taskId:`${s.tenant}:${c.id}`,conversationId:null};return;
 }
}
const api={sources,suppliers,settings,sourceName,provenance,resultRows,buyerProfile,markets,actions,apply,acquisition:A};
if(typeof module!=='undefined')module.exports=api;else root.LGAProspecting=api;
})(typeof globalThis!=='undefined'?globalThis:this);
