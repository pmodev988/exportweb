(function (root) {
  'use strict';
  const B=typeof module!=='undefined'&&module.exports?require('./business.js'):root.LGABusiness;
  const R=typeof module!=='undefined'&&module.exports?require('./rich-content.js'):root.LGARichContent;
  const DC=typeof module!=='undefined'&&module.exports?require('./detail-content.js'):root.LGADetailContent;
  const F = typeof module !== 'undefined' && module.exports ? require('./fixtures.js') : root.LGADemo;
  const D = typeof module !== 'undefined' && module.exports ? require('./site-design.js') : root.LGASiteDesign;
  const L = typeof module !== 'undefined' && module.exports ? require('./site-languages.js') : root.LGASiteLanguages;
  const G = typeof module !== 'undefined' && module.exports ? require('./growth.js') : root.LGAGrowth;
  const SM = typeof module !== 'undefined' && module.exports ? require('./social-media.js') : root.LGASocialMedia;
  const P = typeof module !== 'undefined' && module.exports ? require('./prospecting.js') : root.LGAProspecting;
  const A = typeof module !== 'undefined' && module.exports ? require('./market-advice.js') : root.LGAMarketAdvice;
  const AT = typeof module !== 'undefined' && module.exports ? require('./site-translation.js') : root.LGASiteTranslation;
  const IM=typeof module!=='undefined'&&module.exports?require('./insights.js'):root.LGAInsights;
  const GEO=typeof module!=='undefined'&&module.exports?require('./site-geo.js'):root.LGASiteGeo;
  const CRM=typeof module!=='undefined'&&module.exports?require('./customer-view.js'):root.LGACustomerView;
  const AR=typeof module!=='undefined'&&module.exports?require('./site-articles.js'):root.LGASiteArticles;
  const copy = x => JSON.parse(JSON.stringify(x));
  const text = (x, max = 3000) => String(x ?? '').trim().slice(0, max);
  const fail = message => { throw new Error(message); };
  const requireThat = (test, message) => { if (!test) fail(message); };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // Stable content fingerprint for this demo, not a cryptographic signature.
  function fingerprint(value) { let h = 2166136261; for (const c of JSON.stringify(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16); }
  function fresh(tenant = 'factory') {
    requireThat(['factory', 'studio'].includes(tenant), '未知演示空间');
    return { schema: 1, tenant, sequence: 0, revision: 0, paused: false, isolated: false,
      company: { revision: 0, confirmed: false, draft: tenant === 'factory' ? copy(F.company) : { name: '远山设计 · 演示企业', product: '工业设计服务', strength: '样机设计与技术沟通', constraint: '报价和交付需单独确认', market: '尚未决定', facts: '提供设计咨询。案例、价格和周期待确认。' }, history: [], logo: '' },
      direction: { status: 'UNDECIDED', selected: null, rejected: [], cards: [] },
      plan: { revision: 0, kind: 'NEUTRAL', budgetMode: 'UNSPECIFIED', cap: null, loop: 1, next: null },
      budgets: Object.fromEntries(Object.keys(F.policy.caps).map(k => [k, { cap: null }])),
      approvals: [], operations: [], receipts: [], events: [],
      site: { design: null, revision: 0, entry: 'template', template: 'industrial', reference: '', domain: 'qinghe.example', blocks: [], history: [], revisions: [], redo: [], intake: null, release: null, correctionRequired: false },
      content: { revision: 0, script: '', captions: [], status: 'NOT_STARTED', manifest: null, offline: false },
      social: { revision: 0, caption: '', channel: 'LinkedIn', mode: 'connector', status: 'NOT_STARTED', receipt: null },
      leads: { status: 'NOT_STARTED', candidates: [], selected: null, channel: 'email', script: '', revision: 0, sequence: 'OFF', suppressions: [], sourceFailure: false },
      inbox: [], memory: { revision: 0, active: false, style: '清楚、克制，先解释用途再讲能力', source: '演示默认', trainingAllowed: false },
      faults: { unknownNext: false, intakeFail: false }, timeline: [] };
  }
  function event(s, type, detail) { s.events.push({ id: 'evt-' + (++s.sequence), type, detail, at: new Date().toISOString(), tenant: s.tenant, isTest: true }); }
  function active(s) { requireThat(!s.paused, '本轮已暂停；先恢复，再执行新动作。'); requireThat(!s.isolated, '数据归属异常已隔离；本原型不能解除 OPS 隔离。'); }
  function facts(s) { requireThat(s.company.confirmed, '先核对并确认公司资料。'); }
  function planned(s) { active(s); facts(s); requireThat(s.plan.revision > 0, '先看计划并建立本轮工作。'); }
  function approval(s, scope, revision) { if(scope.startsWith('site:')&&B)s=B.context(s);return s.approvals.find(a => a.scope === scope && a.revision === revision && a.status === 'CONFIRMED' && a.companyRevision === s.company.revision && a.tenant === s.tenant && (!scope.startsWith('site:')||(a.siteId||'site-main')===(B?.activeId(s)||'site-main'))); }
  function approve(s, scope, revision, details) {
    active(s); if(!scope.startsWith('site:'))facts(s);
    if (approval(s, scope, revision)) return;
    s.approvals.push({ id: 'confirm-' + (++s.sequence), tenant: s.tenant, ...(scope.startsWith('site:')?{siteId:B?.activeId(s)||'site-main'}:{}), scope, revision, status: 'CONFIRMED', companyRevision: s.company.revision, planRevision: s.plan.revision, details: copy(details || {}), actor: '演示负责人', at: new Date().toISOString() });
  }
  function invalidate(s, scopes, reason) { s.approvals.forEach(a => { const w=a.scope.startsWith('site:')&&s.business?B.site(s,a.siteId||'site-main'):null;if(w&&(s._businessContext?w.id!==B.activeId(s):w.profileMode==='independent'))return;if (a.status === 'CONFIRMED' && scopes.some(scope => a.scope.startsWith(scope))) { a.status = 'INVALIDATED'; a.reason = reason; } }); }
  function budget(s, task) {
    const ops = s.operations.filter(o => !task || o.task === task);
    const used = ops.reduce((n, o) => n + (o.status === 'SUCCEEDED' ? o.cost : 0), 0);
    const reserved = ops.reduce((n, o) => n + (['UNKNOWN', 'SUBMITTED'].includes(o.status) ? o.cost : 0), 0);
    const cap = task ? s.budgets[task].cap : s.plan.cap;
    return { used, reserved, cap, remaining: cap === null ? null : cap - used - reserved };
  }
  function start(s, task, key, kind, meta) {
    if(task==='site'&&s.business){key=B.activeId(s)+':'+key;meta={...meta,siteId:B.activeId(s)};}
    if(task==='site')active(s);else planned(s);
    requireThat(!s.operations.some(o => o.task === task && o.status === 'UNKNOWN'), '同一任务存在未知结果，先核对原操作，不能更换修订重复提交。');
    const old = s.operations.find(o => o.key === key);
    if (old) { requireThat(old.status === 'SUCCEEDED', '原操作已核对失败；请准备新修订/计划后再决定执行，不能把失败当完成。'); return old; }
    const cost = F.policy.costs[kind];
    requireThat(Number.isFinite(cost), '没有可控费用上界');
    for (const id of [null, task]) { const b = budget(s, id); requireThat(b.cap !== null && b.remaining >= cost, `${id ? '本项' : '本轮'}额度不足或未确认，下一步需 ${cost} 演示点；先决定范围和上限。`); }
    const op = { id: 'op-' + (++s.sequence), tenant: s.tenant, task, key, kind, cost, status: 'SUBMITTED', companyRevision: s.company.revision, meta: copy(meta || {}), isTest: true };
    s.operations.push(op);
    if (s.faults.unknownNext) { op.status = 'UNKNOWN'; s.faults.unknownNext = false; event(s, 'UNKNOWN', { operation: op.id }); }
    else settle(s, op, true);
    return op;
  }
  function settle(s, op, success) {
    if (['SUCCEEDED', 'FAILED'].includes(op.status)) return;
    op.status = success ? 'SUCCEEDED' : 'FAILED';
    const receipt = { id: 'demo-receipt-' + (++s.sequence), operation: op.id, tenant: s.tenant, kind: op.kind, status: op.status, environment: 'SIMULATED', isTest: true, at: new Date().toISOString(), stale: op.companyRevision !== s.company.revision };
    s.receipts.push(receipt);
    event(s, 'RECEIPT', { operation: op.id, status: op.status, stale: receipt.stale });
    if(op.kind==='social'&&op.meta.publication)SM.remember(s,op.meta.publication,op.id,success?'DEMO_COMPLETED':'FAILED',receipt.id,receipt.at);
    if (!success) return;
    // Late receipts record what occurred, never revive an approval or auto-send a successor.
    if (op.kind === 'social' && op.key === `social:${s.social.revision}`) {
      s.social.receipt = receipt.id;
      s.social.status = approval(s, 'social:publish', s.social.revision) ? 'PUBLISHED_DEMO' : 'PAST_VERSION_RECEIPT';
    }
    if (op.kind === 'research') s.leads.status = 'RESULT_READY';
    if (op.kind === 'contact') s.timeline.push({ kind: 'CONTACT', operation: op.id, candidate: op.meta.candidate, channel: op.meta.channel, isTest: true });
    if (op.kind === 'reply') { const m = s.inbox.find(m => m.id === op.meta.message); if (m) { m.replyReceipt = receipt.id; m.status = 'REPLIED_DEMO'; } }
  }
  function blockData(s) {
    const c = s.company.draft;
    const service = s.site.template === 'service';
    return [
      { id: 'hero', title: service ? `一起理清${c.product}的需求` : `${c.product}，从需求说起`, body: `${c.name}为您提供${c.product}相关服务。欢迎说明应用场景，我们一起核对是否适合。`, rights: 'OWN', visible: true },
      { id: 'capability', title: service ? '服务范围与合作边界' : '我们可以怎样配合', body: c.facts, rights: 'OWN', visible: true },
      { id: 'process', title: service ? '一个项目怎样开始' : '从需求到下一步', body: service ? '初步沟通 → 梳理范围 → 方案讨论 → 明确交付物与负责人。服务报价及周期另行确认。' : '描述用途 → 核对条件 → 讨论样品或方案 → 明确下一步。具体价格与交期单独确认。', rights: 'OWN', visible: true },
      { id: 'contact', title: '先谈谈您的需求', body: '基本产品介绍无需留下邮箱。提交问题时，仅用于本次业务沟通；本地演示不会对外发送。', rights: 'OWN', visible: true }
    ];
  }
  function siteSnapshot(s) {
    return { revision:s.site.revision, blocks:copy(s.site.blocks), logo:s.site.logo??s.company.logo??'', assets:copy(s.site.assets||[]), design:copy(s.site.design || null), sitemap:copy(s.site.sitemap||null), companyRevision:s.site.companyRevision, entry:s.site.entry, template:s.site.template, reference:s.site.reference||'', referenceStatus:s.site.referenceStatus||'', imported:copy(s.site.imported||null), status:'SUPERSEDED' };
  }
  function siteChange(s, blocks, design=s.site.design || null, meta={}) {
    s.site.revisions ||= [];
    s.site.revisions.push(siteSnapshot(s)); s.site.history.push(siteSnapshot(s));
    s.site.blocks = blocks; s.site.design=copy(design); Object.assign(s.site,meta);
    s.site.revision++; s.site.intake = null; s.site.releaseRehearsal=null;
    invalidate(s, ['site:structure', 'site:content', 'site:publish'], '网站修订变化');
  }
  function scanSite(s) {
    if(B)s=B.context(s);
    const errors = L ? L.errors(s) : [];
    if (!s.site.blocks.length) errors.push('未生成网站结构');
    if(s.site.sitemap?.nodes.length&&s.site.sitemap.appliedRevision!==s.site.sitemap.revision)errors.push('网站地图已修改，请按地图准备栏目后重新检查');
    for (const b of s.site.blocks.filter(b => b.visible)) {
      try{DC.validate(s,b.id,R.read(b));}catch(err){errors.push(err.message);}
      if(DC.references(R.read(b)).files.length)errors.push(b.id+'：本地素材可预览，导出前需完成正式素材入库与文件路径解析');
      if (b.rights !== 'OWN' && b.rights !== 'AUTHORIZED') errors.push(`${b.id}：素材权利待核实`);
      if (/<\s*(script|iframe|form)|javascript:|competitor\.example|G-[A-Z0-9]+/i.test(b.title + b.body)) errors.push(`${b.id}：含脚本、竞品或跟踪标识`);
      if (/保证成交|成功率\s*\d|全球第一|ISO\s*9001|CE认证|[$¥￥]\s*\d/i.test(b.body)) errors.push(`${b.id}：价格、认证或承诺缺少确认字段，本演示不支持新增此类声明`);
    }
    if (String(s.site.domain||'').length>253||!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(s.site.domain||'')) errors.push('网站域名无效，请填写完整域名，不含协议、端口或路径');
    return { hash: fingerprint({ blocks: s.site.blocks, domain: s.site.domain, design: D.resolve(s.site.design), languages:s.site.languages, communications:s.site.communications||{}, logo:s.site.logo??s.company.logo??'' }), errors, ready: errors.length === 0 };
  }
  function selected(s) { return s.leads.candidates.find(c => c.id === s.leads.selected); }
  function canContact(s) {
    const c = selected(s);
    requireThat(c && c.status === 'ACCEPTED', '先接受有依据的具体需求假设；方向选择不等于接受机会。');
    requireThat(c.license === 'ALLOW' && c.permission, '来源/地区/本次渠道许可尚未满足。');
    requireThat(!s.leads.suppressions.some(x => x.candidate === c.id), '该联系人已停联或需核实；不能换渠道绕过。');
    requireThat(c.companyRevision === s.company.revision, '机会依据使用旧公司事实，需重新研究核对。');
    requireThat(s.leads.script.trim().length > 0, '先准备联系内容。');
    return c;
  }
  function resultCard(s) {
    const testMessages = s.inbox.filter(m => m.isTest).length;
    const outputs = [s.site.blocks.length > 0, !!s.content.manifest, !!s.social.caption, s.leads.candidates.length > 0].filter(Boolean).length;
    return { outputs, testMessages, realInquiries: 0, realOrders: 0, humanTimeSaved: null, realDelivery: null, demoReceipts: s.receipts.filter(r => r.status === 'SUCCEEDED').length, spend: budget(s), observation: '未接入真实渠道，尚无真实获客效果可统计' };
  }
  function directionCards(s){
    const c=s.company.draft,industrial=/零件|加工|金属/.test(c.product+' '+c.strength),service=/服务|咨询|设计|培训|软件|物流/.test(c.product);
    const evidence=`公司资料 / 产品：“${c.product}”；强项：“${c.strength||'尚未填写'}”`;
    if(industrial&&!service)return copy(F.directions).map(d=>({...d,evidence,companyRevision:s.company.revision,applicable:true}));
    const rows=service?[
      ['需要这项服务的企业','直接使用服务的业务团队','直接服务型','先了解客户要解决的问题，再判断服务范围是否适合。','业务问题、负责人、服务范围','准备服务介绍与需求沟通提纲'],
      ['项目合作伙伴','已有客户项目、需要专业配合的团队','项目协作型','可以探索项目配合，但是否互补还需要双方核实。','项目分工、交付边界、合作条件','整理可提供的配合与交付说明'],
      ['客户推荐与渠道伙伴','能接触潜在使用者的行业伙伴','伙伴推荐型','可以探索推荐合作，不能假定已有渠道资源。','服务地区、推荐方式、责任划分','先明确合作边界，再了解具体伙伴']
    ]:[
      ['直接使用产品的企业','业务中可能使用这类产品的团队','直接使用型','先从产品用途了解谁会使用，再核实是否有当前需求。','使用场景、规格、采购方式','补充一份产品用途和选型说明'],
      ['配套与项目合作伙伴','可能将产品用于自身项目的企业','配套合作型','可以探索配套合作，产品是否兼容仍需验证。','配套条件、技术接口、交付范围','说明产品可以怎样与其他产品配合'],
      ['经销与采购服务商','服务相关使用者的渠道企业','渠道合作型','可以研究渠道是否匹配，不能假定对方愿意代理或采购。','目标地区、服务能力、合作要求','先明确渠道合作条件']
    ];
    return rows.map(([title,audience,fit,reason,need,first],i)=>({id:'D'+(i+1),title,audience,fit,reason,need,first,source:'你提供的资料',evidence,state:'待验证假设',companyRevision:s.company.revision,applicable:true}));
  }
  function candidateSamples(s){
    const rows=copy(F.candidates);
    if(!/服务|咨询|设计|培训|软件|物流/.test(s.company.draft.product)&&/零件|加工|金属/.test(s.company.draft.product+' '+s.company.draft.strength))return rows;
    // Synthetic practice data, never presented as researched companies or market evidence.
    for(const [i,c] of rows.entries())if(i<2){
      c.name=(i?'合作项目方':'企业使用方')+'（合成样例）';c.role='业务负责人（角色推断）';
      c.evidence='合成练习资料：展示'+(i?'项目配合':'企业需求沟通')+'场景，不代表真实企业。';
      c.hypothesis='练习了解是否需要“'+s.company.draft.product+'”，实际需求和匹配程度未知。';
      c.unknown='实际用途、需求、预算、负责人及本次联系许可';
    }
    return rows;
  }
  function workOverview(s){
    const waiting=s.inbox.filter(m=>m.reception?['WAITING_HUMAN','HUMAN_ACTIVE'].includes(m.status):!m.replyReceipt&&!['CLOSED','STOPPED'].includes(m.status)).length;
    const stale=!!s.site.blocks.length&&(!s.company.confirmed||s.site.companyRevision!==s.company.revision);
    const published=s.site.release?.revision===s.site.revision&&!s.site.correctionRequired;
    const contentReady=!!s.content.manifest&&s.content.status==='RECEIVED'&&!stale;
    const socialReady=!!s.social.receipt&&s.social.contentRevision===s.content.revision&&published;
    const accepted=s.leads.candidates.filter(c=>c.status==='ACCEPTED').length;
    const leadsStale=s.leads.candidates.some(c=>c.companyRevision!==s.company.revision)||(!s.company.confirmed&&!!s.leads.candidates.length);
    return [
      {name:'独立网站',status:published?'发布演练完成':s.site.blocks.length?'待检查与发布':'待建立',detail:published?'页面与询问接收已完成本地演练，尚未公开。':s.site.blocks.length?'已有 '+s.site.blocks.length+' 个栏目，可以继续完善与检查。':'选择网站方案，先把公司与产品介绍清楚。',page:s.site.blocks.length?'website-publish':'website',action:published?'查看网站':s.site.blocks.length?'检查网站':'开始建站'},
      {name:'内容制作',status:stale||s.content.status==='NEEDS_REVIEW'?'需要更新':contentReady?'已用于网站':s.content.script?'制作中':'待准备',detail:contentReady?'文稿或示意视频已加入网站，可继续编辑与下载。':'把现有资料做成可以使用的文稿或视频。',page:contentReady?'content-delivery':'content',action:contentReady?'查看内容':'制作内容'},
      {name:'社媒发布',status:socialReady?'发布演练完成':s.social.receipt?'需要更新':s.social.caption?'待发布':'待准备',detail:socialReady?'已记录示例发布结果，尚未连接真实平台。':'沿用产品内容准备帖子，再核对账号与发布方式。',page:socialReady?'social-publish':'social',action:socialReady?'查看发布记录':'准备帖子'},
      {name:'AI 获客',status:leadsStale?'需要更新':accepted?'已选 '+accepted+' 家':s.leads.candidates.length?'待选择客户':'待研究',detail:s.leads.suppressions.length?'有联系人已停联，请遵守停联范围。':accepted?'先核对每家企业的合作点，再准备联系。':'先看客户方向与依据，再决定联系哪些企业。',page:accepted&&!leadsStale?'leads-contact':'leads',action:accepted&&!leadsStale?'查看联系计划':'寻找客户'},
      {name:'客户交流',status:waiting?waiting+' 条待处理':s.inbox.length?'本轮示例已处理':'暂无询问',detail:waiting?'先处理客户的问题，再继续其他获客工作。':'原问题、回复和后续安排会保留在同一处。',page:'inbox',action:waiting?'处理询问':'查看客户交流'}
    ];
  }
  function nextAction(s) {
    if (s.isolated) return { page: 'recovery', title: '数据归属需要处理', detail: '当前演示空间已隔离，保留材料和回执。', label: '查看隔离原因' };
    const unknown = s.operations.find(o => o.status === 'UNKNOWN');
    if (unknown) return { page: 'recovery', title: '先核对原操作结果', detail: '费用仍预占，重复点击不会再执行。', label: '核对原操作' };
    if (s.paused) return { page: 'results', title: '本轮已暂停', detail: '已有产物已保留，可以继续查看。', label: '查看本轮结果' };
    if (!s.company.confirmed) return { page: 'guide', title: '先认识你的公司，我来准备第一步', detail: '不清楚卖给谁、预算还没定，都可以开始。', label: '介绍我的公司' };
    const unanswered = s.inbox.find(m => !m.replyReceipt && !['CLOSED', 'STOPPED'].includes(m.status));
    if (unanswered) return { page: 'inbox', title: '客户的问题需要接住', detail: '原问题已保留；我已准备回复和技术确认事项。', label: '查看问题与回复草稿' };
    if (s.direction.status === 'REVISED') return { page: 'plan', title: '公司资料已更新', detail: '查看目标计划，继续安排工作。', label: '查看目标计划' };
    if(!s.plan.revision&&!L.settings(s).markets.length)return {page:'markets',title:'选择目标市场',detail:'选择需要开展业务的国家或地区。',label:'选择目标市场'};
    if (!s.plan.revision) return { page: 'plan', title: '安排本轮工作', detail: '进入目标计划，选择需要开展的工作。', label: '查看目标计划' };
    if (!s.site.blocks.length) return { page: 'website', title: '我来搭一个能讲清楚产品的网站', detail: '可选模板、参考竞品结构或沿用已有资料。', label: '准备网站框架' };
    if (!s.content.manifest) return { page: approval(s,'content:artifact',s.content.revision)?'content-delivery':'content', title: '把产品介绍用到网站里', detail: '准备文稿或示意视频，让客户更容易了解你的产品。', label: '制作产品内容' };
    if (!s.site.release || s.site.release.revision !== s.site.revision || s.site.correctionRequired) return { page: 'website-publish', title: '准备发布网站', detail: '当前可以演示发布流程；正式上线还需接入网站托管和域名。', label: '发布网站' };
    if (!s.social.receipt) return { page: 'social', title: '把同一套内容用于社媒', detail: '沿用产品介绍和网站资料，准备这一轮帖子。', label: '预览社媒计划' };
    if (!s.leads.candidates.length) return { page: 'leads', title: '研究可能适合的企业', detail: '先看为什么适合和缺什么，再决定联系。', label: '研究候选企业' };
    return { page: 'results', title: '看看这轮交付了什么，再改进一点', detail: '看看已经做好的内容、体验记录和下一步建议。', label: '查看成效优化' };
  }
  const SW=typeof module!=='undefined'&&module.exports?require('./self-website.js'):root.LGASelfWebsite;
  function dispatch(state, type, p = {}) {
    requireThat(state.schema === 1 && state.tenant, '存档格式不支持');
    requireThat(!p.tenant || p.tenant === state.tenant, '跨租户输入已拒绝');
    const s = copy(state);
    const canonicalCompany=s.company;
    if(B?.siteActions.has(type)&&s.business){s.company=B.context(s).company;s._businessContext=true;}
    if(['saveReply','sendReply','closeInquiry'].includes(type))requireThat(!s.inbox.find(m=>m.id===p.id)?.reception,'请在消息接待中处理该会话');
    if (s.isolated && !['pause'].includes(type)) fail('当前空间已隔离；本地业务操作不能解除隔离。');
    switch (type) {
      case 'saveCompany': {
        const d = { ...s.company.draft };
        for (const k of Object.keys(F.company)) if (k in p) d[k] = text(p[k]);
        requireThat(d.name && d.product, '请至少填写公司和产品，其他可以不知道。');
        if (JSON.stringify(d) !== JSON.stringify(s.company.draft)) {
          s.company.history.push({ revision: s.company.revision, draft: copy(s.company.draft), status: 'SUPERSEDED' });
          s.company.draft = d; s.company.revision++; s.company.confirmed = false;
          invalidate(s, ['company', 'site:', 'content:', 'social:', 'contact:', 'reply:'], '公司事实修订');
          if (s.direction.selected) s.direction.status = 'REVISED';
          s.content.status = s.content.revision ? 'NEEDS_REVIEW' : 'NOT_STARTED';
          s.site.intake = null; s.site.correctionRequired = !!s.site.release;
          s.leads.sequence = 'STOPPED_FACT_CHANGE';
        }
        break;
      }
      case 'confirmCompany':
        active(s); s.company.revision ||= 1; s.company.confirmed = true;
        approve(s, 'company', s.company.revision, { fields: Object.keys(s.company.draft) });
        s.direction.cards = directionCards(s);
        break;
      case 'receiveMarketAdvice': {
        active(s);facts(s);const request=A.request(s);
        requireThat(p.inputKey===request.inputKey,'资料已修改，请重新生成市场建议。');
        const result=A.parse(p.envelope,request);s.marketAdvice=result;
        s.direction.cards=result.recommendations.map(r=>({id:r.id,title:r.title,audience:r.audience,fit:r.markets.join(' / '),reason:r.rationale,need:r.unknowns.join('；'),first:r.nextSteps.join('；'),evidence:r.evidence.map(e=>e.quote).join('；'),source:'AIR 模拟输出',companyRevision:s.company.revision,applicable:true}));
        s.direction.selected=null;s.direction.status='SUGGESTED';break;
      }
      case 'adoptMarketAdvice': {
        active(s);facts(s);requireThat(A.current(s),'建议依据已变化，请重新生成市场建议。');
        const advice=s.marketAdvice.recommendations.find(r=>r.id===p.id);requireThat(advice,'请选择本次生成的建议。');
        const unchanged=s.plan.proposal?.requestId===s.marketAdvice.requestId&&s.plan.proposal?.adviceId===advice.id;
        if(!unchanged){
          s.plan.proposal={goal:advice.goal,positioning:advice.positioning,actions:copy(advice.actions),adviceId:advice.id,requestId:s.marketAdvice.requestId,inputKey:s.marketAdvice.inputKey,revision:1,simulated:true};
          s.plan.revision++;s.plan.kind='DIRECTION';
        }
        s.direction.selected=advice.id;s.direction.status='SELECTED';break;
      }
      case 'saveMarketProposal': {
        active(s);requireThat(s.plan.proposal,'请先采用一项市场建议。');
        const goal=text(p.goal,1600),positioning=text(p.positioning,1600),actions=String(p.actions||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
        requireThat(goal&&positioning&&actions.length>0&&actions.length<=8&&actions.every(x=>x.length<=1600),'请填写目标、定位与行动安排，行动最多 8 项。');
        Object.assign(s.plan.proposal,{goal,positioning,actions,revision:s.plan.proposal.revision+1});break;
      }
      case 'selectDirection':
        active(s); facts(s);
        requireThat(!p.id || s.direction.cards.some(c => c.id === p.id), '方向不存在');
        s.direction.selected = p.id || null; s.direction.status = p.id ? 'SELECTED' : 'UNDECIDED';
        s.plan.kind = p.id ? 'DIRECTION' : 'NEUTRAL';
        break;
      case 'rejectDirections':
        s.direction.rejected.push({ reason: text(p.reason || '暂不合适'), companyRevision: s.company.revision });
        s.direction.selected = null; s.direction.status = 'UNDECIDED'; s.plan.kind = 'NEUTRAL';
        break;
      case 'createPlan':
        active(s); facts(s); s.plan.revision++; s.plan.budgetMode = p.mode || 'UNSPECIFIED';
        requireThat(['UNSPECIFIED', 'EXISTING', 'SMALL_TRIAL'].includes(s.plan.budgetMode), '预算方式无效');
        break;
      case 'approveBudget': {
        planned(s); const cap = Number(p.cap);
        requireThat(Number.isFinite(cap) && cap >= 0, '请输入有效演示额度。');
        const task = p.task || null; requireThat(!task || s.budgets[task], '未知费用范围');
        const b = budget(s, task); requireThat(cap >= b.used + b.reserved, '上限不能低于已用和在途预占。');
        if (task) s.budgets[task].cap = cap; else s.plan.cap = cap;
        approve(s, 'cost:' + (task || 'plan'), ++s.sequence, { cap, currency: 'DEMO_POINTS' });
        break;
      }
      case 'saveSiteStart': {
        active(s);requireThat(!s.site.blocks.length,'已有网站，请直接修改现有网站。');
        requireThat(['template','reference','materials'].includes(p.entry),'请选择建站方式');
        const reference=text(p.reference,1000);if(p.entry==='reference')requireThat(/^https?:\/\//.test(reference),'请输入已有网站网址。');
        s.site.start={entry:p.entry,reference:p.entry==='reference'?reference:'',revision:(s.site.start?.revision||0)+1};break;
      }
      case 'buildSite': {
        active(s);
        requireThat(['template', 'reference', 'materials'].includes(p.entry), '请选择建站入口');
        if(s.site.blocks.length)requireThat(p.replace === true, '重建会替换当前栏目，请先确认；也可以只换外观。');
        if (p.entry === 'reference') {
          requireThat(/^https?:\/\//.test(text(p.reference)), '请输入已有网站网址。');
          requireThat(p.mode !== 'migration' || p.authorized === true, '授权迁移需要明确复用范围；本演示只提供自有组件重建。');
          const op = start(s, 'site', `analyse:${s.site.revision + 1}`, 'analyse', { reference: text(p.reference), purpose: 'SITE_STRUCTURE_ANALYSIS' });
          requireThat(op.status === 'SUCCEEDED' || op.status === 'UNKNOWN', '分析失败');
          s.site.reference = text(p.reference); s.site.referenceStatus = op.status === 'UNKNOWN' ? 'RECONCILING' : 'DEMO_BLUEPRINT';
        }
        s.site.entry = p.entry; s.site.template = p.template || 'industrial';
        if (p.entry !== 'reference') s.site.referenceStatus = null;
        if (s.site.referenceStatus !== 'RECONCILING') { siteChange(s, s.site.sitemap?.nodes.length?G.sitemapBlocks(s):s.site.design && s.site.design.skeleton!=='LEGACY' ? D.blocks(s.company.draft,s.site.design) : blockData(s));if(s.site.sitemap?.nodes.length)Object.assign(s.site.sitemap,{appliedRevision:s.site.sitemap.revision,appliedNodes:copy(s.site.sitemap.nodes)}); s.site.companyRevision = s.company.revision; s.site.redo = []; }
        break;
      }
      case 'applySiteDesign': {
        active(s); const selected=D.candidate(p.candidate);
        requireThat(selected, '网站方案不存在');
        requireThat(['appearance','rebuild'].includes(p.mode), '请选择应用方式');
        const hasContent=s.site.blocks.length>0, rebuild=!hasContent||p.mode==='rebuild';
        if(hasContent&&rebuild)requireThat(p.replace===true,'重建会替换当前栏目，请先确认；原版保留并可撤销。');
        const old=D.resolve(s.site.design);
        requireThat(p.motion===undefined||['static','subtle','expressive'].includes(p.motion),'请选择有效的动效方式');
        const design={pageMode:D.pageMode(s.site.design),motion:D.presentation.motion(selected,p.motion),candidate:selected.id,style:selected.style,layout:selected.layout,skeleton:rebuild?selected.skeleton:(old?.skeleton || 'LEGACY')};
        // LEGACY retains the old menu and blocks while adopting a new appearance.
        const blocks=rebuild?(s.site.sitemap?.nodes.length?G.sitemapBlocks(s):D.blocks(s.company.draft,design)):copy(s.site.blocks);
        siteChange(s,blocks,design,rebuild?{companyRevision:s.company.revision,entry:'template'}:{});
        if(rebuild&&s.site.sitemap?.nodes.length)Object.assign(s.site.sitemap,{appliedRevision:s.site.sitemap.revision,appliedNodes:copy(s.site.sitemap.nodes)});
        s.site.redo=[]; break;
      }
      case 'setSitePageMode': {
        active(s);requireThat(['multi','single'].includes(p.pageMode),'请选择多页面或单页显示');
        requireThat(s.site.blocks.length&&D.resolve(s.site.design),'先准备网站架构');
        if(D.pageMode(s.site.design)!==p.pageMode){siteChange(s,copy(s.site.blocks),{...s.site.design,pageMode:p.pageMode});s.site.redo=[];}
        break;
      }
      case 'buildSitemap': {
        active(s); const blocks=G.sitemapBlocks(s);
        siteChange(s,blocks,s.site.design||{candidate:'T01',skeleton:'LEGACY'},{companyRevision:s.company.revision,entry:'sitemap'});
        Object.assign(s.site.sitemap,{appliedRevision:s.site.sitemap.revision,appliedNodes:copy(s.site.sitemap.nodes)});s.site.redo=[];break;
      }
      case 'importWebsite': {
        active(s);
        requireThat(Array.isArray(p.nodes)&&p.nodes.length<=60&&Array.isArray(p.blocks),'读取结果格式不正确');
        const nodes=copy(p.nodes);G.validateNodes(nodes);
        requireThat(/^https:\/\//.test(p.source||''),'已有网站地址无效');
        const blocks=nodes.map(node=>{
          const incoming=p.blocks.find(b=>b.id===node.id);
          requireThat(incoming,'缺少对应页面内容');
          const rich=R.normalize(p.details?incoming.rich||[]:[]),body=R.plain(rich);
          return {mountIds:Array.isArray(incoming.mountIds)?[...new Set(incoming.mountIds)].filter(id=>nodes.some(n=>n.id===id)):undefined,detailDeleted:!!incoming.detailDeleted,id:node.id,title:text(p.details?incoming.title:node.title,180)||node.title,rich,body,visible:!!body,rights:'AUTHORIZED',pending:!body,sourceUrl:node.sourceUrl||''};
        });
        const old=G.map(s);
        siteChange(s,blocks,s.site.design||{candidate:'T01',skeleton:'LEGACY'},{companyRevision:s.company.revision,entry:'import',reference:p.source});
        s.site.sitemap={revision:old.revision+1,appliedRevision:old.revision+1,template:'existing-website',nodes,appliedNodes:copy(nodes),
          history:[...old.history,{revision:old.revision,template:old.template,nodes:old.nodes,blocks:copy(s.site.history.at(-1).blocks),design:copy(s.site.history.at(-1).design)}]};
        s.site.imported={source:p.source,details:!!p.details,readPages:Number(p.readPages)||0,readAt:p.readAt,failures:copy(p.failures||[])};
        s.site.referenceStatus='IMPORTED';s.site.redo=[];break;
      }
      case 'saveBlock': {
        active(s); const blocks = copy(s.site.blocks); const b = blocks.find(b => b.id === p.id);
        requireThat(b, '栏目不存在'); b.title = text(p.title, 180);
        const assets=p.assets!==undefined?DC.assets(p.assets):s.site.assets||[];
        if(p.rich!==undefined){b.rich=DC.validate(s,p.id,p.rich,assets);b.body=R.plain(b.rich);}
        else{if(p.body!==b.body)delete b.rich;b.body=text(p.body,3000);}
        if(typeof p.visible==='boolean')b.visible=p.visible;
        requireThat(b.title && (!b.visible || b.body.trim()), '显示的栏目需要标题和正文'); b.pending=!b.visible;if(b.body.trim())delete b.detailDeleted;
        if(p.aiInstruction!==undefined)b.aiInstruction=text(p.aiInstruction,5000);
        b.detailId=DC.identity(s,b.id).detailId;
        siteChange(s, blocks,s.site.design,{assets});
        if(Object.hasOwn(p,'mountIds'))SW.setMounts(s,b,typeof p.mountIds==='string'?JSON.parse(p.mountIds):p.mountIds);
        if(b.parentPageId)SW.syncDetailEntry(s,b,p);
        s.site.redo = []; break;
      }
      case 'editInstruction': {
        active(s); const blocks = copy(s.site.blocks); const instruction = text(p.instruction);
        if (/短|简洁/.test(instruction)) blocks.forEach(b => { if (b.id !== 'contact') {b.body = b.body.split(/[。！？]/)[0] + '。';delete b.rich;} });
        else if (/视频.*前|移.*视频/.test(instruction)) { const i = blocks.findIndex(b => b.id === 'media'); requireThat(i >= 0, '尚未回填视频栏目，先完成内容交付。'); blocks.splice(1, 0, blocks.splice(i, 1)[0]); }
        else if (/流程.*前/.test(instruction)) { const i = blocks.findIndex(b => b.id === 'process'); requireThat(i >= 0, '未找到流程栏目'); blocks.splice(1, 0, blocks.splice(i, 1)[0]); }
        else fail('此演示可执行“短一点”“流程往前移”“视频往前移”；其他要求已保留在输入框，真实 AI 接入后处理。');
        siteChange(s, blocks); s.site.redo = []; break;
      }
      case 'undoSite': {
        active(s); const previous = s.site.history.at(-1); requireThat(previous, '没有可撤销的编辑');
        const redo = siteSnapshot(s); s.site.history.pop(); const history = copy(s.site.history);
        siteChange(s, previous.blocks, previous.design || null, {sitemap:previous.sitemap||null,companyRevision:previous.companyRevision ?? s.site.companyRevision,entry:previous.entry || s.site.entry,template:previous.template || s.site.template,reference:previous.reference||'',referenceStatus:previous.referenceStatus||'',imported:previous.imported||null,assets:previous.assets||[]}); s.site.history = history; s.site.redo.push(redo); break;
      }
      case 'redoSite': {
        active(s); const next = s.site.redo.pop(); requireThat(next, '没有可重做的编辑'); siteChange(s, next.blocks, next.design || null, {sitemap:next.sitemap||null,companyRevision:next.companyRevision ?? s.site.companyRevision,entry:next.entry || s.site.entry,template:next.template || s.site.template,reference:next.reference||'',referenceStatus:next.referenceStatus||'',imported:next.imported||null,assets:next.assets||[]}); break;
      }
      case 'importFramework': {
        active(s); requireThat(p.baseRevision === s.site.revision, '导出后网页已改动，导入冲突；请重新导出后合并。');
        requireThat(Array.isArray(p.blocks) && p.blocks.length > 0, '框架为空');
        const ids = s.site.blocks.map(b => b.id);
        requireThat(p.blocks.length === ids.length && new Set(p.blocks.map(b => b.id)).size === ids.length && p.blocks.every(b => ids.includes(b.id)), '栏目 ID 必须与导出框架一致，不能重复或静默丢失');
        const blocks = p.blocks.map(b => {const old=s.site.blocks.find(x=>x.id===b.id),next={...old,title:text(b.title,180),body:text(b.body)};if(next.body!==old.body)delete next.rich;return next;});
        requireThat(blocks.every(b => b.title && (!b.visible || b.body)), '显示栏目的标题或正文缺失'); siteChange(s, blocks); s.site.redo = []; break;
      }
      case 'configureLanguages':
        active(s); s.site.languages=L.configure(s,p); s.site.revision++; s.site.intake=null; invalidate(s,['site:'],'网站语言设置已修改'); break;
      case 'saveTranslation':
        active(s); s.site.languages=L.save(s,p); s.site.revision++; s.site.intake=null; invalidate(s,['site:'],'语言文稿已修改'); break;
      case 'receiveSiteTranslations':
        active(s); s.site.languages=AT.receive(s,p.request,p.envelope); s.site.revision++; s.site.intake=null; invalidate(s,['site:'],'自动翻译已更新'); break;
      case 'reviewTranslation':
        active(s); s.site.languages=L.review(s,p.locale); s.site.revision++; s.site.intake=null; invalidate(s,['site:'],'语言版本已核对'); break;
      case 'setLogo':
        active(s); requireThat(/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(p.data || '') && p.data.length < F.policy.maxLogoBytes * 1.4, 'Logo 只接受大小受限的 PNG/JPEG/WebP');
        siteChange(s,copy(s.site.blocks),s.site.design,{logo:p.data});s.site.redo=[];break;
      case 'setDomain':
        active(s); s.site.domain = text(p.domain, 150).toLowerCase(); siteChange(s, copy(s.site.blocks)); break;
      case 'confirmSite': {
        active(s); const scan = scanSite(s); requireThat(scan.ready, scan.errors.join('；'));
        requireThat(p.structure === true && p.content === true, '请分别核对结构与实际内容。');
        approve(s, 'site:structure', s.site.revision, { mapping: s.site.entry, blockIds: s.site.blocks.map(b => b.id) });
        approve(s, 'site:content', s.site.revision, { hash: scan.hash }); break;
      }
      case 'testIntake':
        active(s); requireThat(approval(s, 'site:content', s.site.revision), '先确认当前网站内容。');
        s.site.intake = { revision: s.site.revision, status: s.faults.intakeFail ? 'FAILED' : 'SAVED_ASSIGNED_DEMO', tenant: s.tenant, isTest: true, id: 'intake-' + (++s.sequence) }; break;
      case 'publishSite': {
        active(s); const scan = scanSite(s); requireThat(scan.ready, scan.errors.join('；'));
        requireThat(approval(s, 'site:structure', s.site.revision) && approval(s, 'site:content', s.site.revision), '结构或内容修订尚未确认。');
        requireThat(s.site.intake?.revision === s.site.revision && s.site.intake.status === 'SAVED_ASSIGNED_DEMO', '询盘保存/分派测试未通过，不能标为接收正常。');
        requireThat(p.confirm === true, '请明确确认当前版本与演示目标域名。');
        approve(s, 'site:publish', s.site.revision, { hash: scan.hash, domain: s.site.domain });
        s.site.release = { revision: s.site.revision, hash: scan.hash, domain: s.site.domain, status: 'PUBLISHED_DEMO', realDeployment: false }; s.site.correctionRequired = false; break;
      }
      case 'prepareContent':
        planned(s); requireThat(s.site.blocks.length, '先准备网站栏目，让内容有明确回填位置。');
        s.content.revision++; s.content.companyRevision = s.company.revision; s.content.siteRevision = s.site.revision;
        s.content.script = `${s.company.draft.name}：${s.company.draft.product}。${s.company.draft.facts}请告诉我们您的应用场景，先核对适配条件。`;
        s.content.captions = ['您要解决什么问题？', s.company.draft.strength, '先核对材料与图纸，再讨论下一步'];
        s.content.status = 'DRAFT'; s.content.manifest = null; invalidate(s, ['content:', 'social:'], '内容新修订'); break;
      case 'saveContent':
        planned(s); requireThat(s.content.revision > 0, '先生成制作单'); requireThat(text(p.script), '内容不能为空');
        s.content.revision++; s.content.script = text(p.script); s.content.captions = s.content.script.split(/[。！？\n]/).filter(Boolean).slice(0, 3); s.content.status = 'DRAFT'; s.content.manifest = null; invalidate(s, ['content:', 'social:'], '内容已修改'); break;
      case 'confirmContent':
        planned(s); requireThat(s.content.companyRevision === s.company.revision, '制作单使用旧事实，先重新准备。');
        requireThat(!/保证成交|ISO\s*9001|CE认证|[$¥￥]\s*\d/i.test(s.content.script), '新增价格/认证/承诺缺少已确认事实字段');
        approve(s, 'content:artifact', s.content.revision, { script: fingerprint(s.content.script) }); s.content.status = 'CONFIRMED'; break;
      case 'receiveContent': {
        planned(s); requireThat(!s.content.offline, 'FDE 离线，制作单已保存；恢复后重新校验版本。');
        requireThat(approval(s, 'content:artifact', s.content.revision), '先确认当前内容修订');
        requireThat(p.siteRevision === s.site.revision && s.content.siteRevision === s.site.revision && p.contentRevision === s.content.revision, '目标或内容版本变化；迟到产物不能覆盖新稿。');
        requireThat(p.artifactType === 'text' || (p.artifactType === 'video' && p.bytes > 0 && /^[a-f0-9]{64}$/.test(p.sha256 || '')), '视频必须有真实本地文件及 SHA-256');
        s.content.manifest = { id: 'artifact-' + (++s.sequence), tenant: s.tenant, revision: s.content.revision, siteRevision: s.site.revision, type: p.artifactType, hash: p.sha256 || fingerprint(s.content.script), bytes: p.bytes || 0, environment: 'LOCAL_ARTIFACT', editableProject: true, media: '合成示意，非实拍', slot: 'media' };
        const blocks = s.site.blocks.filter(b => b.id !== 'media');
        blocks.splice(2, 0, { id: 'media', title: p.artifactType === 'video' ? '产品说明 · 合成示意视频' : '产品合作说明', body: s.content.script, visible: true, rights: 'OWN' });
        siteChange(s, blocks); s.content.siteRevision = s.site.revision; s.content.status = 'RECEIVED'; break;
      }
      case 'prepareSocial':
        planned(s); requireThat(!s.growth?.channels||G.config(s).channels.length,'先选择本轮社媒渠道'); requireThat(s.content.manifest, '先交付一份内容，再改编为社媒。');
        requireThat(approval(s, 'content:artifact', s.content.revision) && s.content.companyRevision === s.company.revision, '内容依据已失效，先重新核对制作单。');
        s.social.revision++; s.social.caption = `${s.company.draft.product}，先从您的应用场景聊起。\n${s.content.script}\n了解合作流程：${s.site.domain}\n#产品介绍 #合作交流`;
        s.social.targets=s.growth?.channels?[...G.config(s).channels]:G.socialTargets(s);
        s.social.title=s.company.draft.product;s.social.origin='content';s.social.contentRevision = s.content.revision; s.social.markets=L.settings(s).markets;s.social.locale=L.settings(s).source; s.social.status = 'DRAFT'; s.social.receipt = null; invalidate(s, ['social:'], '社媒新稿'); break;
      case 'newSocial': {
        planned(s);const old=s.social;
        s.social={revision:old.revision+1,caption:'',title:'',media:{type:'text',source:'none'},channel:old.channel,targets:G.socialTargets(s),mode:old.mode,markets:old.markets,locale:old.locale,status:'DRAFT',receipt:null,publications:old.publications||[],origin:'manual'};
        invalidate(s,['social:'],'新建社媒内容');break;
      }
      case 'saveSocial':
        planned(s); requireThat(!p.channel||G.channels.some(x=>x.name===p.channel), '社媒平台无效');
        requireThat(['connector', 'manual'].includes(p.mode), '执行方式无效');
        if(p.markets){requireThat(Array.isArray(p.markets)&&p.markets.every(x=>L.settings(s).markets.includes(x)),'帖子市场必须来自已选市场');s.social.markets=[...new Set(p.markets)];}
        if(p.locale){requireThat(L.settings(s).enabled.includes(p.locale),'帖子语言必须来自已选语言');s.social.locale=p.locale;}
        if(p.channel&&!G.socialTargets(s).includes(G.channels.find(x=>x.name===p.channel).id)&&(!s.growth?.channels||G.config(s).channels.includes(G.channels.find(x=>x.name===p.channel).id)))s.social.targets=[G.channels.find(x=>x.name===p.channel).id];
        for(const key of SM.fields)if(Object.hasOwn(p,key))s.social[key]=text(p[key],key==='title'?300:1000);
        if(s.social.coverUrl)requireThat(SM.safeUrl(s.social.coverUrl),'封面须为 HTTPS 图片链接');
        if(s.social.visibility)requireThat(['public','unlisted','private'].includes(s.social.visibility),'可见范围无效');
        if(s.social.youtubeAudience)requireThat(['yes','no'].includes(s.social.youtubeAudience),'儿童受众选项无效');
        s.social.revision++; s.social.caption = text(p.caption); s.social.channel = p.channel; s.social.mode = p.mode; s.social.status = 'DRAFT'; s.social.receipt = null; invalidate(s, ['social:'], '社媒内容或账号变化'); break;
      case 'saveSocialMedia': {
        planned(s);const media=SM.normalize(p.media);
        if(media.source==='content')requireThat(s.content.manifest?.type==='video'&&s.content.manifest.id===media.artifact,'视频产物已变化，请重新选择');
        s.social.media=media;s.social.revision++;s.social.status='DRAFT';s.social.receipt=null;invalidate(s,['social:'],'发布视频改变');break;
      }
      case 'saveSocialTargets': {
        active(s);requireThat(Array.isArray(p.ids)&&p.ids.every(id=>G.channels.some(x=>x.id===id)&&(!s.growth?.channels||G.config(s).channels.includes(id))),'发布平台必须来自本轮已选渠道');
        s.social.targets=[...new Set(p.ids)];s.social.channel=G.channels.find(x=>x.id===s.social.targets[0])?.name||'';
        s.social.revision++;s.social.status='DRAFT';s.social.receipt=null;invalidate(s,['social:'],'发布平台改变');break;
      }
      case 'publishSocial': {
        if(SM.current(s).type==='video'){
          const media=SM.normalize(SM.current(s));requireThat(media.source!=='none','请先添加可播放的视频');
          if(media.source==='content')requireThat(s.content.manifest?.type==='video'&&s.content.manifest.id===media.artifact,'视频产物已变化，请重新选择');
        }
        planned(s); requireThat(G.socialTargets(s).length&&G.socialTargets(s).every(id=>G.channels.some(x=>x.id===id)&&(!s.growth?.channels||G.config(s).channels.includes(id))),'当前社媒已移出目标计划或没有选择发布平台，请重新选择');
        requireThat(!s.social.contentRevision||s.social.contentRevision===s.content.revision,'内容版本变化，请重新准备社媒稿。');
        const problems=SM.errors(s,G.socialTargets(s));requireThat(!problems.length,problems.join('；'));
        requireThat(!/ISO\s*9001|保证成交|CE认证|[$¥￥]\s*\d/i.test(s.social.caption), '社媒稿包含未确认的声明');
        requireThat(s.site.release?.revision === s.site.revision && !s.site.correctionRequired, '先完成当前网站版本及接收测试。');
        requireThat(p.confirm === true, '请核对账号、内容、执行方式及本次费用。');
        const snapshot={...SM.metadata(s),caption:s.social.caption,channel:s.social.channel,revision:s.social.revision,targets:G.socialTargets(s).map(id=>({id,account:G.channelAccount(s,id).account})),mode:s.social.mode,media:SM.current(s),markets:s.social.markets||[],environment:s.social.mode==='manual'?'MANUAL':'SIMULATED',hash:fingerprint([SM.metadata(s),s.social.caption,SM.current(s)])};
        approve(s,'social:publish',s.social.revision,snapshot);snapshot.approvalId=approval(s,'social:publish',s.social.revision).id;
        if(s.social.mode==='manual'){SM.remember(s,snapshot,snapshot.approvalId,'MANUAL_TODO');s.social.status='MANUAL_TODO';}
        else {const op=start(s,'social',`social:${s.social.revision}`,'social',{publication:snapshot});if(op.status==='UNKNOWN')SM.remember(s,snapshot,op.id,'UNKNOWN');s.social.status=op.status==='UNKNOWN'?'RECONCILING':'PUBLISHED_DEMO';}break;
      }
      case 'updateSocialTask': {
        active(s);const r=s.social.publications?.find(x=>x.id===p.id);requireThat(r&&r.environment==='MANUAL','找不到可登记的发布任务');
        const now=new Date().toISOString();
        if(p.status==='MANUAL_RECORDED'){
          requireThat(['MANUAL_TODO','FAILED'].includes(r.status),'这项任务已完成');
          const reference=text(p.reference,160);requireThat(p.url||reference,'请填写原文链接或平台发布记录编号');
          const url=p.url?SM.publicationUrl(p.url,r.platform):'',at=new Date(p.publishedAt);
          requireThat(Number.isFinite(at.getTime())&&at.getTime()<=Date.now()+60000,'请填写有效的实际发布时间');
          Object.assign(r,{status:'MANUAL_RECORDED',url,reference,publishedAt:at.toISOString(),reason:''});
        }else if(p.status==='FAILED'){
          requireThat(r.status==='MANUAL_TODO','仅待完成任务可以记录失败');requireThat(text(p.reason),'请填写失败原因');r.status='FAILED';r.reason=text(p.reason,1000);
        }else if(p.status==='MANUAL_TODO'){
          requireThat(r.status==='FAILED','仅失败任务可以重新处理');r.status='MANUAL_TODO';r.reason='';
        }else fail('任务状态无效');
        r.updatedAt=now;r.events.push({at:now,status:r.status,reason:r.reason,url:r.url||'',reference:r.reference||''});break;
      }
      case 'manualSocialReceipt':
        planned(s); requireThat(s.social.status === 'MANUAL_TODO', '没有待完成的人工发布任务');
        requireThat(approval(s, 'social:publish', s.social.revision) && s.site.release?.revision === s.site.revision, '发布内容或目标已变，先重新核对');
        requireThat(/^https:\/\/[a-z0-9.-]+\.example\//.test(p.url || ''), '演示佐证请使用 https://social.example/post/1 形式');
        s.social.status = 'MANUAL_RECORDED_DEMO'; s.social.receipt = text(p.url); break;
      case 'research': {
        planned(s);
        requireThat(!s.leads.candidates.some(c => c.status === 'ACCEPTED'), '已接受的机会保留，不用重复研究覆盖；新范围需下一轮计划。');
        if (s.leads.sourceFailure) { s.leads.status = 'SOURCE_UNAVAILABLE'; break; }
        const op = start(s, 'leads', `research:${s.plan.revision}:${s.company.revision}`, 'research');
        if (op.status === 'SUCCEEDED') {
          s.leads.candidates = p.empty ? [] : candidateSamples(s).map(c => ({ ...c, status: 'CANDIDATE', companyRevision: s.company.revision })); s.leads.status = p.empty ? 'VERIFIED_EMPTY_DEMO' : 'RESULT_READY';
        } break;
      }
      case 'acceptCandidate': {
        planned(s); const c = s.leads.candidates.find(c => c.id === p.id);
        requireThat(c && c.status !== 'DISCARDED' && c.license === 'ALLOW' && c.evidence && c.hypothesis, '候选已放弃或缺少来源许可/具体证据假设，不能接受。');
        if (c.status === 'ACCEPTED') { s.leads.selected = c.id; break; }
        c.status = 'ACCEPTED'; c.acceptedAt = new Date().toISOString(); s.leads.selected = c.id; s.leads.revision++; s.leads.channel = 'email';
        s.leads.script = `您好，我们是${s.company.draft.name}。看到贵司的业务介绍，想先了解是否有${s.company.draft.product}相关配套需求。${s.company.draft.facts}如不适合或不希望继续联系，请告知。`;
        break;
      }
      case 'discardCandidate': {
        const c = s.leads.candidates.find(c => c.id === p.id); requireThat(c && c.status !== 'ACCEPTED', '已接受机会需单独结案，不能当作候选放弃。'); c.status = 'DISCARDED'; break;
      }
      case 'saveContact':
        planned(s); requireThat(['email', 'whatsapp', 'manual'].includes(p.channel), '渠道无效');
        s.leads.channel = p.channel; s.leads.script = text(p.script); s.leads.revision++; invalidate(s, ['contact:'], '联系内容/渠道变化'); break;
      case 'sendContact': {
        planned(s); const c = canContact(s); requireThat(p.confirm === true, '请确认具体对象、内容及渠道。');
        requireThat(!/ISO\s*9001|CE认证|保证成交|[$¥￥]\s*\d/i.test(s.leads.script), '联系正文含未确认的产品声明');
        requireThat(!s.timeline.some(t => t.kind === 'CONTACT' && t.candidate === c.id), '本演示每个机会只执行一个初次联系；后续需单独计划，不能重复联系。');
        approve(s, 'contact:send', s.leads.revision, { candidate: c.id, channel: s.leads.channel, script: fingerprint(s.leads.script) });
        if (s.leads.channel === 'manual') { s.leads.manualTask = { candidate: c.id, revision: s.leads.revision, owner: '业务负责人', status: 'TODO' }; break; }
        const op = start(s, 'leads', `contact:${c.id}:${s.leads.revision}`, 'contact', { candidate: c.id, channel: s.leads.channel });
        if (op.status === 'SUCCEEDED') s.leads.sequence = 'FIRST_SENT_NO_FOLLOWUP_AUTH'; break;
      }
      case 'manualContactReceipt': {
        planned(s); const c = canContact(s); const task = s.leads.manualTask;
        requireThat(task && task.status === 'TODO' && task.candidate === c.id && task.revision === s.leads.revision, '人工任务不存在或版本已改变');
        requireThat(approval(s, 'contact:send', s.leads.revision), '人工联系确认失效'); requireThat(text(p.note).length > 3, '请记录本次人工联系结果');
        task.status = 'RECORDED_DEMO'; s.timeline.push({ kind: 'CONTACT', candidate: c.id, channel: 'manual', note: text(p.note), isTest: true }); break;
      }
      case 'enableSequence':
        planned(s); canContact(s); requireThat(p.confirm === true, '每步内容和停止条件都需要确认');
        requireThat(s.timeline.some(t => t.kind === 'CONTACT' && t.candidate === s.leads.selected), '先有初次联系结果');
        requireThat(!s.inbox.some(m => m.candidate === s.leads.selected), '已有回复，不能重新启动该联系序列');
        s.leads.sequence = 'WAITING_DEMO'; s.leads.followup = { script: '补充合作流程资料，若不相关将停止联系。', stopOnReply: true, revision: s.leads.revision }; break;
      case 'injectInquiry': {
        // Reception remains possible while paused. All events here are controlled tests.
        const key = text(p.key || 'inquiry-demo-1'); if (s.inbox.some(m => m.externalId === key)) break;
        const c = selected(s); const m = { id: 'msg-' + (++s.sequence), externalId: key, tenant: s.tenant, candidate: c?.id || null,
          ...copy(F.incoming), original: text(p.original || F.incoming.original), channel: p.channel || 'form', isTest: true, status: 'NEEDS_REPLY', companyRevision: s.company.revision, replyRevision: 1,
          draft: `感谢说明需求。我们可以先评估图纸，请补充材料、数量和使用条件。${s.company.draft.facts}收到后由技术负责人确认适配性，价格与交期另行确认。`, next: '技术负责人核对材料和图纸', deadline: '下一个工作日', replyReceipt: null };
        s.inbox.push(m); if (m.candidate) s.leads.sequence = 'STOPPED_REPLY'; break;
      }
      case 'saveReply': {
        planned(s); const m = s.inbox.find(m => m.id === p.id); requireThat(m, '消息不存在'); requireThat(!m.replyReceipt, '已发生回复保留；新回复需新消息/计划');
        requireThat(text(p.draft) && text(p.owner) && text(p.next), '请填写回复、负责人和下一步。');
        m.draft = text(p.draft); m.owner = text(p.owner, 80); m.next = text(p.next); m.replyRevision++; m.companyRevision = s.company.revision; invalidate(s, ['reply:' + m.id], '回复修订'); break;
      }
      case 'sendReply': {
        planned(s); const m = s.inbox.find(m => m.id === p.id); requireThat(m && !m.replyReceipt && !['CLOSED', 'STOPPED'].includes(m.status), '消息已回复或结束');
        requireThat(!m.candidate || !s.leads.suppressions.some(x => x.candidate === m.candidate), '该联系人有停联/退信标记，本演示先暂停外发。');
        requireThat(m.companyRevision === s.company.revision, '回复依据过期，先重新核对内容');
        requireThat(!/ISO\s*9001|CE认证|保证成交|[$¥￥]\s*\d/i.test(m.draft), '价格/认证/承诺缺少已确认资料');
        if(m.quoteRef)G.quoteForReply(s,m.quoteRef.id,m.quoteRef.revision,m.id);
        requireThat(p.confirm === true, '请明确确认本条回复');
        approve(s, 'reply:' + m.id, m.replyRevision, { body: fingerprint(m.draft), owner: m.owner, next: m.next });
        start(s, 'inbox', `reply:${m.id}:${m.replyRevision}`, 'reply', { message: m.id, quoteRef:copy(m.quoteRef||null) }); break;
      }
      case 'closeInquiry': {
        const m = s.inbox.find(m => m.id === p.id); requireThat(m && text(p.reason), '请注明无需回复的原因'); m.status = 'CLOSED'; m.closeReason = text(p.reason); break;
      }
      case 'suppress': {
        const c = selected(s); requireThat(c, '先选择一个机会');
        requireThat(['UNSUBSCRIBE', 'SALES_DNC', 'HARD_BOUNCE', 'SOFT_BOUNCE'].includes(p.kind), '抑制类型无效');
        s.leads.suppressions.push({ candidate: c.id, kind: p.kind, scope: p.kind.includes('BOUNCE') ? 'ADDRESS_REVIEW' : 'CONTACT_ALL_MARKETING', at: new Date().toISOString() });
        s.leads.sequence = 'STOPPED_' + p.kind;
        s.inbox.filter(m => m.candidate === c.id).forEach(m => { m.status = 'STOPPED'; }); break;
      }
      case 'prepareLoop':
        planned(s); requireThat(s.plan.loop < F.policy.maxLoops, '演示循环上限已到，保存结果并暂停；不会无限生成。');
        s.plan.next = { basis: s.inbox.length ? '测试询问集中在材料适配；此结论仅来自演练，不代表市场趋势。' : '没有真实渠道数据，先核对接收链和资料缺口，不扩大投放。', change: s.inbox.length ? '新增“如何准备图纸和材料信息”问答稿' : '补充图纸/材料提交说明并验证接收路径', draft: '请提供应用场景、材料、关键尺寸和预计数量。适配性、价格与交期由负责人核对后说明。', needs: '新公开版本需重新确认；新增支出需明确上限', status: 'DRAFT' }; break;
      case 'adoptLoop':
        planned(s); requireThat(s.plan.next && s.plan.loop < F.policy.maxLoops, '先准备下一轮建议');
        s.plan.loop++; s.plan.revision++;
        siteChange(s, [...s.site.blocks.filter(b => b.id !== 'faq'), { id: 'faq', title: '如何开始一次需求评估？', body: s.plan.next.draft, rights: 'OWN', visible: true }]);
        s.plan.next.status = 'ADOPTED_DRAFT'; s.plan.next = null; break;
      case 'saveMemory':
        active(s); s.memory.revision++; s.memory.style = text(p.style, 500); s.memory.active = p.active === true; s.memory.source = '本租户负责人明确保存'; break;
      case 'pause': s.paused = true; break;
      case 'resume': requireThat(!s.isolated, '隔离需要 OPS 处置'); s.paused = false; break;
      case 'withdraw': {
        const a = s.approvals.find(a => a.id === p.id); requireThat(a && a.status === 'CONFIRMED', '确认已失效或撤回');
        a.status = 'WITHDRAWN'; a.reason = '负责人主动撤回';
        if (a.scope.startsWith('site:')) { s.site.correctionRequired = !!s.site.release; s.site.intake = null; }
        if (a.scope.startsWith('contact:')) s.leads.sequence = 'STOPPED_WITHDRAWN'; break;
      }
      case 'fault':
        requireThat(['unknownNext', 'intakeFail', 'fdeOffline', 'sourceFailure', 'tenantMismatch', 'rightsUnknown'].includes(p.kind), '未知演练故障');
        if (p.kind === 'fdeOffline') s.content.offline = !!p.enabled;
        else if (p.kind === 'sourceFailure') s.leads.sourceFailure = !!p.enabled;
        else if (p.kind === 'tenantMismatch') s.isolated = true;
        else if (p.kind === 'rightsUnknown') { const blocks = copy(s.site.blocks); requireThat(blocks.length, '先建立框架'); blocks[0].rights = p.enabled ? 'UNKNOWN' : 'OWN'; siteChange(s, blocks); }
        else s.faults[p.kind] = !!p.enabled;
        break;
      case 'reconcile': {
        const op = s.operations.find(o => o.id === p.id); requireThat(op && op.status === 'UNKNOWN', '原操作不在核对中');
        settle(s, op, p.success === true);
        if (op.kind === 'analyse') {const target=s.business&&(op.meta.siteId||'site-main')!==B.activeId(s)?B.site(s,op.meta.siteId||'site-main')?.document:s.site;if(target)target.referenceStatus=p.success?'DEMO_BLUEPRINT':'FAILED';}
        break;
      }
      default:
        if(type==='geoSave'){GEO.apply(s,type,p);break;}
        if(['customerOpen','customerSave','customerPromote'].includes(type)){CRM.apply(s,type,p);break;}
        if(AR.actions.has(type)){AR.apply(s,type,p);break;}
        if(IM.actions.has(type)){IM.apply(s,type,p);break;}
        if(SW.actions.has(type)){active(s);if(type==='rehearseWebsiteRelease'){const scan=scanSite(s);requireThat(scan.ready,scan.errors.join('；'));}SW.apply(s,type,p);break;}
        if(B?.actions.has(type)){active(s);B.apply(s,type,p);break;}
        if(P.actions.has(type)){
          active(s);if(type!=='saveProspectSources'&&!P.acquisition.actions.has(type))planned(s);
          P.apply(s,type,p);break;
        }
        if(G.analysisActions.has(type)){
          if(type==='analyseRecords')requireThat(!(p.ids||[]).some(id=>s.inbox.find(m=>m.id===id)?.reception),'数字员工会话请在消息接待中处理');
          if(type==='applyAnalysis')requireThat(!(p.items||[]).some(x=>s.inbox.find(m=>m.id===x.id)?.reception),'数字员工会话请在消息接待中处理');
          active(s);if(['analyseRecords','applyAnalysis','saveQuote','reviewQuote','attachQuote','detachQuote'].includes(type))planned(s);
          G.apply(s,type,p);
          if(type==='undoSitemap'&&!s.site.sitemap.nodes.length&&state.site.sitemap?.appliedNodes?.length){
            siteChange(s,copy(s.site.blocks),s.site.design);Object.assign(s.site.sitemap,{appliedNodes:[],appliedRevision:s.site.sitemap.revision});
            s.site.history[s.site.history.length-1]=siteSnapshot(state);s.site.revisions[s.site.revisions.length-1]=siteSnapshot(state);s.site.redo=[];
          }
          if(type==='saveChannels'){
            const names=G.channels.filter(x=>G.config(s).channels.includes(x.id)).map(x=>x.name);
            const old=G.socialTargets(s),targets=old.filter(id=>G.config(s).channels.includes(id));
            if(!names.includes(s.social.channel)||targets.length!==old.length){s.social.targets=targets;s.social.channel=G.channels.find(x=>x.id===targets[0])?.name||names[0]||'';s.social.revision++;s.social.status='NEEDS_REVIEW';s.social.receipt=null;invalidate(s,['social:'],'社媒选择改变');}
          }
          if(type==='saveChannelAccount'&&G.socialTargets(s).includes(p.id)){s.social.revision++;s.social.receipt=null;s.social.status='DRAFT';invalidate(s,['social:'],'发布账号配置改变');}
        }else fail('未知操作：' + type);
    }
    if(s._businessContext){s.company=canonicalCompany;delete s._businessContext;}
    if(B)B.after(s,type,state);
    s.revision++; event(s, type, { revision: s.revision }); return s;
  }
  const api = { fresh, dispatch, budget, approval, scanSite, resultCard, workOverview, nextAction, fingerprint, esc, selected, fixtures: F };
  if (typeof module !== 'undefined') module.exports = api; else root.LGACore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
