import {emptyProject,type Project,type Website,type SiteDocument} from './model';
import {defaultSiteSettings,numberMenus} from './site-settings';
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
export function currentDocument(p:Project):SiteDocument{return copy({theme:p.theme,languages:p.languages,sourceLanguage:p.sourceLanguage,pages:p.pages,design:p.design||{pageMode:'multi',motion:'static'},site:p.site||defaultSiteSettings()});}
export function websites(p:Project){
 if(!p.websites?.items.length){
  p.websites={activeId:'',items:[]};
  if(p.pages.length){p.websites.activeId='primary';p.websites.items.push({id:'primary',name:(p.company.name||'公司')+' · 网站',domain:'',profileMode:'shared',profile:null,document:currentDocument(p)});}
 }
 return p.websites;
}
export function activeWebsite(p:Project){return p.websites?.items.find(s=>s.id===p.websites?.activeId);}
export function websiteProject(p:Project):Project{return {...p,company:activeWebsite(p)?.profileMode==='independent'?activeWebsite(p)!.profile||p.company:p.company};}
export function synchronizeWebsite(p:Project){numberMenus(p);const active=activeWebsite(p);if(active)active.document=currentDocument(p);}
export function switchWebsite(p:Project,id:string){const data=websites(p),target=data.items.find(s=>s.id===id);if(!target)throw Error('网站不存在');synchronizeWebsite(p);Object.assign(p,copy(target.document),{site:copy(target.document.site||defaultSiteSettings())});data.activeId=id;}
export function newWebsite(p:Project):Website{return {id:crypto.randomUUID(),name:'',domain:'',profileMode:'shared',profile:copy(p.company),document:currentDocument(emptyProject())};}
