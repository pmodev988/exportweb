(function(root){
'use strict';
const local=typeof module!=='undefined'&&module.exports,L=local?require('./site-languages.js'):root.LGASiteLanguages,SC=local?require('./sitemap-catalog.js'):root.LGASitemapCatalog;
const copy=x=>JSON.parse(JSON.stringify(x)),text=(v,max=3000)=>String(v??'').trim().slice(0,max),check=(ok,m)=>{if(!ok)throw Error(m);};
const channels=[
 ['linkedin','LinkedIn','专业观点、产品用途与企业合作','Professional insights, product applications and business relationships','图文 / 专业短片','Posts / expert clips'],
 ['youtube','YouTube','演示、使用方法与技术讲解','Demonstrations, how-to content and technical explanations','长视频 / Shorts','Video / Shorts'],
 ['facebook','Facebook','品牌动态、社区互动与客户咨询','Brand updates, community interaction and inquiries','图文 / 视频','Posts / video'],
 ['instagram','Instagram','产品视觉、项目与设计细节','Product visuals, projects and design details','图片 / Reels','Images / Reels'],
 ['tiktok','TikTok','用短视频说明产品怎样使用','Show product use in short videos','竖屏短视频','Vertical video'],
 ['x','X','专业动态与公开讨论','Industry updates and public discussion','短文 / 图片','Short posts / images'],
 ['line','LINE','通过官方账号向关注者发送消息','Send messages to followers of your Official Account','官方账号消息','Official Account messages'],
 ['wechat-video','微信视频号','产品讲解与已有客户关系维护','Product explanations and existing customer relationships','视频 / 直播素材','Video / live assets'],
 ['wechat','微信公众号','产品知识、案例与长期订阅内容','Product knowledge, cases and subscriber content','图文','Articles'],
 ['douyin','抖音','使用场景、操作演示与短视频内容','Use cases, demonstrations and short videos','竖屏短视频','Vertical video'],
 ['red','小红书','应用体验、项目灵感和视觉内容','Application experiences, project ideas and visual content','图文 / 短视频','Posts / short video'],
 ['bilibili','B站','较长的产品演示与技术说明','Longer product demonstrations and technical explanations','讲解视频','Explainer video']
].map(([id,name,zh,en,format,formatEn])=>({id,name,zh,en,format,formatEn,connection:'NOT_CONNECTED'}));
// Fixed official destinations, never URLs supplied by account/profile inputs.
const channelLogins=Object.freeze({
 linkedin:'https://www.linkedin.com/login',youtube:'https://studio.youtube.com/',
 facebook:'https://www.facebook.com/login/',instagram:'https://www.instagram.com/accounts/login/',
 tiktok:'https://www.tiktok.com/login',x:'https://x.com/i/flow/login',line:'https://manager.line.biz/',
 'wechat-video':'https://channels.weixin.qq.com/',wechat:'https://mp.weixin.qq.com/',
 douyin:'https://creator.douyin.com/',red:'https://creator.xiaohongshu.com/',
 bilibili:'https://passport.bilibili.com/login'
});
const channelLogin=id=>Object.hasOwn(channelLogins,id)?channelLogins[id]:'';
const sources=[
 ['company','公司与产品资料','Company and product materials','first','能力与事实依据','Capabilities and claims','已有本地资料；不等于独立核验','Local material, not independent verification'],
 ['crm','历史询盘与 CRM','Past inquiries and CRM','first','客户需求与商机反馈','Customer needs and opportunity feedback','客户授权的数据，需保留访问边界','Customer-authorized records with access boundaries'],
 ['public','企业官网','Company websites','research','企业业务与公开需求线索','Business context and public demand signals','需逐站检查访问与本次使用范围','Access and purpose must be checked per source'],
 ['industry','行业目录与展会','Industry directories and trade shows','research','行业与企业候选','Industry and company candidates','目录公开不等于可转售或群发','A public directory does not authorize resale or outreach'],
 ['licensed','企业资料服务','Company data services','research','企业资料与联系人候选','Company and contact candidates','平台许可 / 客户自购授权须分别核对','Verify platform licenses or customer-owned access'],
 ['search','搜索与 Search Console','Search and Search Console','measure','搜索需求与站点查询表现','Search demand and site query performance','范围、时间、国家/语言需要一致','Align scope, dates, country and language'],
 ['analytics','网站与表单统计','Website and form analytics','measure','访问、询盘与转化链路','Visits, inquiries and conversion paths','真实事件去重，演练数据排除','Deduplicate real events and exclude demonstrations'],
 ['ad-report','广告账户报告','Ad account reports','measure','实际广告花费与平台转化','Actual spend and platform conversions','币种、归因窗口、账号主体需核对','Verify currency, attribution window and account owner'],
 ['mail','会话与销售记录','Conversations and sales records','first','报价、反馈、销售阶段','Quotes, feedback and sales stages','限定账号/线程权限，保留原话','Respect account/thread access and retain original messages']
].map(([id,zh,en,group,purpose,purposeEn,note,noteEn])=>({id,zh,en,group,purpose,purposeEn,note,noteEn}));
const connections=[
 ['amail','AI Web Mail / 企业邮箱','Email','邮件、附件、会话与发送状态','Email, attachments, threads and send status'],
 ['form','网站表单','Website forms','询盘接收、分派与跟进','Inquiry intake, assignment and follow-up'],
 ['whatsapp','WhatsApp Business','WhatsApp Business','业务消息；需合适的企业账号与权限','Business messages with eligible accounts and permissions'],
 ['line','LINE','LINE','按官方账号能力收发消息','Messages through supported official account capabilities'],
 ['telegram','Telegram','Telegram','获准 Bot 或账号范围内的业务会话','Business conversations within approved bot/account scope'],
 ['messenger','Messenger','Messenger','企业主页的客户会话','Customer conversations for business pages'],
 ['wecom','企业微信','WeCom','按企业授权与官方能力接入','Subject to enterprise authorization and supported APIs']
].map(([id,zh,en,detail,detailEn])=>({id,zh,en,detail,detailEn,state:'NOT_CONNECTED'}));
const templateRows=[
 ['catalog','产品目录','Product catalog','产品分类与选型','Product discovery and selection',['产品中心','行业应用','案例','资料中心','关于我们'],['Products','Applications','Cases','Resources','About']],
 ['custom','定制制造','Custom manufacturing','从能力到图纸与方案','From capabilities to requirements and proposals',['制造能力','定制流程','品质控制','项目案例','关于我们'],['Capabilities','Custom process','Quality','Projects','About']],
 ['solution','行业解决方案','Industry solutions','从客户问题进入方案','Start with the customer problem',['行业场景','解决方案','相关产品','项目案例','服务支持'],['Industries','Solutions','Products','Projects','Support']],
 ['brand','品牌与项目','Brand and projects','按场景、系列与项目展示','Present spaces, collections and projects',['产品系列','应用空间','项目案例','设计工艺','品牌介绍'],['Collections','Spaces','Projects','Design','Brand']],
 ['technical','技术材料','Technical materials','适配条件、资料与样品','Fit, technical documents and samples',['产品规格','应用方案','技术资料','测试案例','供货服务'],['Specifications','Applications','Documents','Testing','Services']],
 ['service','专业服务','Professional services','服务范围、流程与预约','Scope, process and appointments',['服务项目','合作流程','项目案例','知识中心','团队介绍'],['Services','Process','Cases','Insights','Team']],
 ['launch','新品推广','Product launch','聚焦产品、演示与咨询','Focus on a product, demo and inquiry',['核心产品','产品演示','常见问题','合作方式'],['Product','Demo','FAQ','Partnership']],
 ['starter','精简起步','Simple starter','先讲清公司、产品和联系方法','Explain the company, offering and contact route',['产品与服务','公司介绍','常见问题'],['Products and services','About','FAQ']]
];
const legacyTemplates=templateRows.map(([id,zh,en,why,whyEn,titles,titlesEn])=>({id,zh,en,why,whyEn,titles,titlesEn}));
const templates=SC.templates;
const templateById=id=>templates.find(t=>t.id===id)||legacyTemplates.find(t=>t.id===id);
function mapNodes(id){
 if(SC.templates.some(t=>t.id===id))return SC.nodes(id);
 const t=templateById(id);check(t,'请选择网站地图模板');
 const nodes=[{id:'hero',parent:'',title:'首页',titleEn:'Home',path:'/',purpose:'说明公司与产品价值',visible:true}];
 t.titles.forEach((title,i)=>{const key=i===0?'capability':'page-'+(i+1);nodes.push({id:key,parent:'',title,titleEn:t.titlesEn[i],path:'/'+key+'/',purpose:'说明'+title+'，引导客户咨询',visible:true});if(i===0&&id!=='starter')nodes.push({id:'detail',parent:key,title:'详情页模板',titleEn:'Detail page template',path:'/'+key+'/detail/',purpose:'按单个产品或服务填写内容，不虚构型号和参数',visible:true});});
 nodes.push({id:'contact',parent:'',title:'联系我们',titleEn:'Contact',path:'/contact/',purpose:'收集真实需求并分派负责人',visible:true});return nodes;
}
const config=s=>copy({revision:0,channels:[],channelAccounts:{},sources:[],connections:[],evidence:[],ad:{},analysis:null,quotes:[],...s.growth});
const channelAccount=(s,id)=>({account:'',profile:'',status:'NOT_CONNECTED',...config(s).channelAccounts[id]});
const socialTargets=s=>Array.isArray(s.social.targets)?s.social.targets:channels.filter(x=>x.name===s.social.channel).map(x=>x.id);
function orderedChannels(s){
 const selected=config(s).channels,suggested=recommendation(s).channels;
 const rank=x=>selected.includes(x.id)?0:suggested.includes(x.id)?1:2;
 return [...channels].sort((a,b)=>rank(a)-rank(b));
}
const map=s=>{const m=copy(s.site.sitemap||{revision:0,template:'',nodes:[],history:[]});if(!m.appliedNodes&&m.appliedRevision!==undefined){const applied=m.appliedRevision===m.revision?m:m.history.find(h=>h.revision===m.appliedRevision);if(applied)m.appliedNodes=copy(applied.nodes);}return m;};
const contextKey=s=>JSON.stringify({tenant:s.tenant,company:s.company.revision,siteRevision:s.site.revision,mapRevision:map(s).revision,direction:s.direction.selected,markets:L.settings(s).markets,languages:L.settings(s).enabled,channels:config(s).channels,sources:config(s).sources,evidence:config(s).evidence});
const recordKey=(s,m)=>JSON.stringify({tenant:s.tenant,company:s.company.revision,record:m,stops:s.leads.suppressions.filter(x=>x.candidate===m.candidate)});
const open=m=>!m.replyReceipt&&!['CLOSED','STOPPED'].includes(m.status);
function recommendation(s){
 const c=s.company.draft,words=c.product+' '+c.strength,service=/服务|咨询|设计|培训|software|consult/i.test(words),custom=/定制|加工|零件|OEM|ODM|machining|custom/i.test(words);
 const domestic=L.settings(s).markets.length>0&&L.settings(s).markets.every(id=>id==='CN');
 return {template:service?'industry-professional':custom?'industry-precision':'industry-machinery',channels:domestic?['wechat','wechat-video']:['linkedin','youtube'],sources:['company','crm','public','search'],
  basis:{companyRevision:s.company.revision,product:c.product,strength:c.strength,markets:L.settings(s).markets},status:'HYPOTHESIS',
  reason:service?['先说明服务范围，再用案例与交流推进需求。','Explain service scope, then use cases and conversations to develop needs.']:custom?['先展示制造能力和合作流程，再收集具体用途与图纸需求。','Show manufacturing capabilities and process, then collect applications and requirements.']:['先让客户看懂产品与用途，再进入适配和销售咨询。','Explain products and applications before fit and sales discussions.']};
}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function validList(values,rows){check(Array.isArray(values)&&values.every(id=>rows.some(r=>r.id===id)),'请选择列表中的有效项目');return [...new Set(values)];}
function touch(s,g){g.revision++;s.growth=g;}
function normalizeSitemapPath(value){let path=String(value??'').trim().toLowerCase();if(path&&!path.startsWith('/'))path='/'+path;if(path&&!path.endsWith('/'))path+='/';return path;}
function validSitemapPath(path){return path.length<=160&&/^\/(?:[a-z0-9-]+\/)*$/.test(path);}
function checkField(ok,field,message){if(!ok)throw Object.assign(new Error(message),{field});}
function validateNodes(nodes){
 check(nodes.some(n=>n.id==='hero'&&n.visible&&!n.parent&&n.path==='/')&&nodes.some(n=>n.id==='contact'&&n.visible),'保留首页与联系入口');
 check(new Set(nodes.map(n=>n.id)).size===nodes.length,'页面标识不能重复');
 for(const n of nodes){checkField(n.title,'title','请填写栏目名称。');checkField(n.path,'path','请填写页面路径，例如 /products/。');checkField(n.path.length<=160,'path','页面路径不能超过 160 个字符。');checkField(validSitemapPath(n.path),'path','页面路径仅支持英文字母、数字、连字符和 /，例如 /products/model-a/。');let current=n,seen=new Set([n.id]);while(current.parent){check(!seen.has(current.parent),'页面不能循环嵌套');seen.add(current.parent);current=nodes.find(x=>x.id===current.parent);check(current,'父页面不存在');check(!n.visible||current.visible,'先显示父页面，再显示子页面');check(seen.size<=3,'页面最多三级，保持导航清楚');}}
 checkField(new Set(nodes.map(n=>n.path)).size===nodes.length,'path','页面路径重复，已被其他栏目使用，请换一个路径。');
}
function sitemapMoveTargets(nodes,id){
 const n=nodes.find(x=>x.id===id);check(n,'页面不存在');
 if(n.id==='hero')return {up:'',down:''};
 const siblings=nodes.filter(x=>x.parent===n.parent&&(n.parent||(x.navPlacement||'header')===(n.navPlacement||'header'))&&x.id!=='hero'),index=siblings.findIndex(x=>x.id===id);
 return {up:siblings[index-1]?.id||'',down:siblings[index+1]?.id||''};
}
function numberedNodes(input){
 const nodes=copy(input);check(new Set(nodes.map(n=>n.id)).size===nodes.length,'页面标识不能重复');
 const seen=new Set();
 function visit(parent,prefix,depth){const siblings=nodes.filter(n=>n.parent===parent&&(parent||(n.navPlacement||'header')===(prefix==='F'?'footer':'header')));check(siblings.length<=999,'同级菜单不能超过 999 项');
  for(const [index,n] of siblings.entries()){check(!seen.has(n.id)&&depth<=3,'页面最多三级，且不能循环嵌套');seen.add(n.id);n.menuCode=prefix+String(index+1).padStart(3,'0');n.path=n.id==='hero'?'/':'/'+n.menuCode.toLowerCase()+'/';visit(n.id,n.menuCode,depth+1);}
 }
 visit('','M',1);visit('','F',1);check(seen.size===nodes.length,'父页面不存在或页面循环嵌套');return nodes;
}
function mapChange(s,nodes,template=map(s).template,auto=false){const old=map(s),numbering=auto?'hierarchy':old.numbering||'';if(numbering==='hierarchy')nodes=numberedNodes(nodes);validateNodes(nodes);s.site.sitemap={...old,numbering,revision:old.revision+1,template,nodes,history:[...old.history,{revision:old.revision,template:old.template,nodes:old.nodes,blocks:copy(s.site.blocks),design:copy(s.site.design||null)}]};}
function descendants(nodes,id){const result=new Set([id]);let changed=true;while(changed){changed=false;for(const n of nodes)if(result.has(n.parent)&&!result.has(n.id)){result.add(n.id);changed=true;}}return result;}
function parentOptions(nodes,id){const excluded=id?descendants(nodes,id):new Set();const depth=n=>{let d=1;while(n.parent){n=nodes.find(x=>x.id===n.parent);d++;}return d;};const own=nodes.find(n=>n.id===id),height=own?Math.max(...nodes.filter(n=>excluded.has(n.id)).map(depth))-depth(own)+1:1;return nodes.filter(n=>n.id!=='hero'&&!excluded.has(n.id)&&(n.visible||n.id===own?.parent)&&depth(n)+height<=3);}
function orderedNodes(nodes,parent=''){return nodes.filter(n=>n.parent===parent).flatMap(n=>[n,...orderedNodes(nodes,n.id)]);}
function sitemapBlocks(s){
 const m=map(s);check(m.nodes.length,'先选择网站地图模板');
 const applied=m.appliedNodes||[];
 const blocks=orderedNodes(m.nodes).map(n=>{
  const old=s.site.blocks.find(b=>b.id===n.id),previous=applied.find(x=>x.id===n.id);
  const body=old?old.body:(n.id==='hero'?`${s.company.draft.name} · ${s.company.draft.product}`:n.id==='capability'?s.company.draft.facts:n.id==='contact'?'欢迎介绍您的需求。本地预览尚未连接询盘服务。':'');
  // A navigation change must not overwrite authored headings or reveal intentionally hidden content.
  const title=old&&old.title!==previous?.title?old.title:n.title;
  const visible=n.visible&&!!body&&(!old||old.visible||previous?.visible===false);
  return {...old,id:n.id,title,body,rights:old?.rights||'OWN',visible,pending:!body};
 });
 // Content delivered outside the map (for example a video) belongs to the website too.
 const valid=new Set(m.nodes.map(n=>n.id));
 const extra=s.site.blocks.filter(b=>!valid.has(b.id)&&(!applied.some(n=>n.id===b.id)||b.body?.trim())).map(b=>{if(!applied.some(n=>n.id===b.id)&&!b.parentPageId&&b.kind!=='detail'&&!b.mountIds)return b;const ids=(b.mountIds||[b.parentPageId||b.id]).filter(id=>valid.has(id));return {...b,kind:'detail',parentPageId:ids[0]||'',mountIds:ids};});
 return [...blocks,...extra].map(b=>b.mountIds?{...b,mountIds:b.mountIds.filter(id=>valid.has(id))}:b);
}
function adDecision(s){
 const g=config(s),a=g.ad,c=L.settings(s),gaps=[],evidence=g.evidence.filter(x=>g.sources.includes(x.source));
 if(!c.markets.length)gaps.push(['选择目标市场','Choose target markets','markets']);
 if(!a.market||!c.markets.includes(a.market))gaps.push(['指定本次试验市场','Choose the market for this experiment','ads']);
 if(!a.locale||!c.enabled.includes(a.locale)||!L.ready(s).includes(a.locale))gaps.push(['准备目标语言的落地页内容','Prepare landing content in the target language','website-languages']);
 if(!evidence.length)gaps.push(['补充带来源与日期的需求依据','Add demand evidence with a source and date','sources']);
 if(!s.site.blocks.length)gaps.push(['建立可承接咨询的网站','Prepare a website to receive inquiries','website-sitemap']);
 if(!a.hypothesis||!a.metric||!a.stop||!a.owner)gaps.push(['填写假设、衡量方法、停止条件与负责人','Add a hypothesis, measure, stop condition and owner','ads']);
 if(a.cap===null||a.cap===undefined||a.cap<=0||!a.daily||!a.start||!a.end)gaps.push(['决定试验预算和日期；也可以暂不投入','Set a trial budget and dates, or defer spending','ads']);
 const stale=!!a.assessedKey&&a.assessedKey!==contextKey(s);
 return {stage:gaps.length?'NEEDS_INPUT':'PLAN_DRAFT',gaps,evidence,stale,executable:false,
  external:[['广告账号尚未授权连接','Ad account is not authorized or connected'],['真实落地页与询盘接收尚未验证','Live landing page and inquiry delivery are not verified'],['真实转化追踪与费用授权尚未验证','Live measurement and spending authorization are not verified']]};
}
function classify(m){
 const s=m.original||'';
 if(/退订|不要联系|停止联系|unsubscribe|stop contacting|do not contact/i.test(s))return 'STOP';
 if(/报价|价格|quote|price|cost/i.test(s))return 'QUOTE';
 if(/样品|sample/i.test(s))return 'SAMPLE';
 if(/演示|会议|约|demo|meeting/i.test(s))return 'MEETING';
 return 'DETAILS';
}
function quoteForReply(s,id,revision,message){
 const q=config(s).quotes.find(q=>q.id===id&&q.tenant===s.tenant),m=s.inbox.find(m=>m.id===message&&m.tenant===s.tenant);
 check(q&&m&&q.message===message&&open(m),'报价与本条咨询不匹配');
 check(q.status==='REVIEWED'&&q.revision===revision&&q.companyRevision===s.company.revision&&q.validUntil>=new Date().toISOString().slice(0,10),'报价版本已变化或过期，请重新核对并附上当前版本');
 check(!s.leads.suppressions.some(x=>x.candidate===m.candidate),'该联系人已暂停联系');
 return q;
}
const analysisActions=new Set(['saveChannels','saveChannelAccount','saveSources','saveConnections','addEvidence','saveAdPlan','assessAdPlan','numberSitemap','selectSitemap','editSitemapNode','addSitemapNode','moveSitemapNode','removeSitemapNode','undoSitemap','analyseRecords','applyAnalysis','saveQuote','reviewQuote','attachQuote','detachQuote']);
function apply(s,type,p){
 const g=config(s);
 if(type==='saveChannels'){g.channels=validList(p.ids,channels);touch(s,g);return;}
 if(type==='saveChannelAccount'){
  check(channels.some(x=>x.id===p.id),'社媒平台不存在');
  const profile=text(p.profile,600);
  if(profile){let url;try{url=new URL(profile);}catch{throw Error('账号主页请填写完整的 HTTPS 网址');}check(url.protocol==='https:'&&!url.username&&!url.password,'账号主页请填写不含登录凭据的 HTTPS 网址');}
  g.channelAccounts[p.id]={account:text(p.account,120),profile,status:'NOT_CONNECTED'};
  touch(s,g);return;
 }
 if(type==='saveSources'){g.sources=validList(p.ids,sources);touch(s,g);return;}
 if(type==='saveConnections'){g.connections=validList(p.ids,connections);touch(s,g);return;}
 if(type==='addEvidence'){
  check(g.sources.includes(p.source),'先选择这条资料的数据来源');
  check(text(p.observation)&&text(p.reference)&&validDate(p.date),'填写观察、原始位置和日期');
  check(p.date<=new Date().toISOString().slice(0,10),'资料日期不能在未来');
  g.evidence.push({id:'evidence-'+(++s.sequence),source:p.source,observation:text(p.observation),reference:text(p.reference,600),date:p.date,status:'CUSTOMER_PROVIDED',tenant:s.tenant});touch(s,g);return;
 }
 if(type==='saveAdPlan'){
  const c=L.settings(s),cap=p.cap===''?null:Number(p.cap),daily=p.daily===''?null:Number(p.daily);
  check(!p.market||c.markets.includes(p.market),'广告市场必须来自已选市场');check(!p.locale||c.enabled.includes(p.locale),'广告语言必须来自已选语言');
  check(['search','social','video'].includes(p.channel)&&['CNY','USD','EUR','JPY','GBP'].includes(p.currency),'请选择投放渠道和币种');
  check((cap===null||Number.isFinite(cap)&&cap>=0)&&(daily===null||Number.isFinite(daily)&&daily>=0),'预算需要有效数字或留空');
  check(daily===null||cap===null||daily<=cap,'每日上限不能超过总上限');
  check((!p.start||validDate(p.start))&&(!p.end||validDate(p.end))&&(!p.start||!p.end||p.end>=p.start),'结束日期不能早于开始日期');
  g.ad={revision:(g.ad.revision||0)+1,market:p.market,locale:p.locale,channel:p.channel,currency:p.currency,cap,daily,start:p.start||'',end:p.end||'',hypothesis:text(p.hypothesis),metric:text(p.metric),stop:text(p.stop),owner:text(p.owner,80),status:'DRAFT'};touch(s,g);return;
 }
 if(type==='assessAdPlan'){g.ad={...g.ad,assessedKey:contextKey(s),assessedAt:new Date().toISOString(),status:adDecision(s).stage};touch(s,g);return;}
 if(type==='numberSitemap'){const m=map(s);if(m.nodes.length&&m.numbering!=='hierarchy'){mapChange(s,m.nodes,m.template,true);s.site.sitemap.history=m.history;}return;}
 if(type==='selectSitemap'){const t=templateById(p.id);check(t,'请选择网站地图模板');mapChange(s,mapNodes(t.id),t.id);return;}
 if(type==='editSitemapNode'){
  const nodes=map(s).nodes,n=nodes.find(n=>n.id===p.id);check(n,'页面不存在');
  if(n.title!==text(p.title,100))delete n.titleEn;n.title=text(p.title,100);if(p.path!==undefined)n.path=normalizeSitemapPath(p.path);if(p.purpose!==undefined){if(n.purpose!==text(p.purpose,600))delete n.purposeEn;n.purpose=text(p.purpose,600);}if(p.visible!==undefined)n.visible=p.visible===true;if(Object.hasOwn(p,'parent'))n.parent=text(p.parent,100);
  if(Object.hasOwn(p,'navPlacement'))n.navPlacement=p.navPlacement==='footer'?'footer':'header';if(Object.hasOwn(p,'navPlacement'))n.footerExpanded=p.footerExpanded==='on'||p.footerExpanded===true;
  if(!n.visible){let parents=new Set([n.id]),changed=true;while(changed){changed=false;for(const x of nodes)if(parents.has(x.parent)&&!parents.has(x.id)){x.visible=false;parents.add(x.id);changed=true;}}}
  mapChange(s,nodes);return;
 }
 if(type==='addSitemapNode'){
  const m=map(s);check(m.nodes.length,'先选择网站地图模板');
  const n={navPlacement:p.navPlacement==='footer'?'footer':'header',footerExpanded:p.footerExpanded==='on'||p.footerExpanded===true,id:'page-new-'+(++s.sequence),parent:text(p.parent,100),title:text(p.title,100),path:normalizeSitemapPath(p.path),purpose:text(p.purpose,600),visible:true};
  mapChange(s,[...m.nodes,n],m.template,p.path===undefined);return;
 }
 if(type==='moveSitemapNode'){
  const m=map(s),i=m.nodes.findIndex(n=>n.id===p.id);check(i>=0,'页面不存在');const n=m.nodes[i];check(n.id!=='hero','网站根页保留在起点');
  check(['up','down'].includes(p.direction),'请选择有效的移动方向');
  const target=sitemapMoveTargets(m.nodes,n.id)[p.direction];
  check(target,p.direction==='up'?'栏目已在最前，不能继续前移。':'栏目已在最后，不能继续后移。');
  const j=m.nodes.findIndex(x=>x.id===target);[m.nodes[i],m.nodes[j]]=[m.nodes[j],m.nodes[i]];mapChange(s,m.nodes);return;
 }
 if(type==='removeSitemapNode'){const m=map(s),ids=descendants(m.nodes,p.id);check(m.nodes.some(n=>n.id===p.id),'页面不存在');check(!ids.has('hero')&&!ids.has('contact'),'保留首页与联系入口；请先移出联系页面');check(p.confirm===true,'请确认移除页面及其下级页面');mapChange(s,m.nodes.filter(n=>!ids.has(n.id)));return;}
 if(type==='undoSitemap'){const m=map(s),prev=m.history.pop();check(prev,'没有可撤销的地图修改');s.site.sitemap={...m,revision:m.revision+1,template:prev.template,nodes:m.numbering==='hierarchy'&&prev.nodes.length?numberedNodes(prev.nodes):prev.nodes};if(!prev.nodes.length){s.site.blocks=copy(prev.blocks||[]);s.site.design=copy(prev.design||null);}for(const b of prev.blocks||[])if(prev.nodes.some(n=>n.id===b.id)&&!s.site.blocks.some(x=>x.id===b.id))s.site.blocks.push(copy(b));return;}
 if(type==='analyseRecords'){
  check(Array.isArray(p.ids)&&p.ids.length&&new Set(p.ids).size===p.ids.length,'先勾选需要分析的记录');check(text(p.instruction),'请填写处理指令');
  const rows=p.ids.map(id=>s.inbox.find(m=>m.id===id&&m.tenant===s.tenant));check(rows.every(Boolean),'所选记录不存在或不属于当前空间');
  const supported=/总结|分析|需求|回复|报价|优先|跟进|处理|归纳|summari[sz]e|analy[sz]e|reply|quote|prioriti[sz]e|follow.?up/i.test(p.instruction);
  const mode=/报价|quote/i.test(p.instruction)?'QUOTE_PRIORITY':/缺少|补充|missing/i.test(p.instruction)?'MISSING_DETAILS':'REPLY';
  if(mode==='QUOTE_PRIORITY')rows.sort((a,b)=>Number(classify(b)==='QUOTE')-Number(classify(a)==='QUOTE'));
  g.analysis={id:'analysis-'+(++s.sequence),instruction:text(p.instruction),mode,companyRevision:s.company.revision,method:'LOCAL_RULE_DEMO',supported,rows:rows.map(m=>{
   const kind=classify(m),blocked=!open(m)||s.leads.suppressions.some(x=>x.candidate===m.candidate);
   const summary=m.original.slice(0,220),need=kind==='QUOTE'?'确认规格、数量、币种与交付条件；价格由销售填写':kind==='SAMPLE'?'确认样品规格、收件地区与实际可提供条件':kind==='MEETING'?'确认双方可参加时间与演示内容':kind==='STOP'?'停止营销联系，保留客户请求':'补充产品用途、适配条件与期望';
   let reply=kind==='QUOTE'?'感谢咨询。请补充所需规格、数量及交付地区，我们核对后为您准备正式报价。':kind==='SAMPLE'?'感谢咨询样品。请说明型号、用途与收件地区，我们会确认样品条件和后续安排。':kind==='MEETING'?'感谢希望进一步交流。请告知方便的时间与您希望了解的内容，我们再确认安排。':kind==='STOP'?'已收到您不再联系的要求。':'感谢您的咨询。请说明产品用途和具体需求，我们核对适配条件后回复您。';
   if(mode==='MISSING_DETAILS'&&kind!=='STOP')reply='感谢您的咨询。为便于准确回复，还需要与您核对：'+need+'。';
   return {id:m.id,base:recordKey(s,m),kind,summary,need,reply,owner:m.owner||'',next:need,status:blocked||kind==='STOP'?'BLOCKED':supported?'DRAFT':'UNSUPPORTED',applied:false};
  })};touch(s,g);return;
 }
 if(type==='applyAnalysis'){
  const a=g.analysis;check(a&&p.job===a.id,'分析记录已变化，请重新查看');
  check(Array.isArray(p.items)&&p.items.length&&new Set(p.items.map(x=>x.id)).size===p.items.length&&p.items.every(x=>a.rows.some(r=>r.id===x.id)),'只能应用本次已选记录');
  g.lastBatch=[];
  for(const item of p.items){
   const row=a.rows.find(r=>r.id===item.id),m=s.inbox.find(m=>m.id===item.id&&m.tenant===s.tenant);
   if(!m||row.applied||row.status!=='DRAFT'||recordKey(s,m)!==row.base||!open(m)){g.lastBatch.push({id:item.id,status:'SKIPPED'});continue;}
   if(!text(item.reply)||!text(item.owner)||!text(item.next)){g.lastBatch.push({id:item.id,status:'INCOMPLETE'});continue;}
   m.draft=text(item.reply);m.owner=text(item.owner,80);m.next=text(item.next);m.replyRevision++;m.companyRevision=s.company.revision;m.quoteRef=null;row.applied=true;
   for(const ap of s.approvals)if(ap.scope==='reply:'+m.id&&ap.status==='CONFIRMED')ap.status='INVALIDATED';
   g.lastBatch.push({id:m.id,status:'SAVED'});
  }touch(s,g);return;
 }
 if(type==='saveQuote'){
  const m=s.inbox.find(m=>m.id===p.message&&m.tenant===s.tenant);check(m&&open(m),'请选择仍在处理的咨询');
  check(!s.leads.suppressions.some(x=>x.candidate===m.candidate),'该联系人已暂停联系');
  const old=p.id?g.quotes.find(q=>q.id===p.id):null;check(!p.id||old,'报价不存在');check(!old||old.message===m.id,'不能将已有报价改给另一位客户');
  check(['CNY','USD','EUR','JPY','GBP'].includes(p.currency),'请选择币种');
  const quantity=Number(p.quantity),digits=p.currency==='JPY'?0:2,pattern=digits?/^\d+(\.\d{1,2})?$/:/^\d+$/;
  check(text(p.item)&&Number.isSafeInteger(quantity)&&quantity>0&&pattern.test(String(p.price||'')),'填写项目、正整数数量和有效单价');
  const unitMinor=Math.round(Number(p.price)*10**digits),totalMinor=unitMinor*quantity;
  check(Number.isSafeInteger(totalMinor)&&totalMinor>=0,'报价金额超出可处理范围');
  check(text(p.terms)&&text(p.owner)&&validDate(p.validUntil),'填写条款、负责人和有效期');
  check(p.validUntil>=new Date().toISOString().slice(0,10),'报价有效期已过');
  const q={id:old?.id||'quote-'+(++s.sequence),tenant:s.tenant,message:m.id,companyRevision:s.company.revision,revision:(old?.revision||0)+1,item:text(p.item,200),quantity,unitMinor,totalMinor,digits,currency:p.currency,terms:text(p.terms),owner:text(p.owner,80),validUntil:p.validUntil,status:'DRAFT',realSent:false,history:old?[...old.history,{...old,history:undefined}]:[]};
  g.quotes=old?g.quotes.map(x=>x.id===q.id?q:x):[...g.quotes,q];touch(s,g);return;
 }
 if(type==='reviewQuote'){
  const q=g.quotes.find(q=>q.id===p.id),m=s.inbox.find(m=>m.id===q?.message&&m.tenant===s.tenant);
  check(q&&m&&open(m)&&q.companyRevision===s.company.revision&&q.validUntil>=new Date().toISOString().slice(0,10),'报价或咨询已变化，需要重新核对');
  check(p.revision===q.revision&&p.confirm===true,'请核对当前报价版本、金额和条款');
  q.status='REVIEWED';q.reviewedAt=new Date().toISOString();touch(s,g);return;
 }
 if(type==='attachQuote'||type==='detachQuote'){
  const m=s.inbox.find(m=>m.id===p.message&&m.tenant===s.tenant);check(m&&open(m),'咨询已处理或不存在');
  if(type==='attachQuote'){const q=quoteForReply(s,p.id,p.revision,m.id);m.quoteRef={id:q.id,revision:q.revision};}
  else m.quoteRef=null;
  m.replyRevision++;
  for(const ap of s.approvals)if(ap.scope==='reply:'+m.id&&ap.status==='CONFIRMED')ap.status='INVALIDATED';
  touch(s,g);return;
 }
 throw Error('未知营销操作');
}
const api={channels,channelLogin,channelAccount,socialTargets,orderedChannels,sources,connections,templates,templateById,catalog:SC,descendants,parentOptions,mapNodes,map,sitemapMoveTargets,numberedNodes,config,contextKey,recordKey,open,adDecision,sitemapBlocks,validateNodes,normalizeSitemapPath,validSitemapPath,analysisActions,apply,recommendation,orderedNodes,quoteForReply};
if(local)module.exports=api;else root.LGAGrowth=api;
})(globalThis);
