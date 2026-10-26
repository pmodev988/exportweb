(function(root){
  'use strict';
  const R=typeof module!=='undefined'&&module.exports?require('./rich-content.js'):root.LGARichContent;
  const M=typeof module!=='undefined'&&module.exports?require('./market-languages.js'):root.LGAMarketLanguages;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const languages=[...new Set(['zh-Hans','zh-Hant','en','ja','ko','ar','fr','de','es','pt','ru','hi',...Object.values(M.territories).flatMap(v=>[...v.recommended,...v.regional])])].sort();
  const valid=id=>languages.includes(id), check=(ok,msg)=>{if(!ok)throw new Error(msg);};
  function settings(s){const c=clone(s.site.languages||{markets:[],source:'zh-Hans',default:'zh-Hans',enabled:['zh-Hans'],translations:{},marketLinked:true});if(c.marketLinked===undefined)c.marketLinked=true;if(c.marketLinked){c.enabled=linked(c.markets,c.source);if(!c.enabled.includes(c.default))c.default=c.source;}return c;}
  function name(code,locale='zh-CN',type='language'){try{return new Intl.DisplayNames([locale],{type}).of(code)||code;}catch{return code;}}
  function recommend(markets){return [...new Set(markets.flatMap(m=>(M.territories[m]?.recommended||[]).map(id=>id==='zh'?'zh-Hans':id)))];}
  function linked(markets,source='zh-Hans'){return [...new Set([source,...recommend(markets).filter(id=>id!=='und')])];}
  function regional(markets){return [...new Set(markets.flatMap(m=>M.territories[m]?.regional||[]))];}
  const rtl=code=>/^(ar|fa|he|ur|ps|sd|ug|dv|yi)(-|$)|-Arab|-Hebr/.test(code);
  function menuNodes(s){const m=s.site.sitemap,nodes=m?.appliedNodes||((m?.appliedRevision===m?.revision?m:m?.history?.find(h=>h.revision===m.appliedRevision))?.nodes)||[];return nodes.filter(n=>{let current=n;while(current){if(!current.visible)return false;current=nodes.find(x=>x.id===current.parent);}return true;});}
  const source=s=>JSON.stringify({tenant:s.tenant,companyRevision:s.company.revision,brand:s.company.draft.name,logo:s.site.logo??s.company.logo,source:settings(s).source,sourceLabels:settings(s).sourceLabels||labels(settings(s).source),navigation:menuNodes(s).map(({id,parent,title,path})=>({id,parent,title,path})),blocks:s.site.blocks.filter(b=>b.visible).map(b=>({id:b.id,title:b.title,body:b.body,rights:b.rights,...(b.rich?{rich:b.rich}:{})}))});
  const defaults={
    'zh-Hans':{cta:'联系我们',nav:'网站栏目',notice:'本地预览 · 尚未上线 · 未连接询盘服务',footer:'画面为方案示意，非产品实拍。公开发布与询问接收需要真实部署及验证。'},
    en:{cta:'Contact us',nav:'Site navigation',notice:'Local preview · Not published · Inquiry service is not connected',footer:'Concept visuals, not product photography. Publishing and inquiry delivery require deployment and verification.'},
    ja:{cta:'お問い合わせ',nav:'サイトメニュー',notice:'ローカルプレビュー・未公開・問い合わせサービス未接続',footer:'画像はイメージです。公開とお問い合わせ受付には実際の配備と確認が必要です。'},
    fr:{cta:'Nous contacter',nav:'Navigation du site',notice:'Aperçu local · Non publié · Service de demande non connecté',footer:'Visuels conceptuels. La publication et la réception des demandes nécessitent un déploiement et une vérification.'},
    ar:{cta:'اتصل بنا',nav:'تصفح الموقع',notice:'معاينة محلية · غير منشور · خدمة الاستفسارات غير متصلة',footer:'صور توضيحية وليست صوراً للمنتجات. يتطلب النشر واستقبال الاستفسارات إعداد الخدمة والتحقق منها.'}
  };
  const labels=locale=>clone(defaults[locale]||defaults[locale.split('-')[0]]||{cta:'',nav:'',notice:'',footer:''});
  function draft(s,locale){return clone({navigation:{},...(settings(s).translations[locale]||{blocks:{},labels:labels(locale),status:'DRAFT',source:''})});}
  function complete(s,t){return s.site.blocks.some(b=>b.visible)&&s.site.blocks.filter(b=>b.visible).every(b=>t.blocks[b.id]?.title?.trim()&&t.blocks[b.id]?.body?.trim())&&menuNodes(s).every(n=>t.navigation?.[n.id]?.trim())&&['cta','nav','notice','footer'].every(k=>t.labels?.[k]?.trim());}
  function status(s,locale){const c=settings(s);if(locale===c.source)return Object.values(c.sourceLabels||labels(c.source)).every(v=>String(v).trim())?'SOURCE':'SOURCE_DRAFT';const t=c.translations[locale];if(!t)return 'PENDING';if(t.source!==source(s))return 'STALE';return complete(s,t)?(t.simulated?'AUTO_DEMO':'READY'):'DRAFT';}
  const ready=s=>settings(s).enabled.filter(l=>['SOURCE','READY','AUTO_DEMO'].includes(status(s,l)));
  function configure(s,p){
    const old=settings(s),c=clone(old);
    check(Array.isArray(p.markets)&&p.markets.every(x=>Object.hasOwn(M.territories,x)&&x!=='ZZ'),'请选择列表中的国家或地区');
    check(valid(p.source)&&valid(p.default)&&Array.isArray(p.enabled)&&p.enabled.every(valid),'请选择支持的网站语言');
    c.markets=[...new Set(p.markets)];c.source=p.source;c.marketLinked=p.marketLinked===true;c.enabled=c.marketLinked?linked(c.markets,c.source):[...new Set([p.source,...p.enabled])];c.default=c.marketLinked&&!c.enabled.includes(p.default)?c.source:p.default;
    if(c.source!==old.source&&(!p.sourceLabels||JSON.stringify(p.sourceLabels)===JSON.stringify(old.sourceLabels||labels(old.source))))c.sourceLabels=labels(c.source);else if(p.sourceLabels)c.sourceLabels=Object.fromEntries(['cta','nav','notice','footer'].map(k=>[k,String(p.sourceLabels[k]||'').trim().slice(0,600)]));
    check(c.enabled.includes(c.default),'默认语言必须在网站语言列表中');
    const next={...s,site:{...s.site,languages:c}};
    check(c.default===c.source||ready(next).includes(c.default),'该语言正在准备，完成后即可设为默认语言。');
    return c;
  }
  function save(s,p){
    const c=settings(s);check(valid(p.locale)&&c.enabled.includes(p.locale)&&p.locale!==c.source,'请选择已添加的翻译语言');
    check(p.source===source(s),'原文已变化，请重新打开翻译页并合并修改');
    const old=c.translations[p.locale]||{};
    const t={blocks:{},navigation:{},labels:{},status:'SAVED',source:p.source,...(old.simulated?{simulated:true,model:old.model,placeholderFields:old.placeholderFields||[]}:{})};
    const allowed=s.site.blocks.filter(b=>b.visible);
    check(p.blocks&&typeof p.blocks==='object'&&Object.keys(p.blocks).every(id=>allowed.some(b=>b.id===id)),'翻译栏目与当前网站不一致');
    for(const b of allowed)t.blocks[b.id]={title:String(p.blocks[b.id]?.title||'').trim().slice(0,180),body:String(p.blocks[b.id]?.body||'').trim().slice(0,3000)};
    const menus=menuNodes(s);check(!p.navigation||typeof p.navigation==='object'&&!Array.isArray(p.navigation)&&Object.keys(p.navigation).every(id=>menus.some(n=>n.id===id)),'翻译菜单与当前网站架构不一致');
    for(const n of menus)t.navigation[n.id]=String(p.navigation?.[n.id]||'').trim().slice(0,100);
    for(const k of ['cta','nav','notice','footer'])t.labels[k]=String(p.labels?.[k]||'').trim().slice(0,600);
    if(t.placeholderFields)t.placeholderFields=t.placeholderFields.filter(key=>{const [kind,id]=key.split(':');return kind==='menu'?t.navigation[id]===old.navigation?.[id]:kind==='label'?t.labels[id]===old.labels?.[id]:t.blocks[id]?.[kind]===old.blocks?.[id]?.[kind];});
    c.translations[p.locale]=t;return c;
  }
  function review(s,locale){const c=settings(s),t=c.translations[locale];check(locale!==c.source&&c.enabled.includes(locale)&&t&&t.source===source(s)&&complete(s,t),'请填写完整翻译并保存；原文更新后需要重新核对');t.status='REVIEWED';t.reviewedAt=new Date().toISOString();return c;}
  function localized(s,locale){check(ready(s).includes(locale),'这个语言版本尚未完成，不能用于访客页面');const c=settings(s),out=clone(s);out.site.locale=locale;
    out.site.sourceLocale=c.source;out.site.navigationLabels=locale===c.source?{}:clone(c.translations[locale].navigation||{});
    out.site.chrome=locale===c.source?{...labels(locale),...(c.sourceLabels||{})}:clone(c.translations[locale].labels);
    // Brand names and user material remain explicit customer content.
    if(locale!==c.source)out.site.blocks=out.site.blocks.map(b=>b.visible?{...b,...c.translations[locale].blocks[b.id],...(b.rich?{rich:R.localized(b.rich,c.translations[locale].blocks[b.id]?.body||b.body)}:{})}:b);
    return out;
  }
  function errors(s){const c=settings(s),out=[];if(!ready(s).includes(c.default))out.push('请补全默认语言的网站按钮与说明，或更新译文并重新核对');return out;}
  const api={markets:M.territories,languages,valid,settings,name,recommend,linked,regional,rtl,menuNodes,source,labels,draft,complete,status,ready,configure,save,review,localized,errors};
  if(typeof module!=='undefined')module.exports=api;else root.LGASiteLanguages=api;
})(typeof globalThis!=='undefined'?globalThis:this);
