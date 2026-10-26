(function(root){
 'use strict';
 const L=typeof module!=='undefined'&&module.exports?require('./site-languages.js'):root.LGASiteLanguages;
 const copy=x=>JSON.parse(JSON.stringify(x)),text=(v,n=3000)=>String(v??'').trim().slice(0,n),check=(v,m)=>{if(!v)throw Error(m);};
 const actions=new Set(['saveProduct','saveBusinessSite','selectBusinessSite','saveSalesperson','saveDigitalAgent','saveReceptionAccount','receiveReception','claimReception','transferReception','replyReception','closeReception','resumeReception']);
 const siteActions=new Set(['geoSave','articleSave','articleGenerate','articleNew','articleSelect','articleLink','setLogo','saveWebsiteCommunications','saveWebsitePublication','prepareWebsitePublication','removePageDetail','numberSitemap','addPageDetail','savePagePresentation','savePageEntry','removePageEntry','savePublishLanguages','saveWebsiteVersion','restoreWebsiteVersion','rehearseWebsiteRelease','importFramework','buildSitemap','saveSiteStart','buildSite','applySiteDesign','setSiteMotion','setSitePageMode','saveBlock','editInstruction','undoSite','redoSite','setDomain','confirmSite','testIntake','publishSite','configureLanguages','saveTranslation','receiveSiteTranslations','reviewTranslation','selectSitemap','editSitemapNode','addSitemapNode','moveSitemapNode','removeSitemapNode','undoSitemap','importWebsite','importExistingWebsite']);
 function model(s){return s.business||{version:1,activeSiteId:'site-main',products:[{id:'product-main',name:s.company.draft.product||'主要产品',category:'',facts:s.company.draft.facts||'',specs:'',faq:'',revision:1,active:true}],sites:[{id:'site-main',name:s.company.draft.name+' · 网站',profileMode:'shared',profile:null,profileRevision:0,productIds:['product-main'],agentId:'',document:copy(s.site)}],sales:[],agents:[],accounts:[]};}
 function ensure(s){if(!s.business)s.business=model(s);return s.business;}
 const activeId=s=>s.business?.activeSiteId||'site-main';
 const salesMarketIds=row=>Array.isArray(row?.marketIds)?row.marketIds:Object.keys(L.markets).filter(id=>String(row?.markets||'').split(/[、,，/;；\s]+/).includes(L.name(id,'zh-CN','region')));
 const site=(s,id=activeId(s))=>model(s).sites.find(x=>x.id===id);
 const profile=(s,id=activeId(s))=>{const w=site(s,id);return w?.profileMode==='independent'?w.profile:s.company.draft;};
 const products=(s,id=activeId(s))=>{const b=model(s),w=site(s,id);return b.products.filter(p=>w?.productIds.includes(p.id));};
 function context(s,id=activeId(s)){
  if(!s.business||s._businessContext)return s.site.logo===undefined?s:{...s,company:{...s.company,logo:s.site.logo}};
  const w=site(s,id);check(w,'网站不存在');const ps=products(s,id),draft={...profile(s,id),product:ps.map(p=>p.name).join('、')||profile(s,id).product};
  const legacy=w.id==='site-main'&&w.profileRevision===0&&ps.length===1&&ps[0].id==='product-main'&&ps[0].revision===1;const version=legacy?s.company.revision:[w.profileMode==='shared'?s.company.revision:0,w.profileRevision,...ps.map(p=>p.revision)].join(':');
  if(!legacy)draft.facts=[draft.facts,...ps.map(p=>[p.name,p.facts,p.specs].filter(Boolean).join('：'))].filter(Boolean).join('\n');
  return {...s,_businessContext:true,company:{...s.company,draft,revision:version,confirmed:w.profileMode==='shared'?s.company.confirmed:!!draft.name&&!!draft.product,logo:(id===activeId(s)?s.site:w.document).logo??(w.profileMode==='shared'?s.company.logo:'')},site:id===activeId(s)?s.site:w.document};
 }
 function mark(w){w.document.intake=null;w.document.correctionRequired=!!w.document.release;}
 function after(s,type,before){
  if(!s.business)return;const b=s.business,w=site(s);if(type==='saveCompany'&&w.profileMode==='independent')s.site=copy(before.site);w.document=copy(s.site);
  if(type==='saveCompany'&&JSON.stringify(before.company.draft)!==JSON.stringify(s.company.draft))for(const x of b.sites)if(x.profileMode==='shared')mark(x);
  if(type==='setDomain')check(!b.sites.some(x=>x.id!==w.id&&s.site.domain&&x.document.domain===s.site.domain),'该域名已用于另一个网站');
  s.site=copy(w.document);
 }
 const id=(s,prefix)=>prefix+'-'+(++s.sequence);
 const member=(s,value)=>model(s).sales.find(x=>x.id===value&&x.active);
 function listIds(values,allowed,label){check(Array.isArray(values),label+'格式无效');const ids=[...new Set(values)];check(ids.every(v=>allowed.some(x=>x.id===v)),label+'包含不存在的记录');return ids;}
 function domain(value){const v=text(value,250);if(!v)return '';check(!/[/?#@:]/.test(v)&&/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(v),'请填写域名，如 products.example.com');return v.toLowerCase();}
 function blankSite(host){return {design:null,revision:0,entry:'template',template:'industrial',reference:'',domain:host,blocks:[],history:[],revisions:[],redo:[],intake:null,release:null,correctionRequired:false};}
 function assigned(s,a){return member(s,a?.ownerId)||member(s,a?.backupId)||null;}
 function snapshot(s,w,a,productId){const ps=products(s,w.id).filter(p=>a?.productIds.includes(p.id)&&(!productId||p.id===productId));return {siteId:w.id,siteName:w.name,company:copy(profile(s,w.id)),products:copy(ps),agentId:a?.id||'',agentName:a?.name||'',agentRevision:a?.revision||0};}
 function addMessage(m,role,body,by=''){m.messages.push({role,body,by,at:new Date().toISOString()});m.updatedAt=new Date().toISOString();m.version++;}
 function handoff(s,m,reason,a){
  const responsible=member(s,m.ownerId)||assigned(s,a);m.status='WAITING_HUMAN';m.ownerId=responsible?.id||'';m.owner=responsible?.name||'';m.reason=reason;m.humanRequired=true;
  m.next=reason==='询价'?'核对产品、数量、规格和交期，人工准备报价':'核对客户需求并回复';
  m.handoff={reason,ownerId:m.ownerId,siteId:m.siteId,accountId:m.accountId,productId:m.productId,customer:m.customer,summary:m.original,knowledge:copy(m.knowledge),at:new Date().toISOString()};
  addMessage(m,'system',reason+' · '+(m.owner?'待 '+m.owner+' 接手':'待分派销售'));
 }
 function respond(s,m,a){
  const pricing=/报价|報價|询价|詢價|多少钱|多少錢|价格|價格|折扣|优惠|\b(price|pricing|quotation|quote|cost|rfq)\b|見積|いくら|単価/i.test(m.original);
  if(pricing){m.reason='询价';m.next='核对产品、数量、规格和交期，人工准备报价';}
  if(m.status==='HUMAN_ACTIVE'||m.humanRequired){if(m.status!=='HUMAN_ACTIVE')handoff(s,m,m.reason||'人工跟进',a);return;}
  if(pricing){handoff(s,m,'询价',a);return;}
  if(/人工|真人|销售|salesperson|human|person|投诉|投訴|complaint/i.test(m.original)){handoff(s,m,'客户要求人工',a);return;}
  if(!a?.active){handoff(s,m,'数字员工未接待',a);return;}
  const w=site(s,m.siteId);m.knowledge=snapshot(s,w,a,m.productId);const ps=m.knowledge.products.filter(x=>x.active);
  if(!ps.length){handoff(s,m,'缺少可用产品资料',a);return;}
  const clean=v=>v.toLowerCase().replace(/[\s，。？！,.?!]/g,''),q=clean(m.original);
  const faqs=ps.flatMap(p=>(p.faq||'').split('\n').map(line=>line.split('|')).filter(x=>x.length===2&&x[0].trim().length>=2));
  const matched=faqs.find(([question])=>clean(question)===q||q.includes(clean(question)));
  let answer=matched?matched[1].trim():'';
  if(!answer&&/^(请|请问|麻烦)?(介绍(一下)?(产品|公司)|产品介绍|公司介绍|你们(公司)?(有哪些|有什么|做什么)(产品)?|产品目录|products?|company|catalog|tell me about (your )?(products?|company)|製品紹介|会社紹介)[。？！?.!\s]*$/i.test(m.original))answer=`${m.knowledge.company.name}：${ps.map(p=>p.name+(p.facts?' — '+p.facts:'')).join('\n')}`;
  if(!answer){handoff(s,m,'资料不足',a);return;}
  m.status='AI_REPLIED';m.reason='';addMessage(m,'agent',answer,a.name);m.next='等待客户继续咨询';
 }
 function conversation(s,p){const m=s.inbox.find(x=>x.id===p.id&&x.reception&&x.tenant===s.tenant);check(m,'会话不存在');check(Number(p.version)===m.version,'会话已更新，请按最新状态处理');return m;}
 function apply(s,type,p){
  const b=ensure(s);site(s).document=copy(s.site);
  if(type==='saveProduct'){
   let row=p.id?b.products.find(x=>x.id===p.id):null;check(!p.id||row,'产品不存在');check(text(p.name),'请填写产品名称');
   if(!row){row={id:id(s,'product'),revision:0};b.products.push(row);}Object.assign(row,{name:text(p.name,160),category:text(p.category,160),facts:text(p.facts),specs:text(p.specs),faq:text(p.faq),active:p.active!==false,revision:row.revision+1});
   for(const w of b.sites)if(w.productIds.includes(row.id))mark(w);
  }else if(type==='saveBusinessSite'){
   let row=p.id?b.sites.find(x=>x.id===p.id):null;check(!p.id||row,'网站不存在');check(text(p.name),'请填写网站名称');const host=domain(p.domain);
   check(!host||!b.sites.some(x=>x.id!==p.id&&x.document.domain===host),'该域名已用于另一个网站');
   const ids=listIds(p.productIds===undefined?(row?.productIds||b.products.filter(x=>x.active!==false).map(x=>x.id)):p.productIds,b.products,'产品');if(p.productIds!==undefined)check(ids.length,'至少选择一个产品');check(['shared','independent'].includes(p.profileMode),'请选择资料方式');
   const own=p.profileMode==='independent'?{name:text(p.companyName,180),product:ids.map(k=>b.products.find(x=>x.id===k).name).join('、'),facts:text(p.companyFacts),strength:text(p.companyStrength),constraint:text(p.companyConstraint),market:text(p.companyMarket)}:null;
   if(own)check(own.name,'请填写独立公司名称');
   if(!row){row={id:id(s,'site'),profileRevision:0,agentId:'',document:blankSite(host)};b.sites.push(row);}
   if(p.agentId){const a=b.agents.find(x=>x.id===p.agentId&&x.siteId===row.id);check(a,'请选择本网站的数字员工');}
   const used=b.agents.filter(a=>a.siteId===row.id&&a.active);check(used.every(a=>a.productIds.every(k=>ids.includes(k))),'先调整该网站数字员工的产品范围，再移除产品');
   const changed=JSON.stringify([row.profileMode,row.profile,row.productIds])!==JSON.stringify([p.profileMode,own,ids]),domainChanged=row.document.domain!==host;
   Object.assign(row,{name:text(p.name,180),profileMode:p.profileMode,profile:own,productIds:ids,agentId:p.agentId===undefined?(row.agentId||''):p.agentId||'',profileRevision:row.profileRevision+(changed?1:0)});row.document.domain=host;if(changed||domainChanged)mark(row);if(domainChanged)row.document.revision++;
  }else if(type==='selectBusinessSite'){check(site(s,p.id),'网站不存在');b.activeSiteId=p.id;
  }else if(type==='saveSalesperson'){
   let row=p.id?b.sales.find(x=>x.id===p.id):null;check(!p.id||row,'销售不存在');check(text(p.name),'请填写销售姓名');
   const email=text(p.email===undefined?row?.email:p.email,254),previous=salesMarketIds(row),allowed=L.settings(s).markets;
   check(!email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'请填写有效的联系邮箱');
   if(p.marketIds!==undefined)check(Array.isArray(p.marketIds)&&p.marketIds.every(k=>allowed.includes(k)||previous.includes(k)),'负责市场请从目标市场中选择');
   if(!row){row={id:id(s,'sales')};b.sales.push(row);}
   if(p.marketIds!==undefined){if(!Array.isArray(row.marketIds)&&row.markets)row.legacyMarkets=row.markets;row.marketIds=[...new Set(p.marketIds)];row.markets=row.marketIds.map(k=>L.name(k,'zh-CN','region')).join(' / ');}
   else if(p.markets!==undefined)row.markets=text(p.markets,300);
   Object.assign(row,{name:text(p.name,100),languages:text(p.languages===undefined?row.languages:p.languages,150),email,active:p.active===undefined?row.active!==false:p.active!==false});
   for(const [key,max] of [['phone',80],['title',100],['notes',1000]])row[key]=text(p[key]===undefined?row[key]:p[key],max);
   if(!row.active)for(const m of s.inbox.filter(m=>m.reception&&m.ownerId===row.id&&m.status==='WAITING_HUMAN'))handoff(s,m,m.reason||'人工跟进',b.agents.find(a=>a.id===m.agentId));
  }else if(type==='saveDigitalAgent'){
   let row=p.id?b.agents.find(x=>x.id===p.id):null;check(!p.id||row,'数字员工不存在');const w=site(s,p.siteId);check(w,'请选择网站');check(text(p.name),'请填写数字员工名称');
   const ids=listIds(p.productIds,b.products.filter(x=>w.productIds.includes(x.id)),'数字员工产品');check(ids.length,'至少选择一个负责产品');
   check(p.active===false?b.sales.some(x=>x.id===p.ownerId):member(s,p.ownerId),'请选择在岗销售');check(!p.backupId||p.active===false||member(s,p.backupId),'备用销售不在岗');check(!p.backupId||p.backupId!==p.ownerId,'备用销售应与主负责人不同');
   check(!row||row.siteId===w.id||!b.accounts.some(x=>x.agentId===row.id),'先调整已绑定的接待账号，再更换网站');
   if(!row){row={id:id(s,'agent'),revision:0};b.agents.push(row);}if(row.siteId&&row.siteId!==w.id){const previous=site(s,row.siteId);if(previous.agentId===row.id)previous.agentId='';}
   Object.assign(row,{name:text(p.name,100),siteId:w.id,productIds:ids,ownerId:p.ownerId,backupId:p.backupId||'',languages:text(p.languages,150),instructions:text(p.instructions),active:p.active!==false,revision:row.revision+1});if(!w.agentId)w.agentId=row.id;
  }else if(type==='saveReceptionAccount'){
   const allowed=['line','linkedin','instagram','facebook','whatsapp','youtube','wechat','wechat-video','tiktok','x','douyin','red','bilibili','email','other'];check(allowed.includes(p.platform),'请选择渠道');const w=site(s,p.siteId),a=b.agents.find(x=>x.id===p.agentId);check(w&&a&&a.siteId===w.id,'账号与数字员工须属于同一网站');check(text(p.name)&&text(p.handle),'填写账号名称和平台账号标识');
   let row=p.id?b.accounts.find(x=>x.id===p.id):null;check(!p.id||row,'账号不存在');check(!b.accounts.some(x=>x.id!==p.id&&x.platform===p.platform&&x.handle.toLowerCase()===text(p.handle).toLowerCase()),'该平台账号已绑定，请编辑原记录');
   if(!row){row={id:id(s,'account')};b.accounts.push(row);}Object.assign(row,{name:text(p.name,120),handle:text(p.handle,180),platform:p.platform,siteId:w.id,agentId:a.id,status:'NOT_CONNECTED'});
  }else if(type==='receiveReception'){
   const account=p.accountId?b.accounts.find(x=>x.id===p.accountId):null;check(!p.accountId||account,'接待账号不存在');const w=site(s,account?.siteId||p.siteId);check(w,'请选择网站');
   check(!account||!p.siteId||account.siteId===p.siteId,'消息账号与网站不一致');check(text(p.body),'请填写消息');check(text(p.customer)&&text(p.customerKey),'填写客户名称和客户标识');
   check(!p.productId||w.productIds.includes(p.productId),'产品不属于该网站');
   const source=account?.id||'website:'+w.id,key=text(p.customerKey,180),eventKey=p.eventId?source+':'+text(p.eventId,180):'';
   if(eventKey&&s.inbox.some(x=>x.reception&&x.eventKeys?.includes(eventKey)))return;
   let m=p.id?conversation(s,p):s.inbox.find(x=>x.reception&&x.siteId===w.id&&x.accountId===source&&x.customerKey===key);
   if(m)check(m.siteId===w.id&&m.accountId===source&&m.customerKey===key,'消息与原会话不一致');
   const a=b.agents.find(x=>x.id===(account?.agentId||w.agentId));
   if(!m){m={id:id(s,'conversation'),tenant:s.tenant,reception:true,siteId:w.id,accountId:source,accountName:account?.name||'网站咨询',channel:account?.platform||'website',customer:text(p.customer,120),customerKey:key,productId:p.productId||'',agentId:a?.id||'',ownerId:'',owner:'',topic:'客户咨询',original:'',translation:'',draft:'',next:'',status:'NEW',messages:[],eventKeys:[],version:0,replyRevision:0,companyRevision:s.company.revision,isTest:true,createdAt:new Date().toISOString(),knowledge:snapshot(s,w,a,p.productId)};s.inbox.push(m);}
   if(m.status==='CLOSED'){m.status='WAITING_HUMAN';m.humanRequired=true;}
   m.original=text(p.body);m.topic=text(p.body,70);m.translation=m.original;if(eventKey)m.eventKeys.push(eventKey);addMessage(m,'customer',m.original,m.customer);
   respond(s,m,b.agents.find(x=>x.id===m.agentId));
  }else{
   const m=conversation(s,p),a=b.agents.find(x=>x.id===m.agentId);
   if(type==='claimReception'){
    check(m.status==='WAITING_HUMAN','当前会话不在待接手队列');const owner=member(s,p.ownerId);check(owner,'请选择在岗销售');check(!m.ownerId||m.ownerId===owner.id,'该询盘已分派给其他销售，请先转交');m.ownerId=owner.id;m.owner=owner.name;m.status='HUMAN_ACTIVE';m.humanRequired=true;addMessage(m,'system',owner.name+' 已接手');
   }else if(type==='transferReception'){
    check(m.status!=='CLOSED','先恢复已结束会话');const owner=member(s,p.ownerId);check(owner,'请选择在岗销售');m.ownerId=owner.id;m.owner=owner.name;m.humanRequired=true;m.status='WAITING_HUMAN';addMessage(m,'system','已转交 '+owner.name+(p.note?' · '+text(p.note,250):''));
   }else if(type==='replyReception'){
    check(m.status==='HUMAN_ACTIVE'&&m.ownerId===p.ownerId&&member(s,p.ownerId),'请由接手销售回复');check(text(p.body),'请输入回复');addMessage(m,'human',text(p.body),m.owner);m.next='等待客户回复';
   }else if(type==='closeReception'){check(m.status==='HUMAN_ACTIVE','请先接手再结束会话');m.status='CLOSED';addMessage(m,'system','本次处理结束');
   }else if(type==='resumeReception'){check(['HUMAN_ACTIVE','CLOSED'].includes(m.status),'请先由销售完成接手处理');check(p.resolved===true,'确认本次人工事项已处理后再恢复数字员工');check(a?.active,'数字员工未启用');m.humanRequired=false;m.status='AI_REPLIED';m.reason='';addMessage(m,'system','人工事项已处理，恢复数字员工接待');}
  }
  s.site=copy(site(s).document);
 }
 const api={actions,siteActions,model,ensure,activeId,salesMarketIds,site,profile,products,context,after,apply,member,assigned};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGABusiness=api;
})(typeof globalThis!=='undefined'?globalThis:this);
