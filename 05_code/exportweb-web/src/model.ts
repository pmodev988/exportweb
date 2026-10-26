export interface Company {name:string;product:string;strength:string;excluded:string;description:string;markets:string[]}
export interface EntryInfo {date:string;summary:string;image:string}
export interface Page {id:string;parent:string;title:string;path:string;menuCode?:string;ownerPageId?:string;kind?:'menu'|'detail';navPlacement?:'header'|'footer';footerExpanded?:boolean;mountIds?:string[];detailDeleted?:boolean;hidden?:boolean;entry?:EntryInfo;content:Record<string,{title:string;html:string;menuTitle?:string}>}
export interface Communication {whatsapp:string;email:string;phone:string;link:string}
export interface Presentation {mode:'list'|'tabs'|'carousel';pagination:boolean;pageSize:number}
export interface Contact {id:string;type:string;label:string;value:string}
export interface SiteSettings {logo:string;communications:Communication;communicationIds?:string[];publishLanguages:string[]|null;publicationTarget:'platform'|'external';presentations:Record<string,Presentation>;structure?:{template:string;revision:number};labels?:Record<string,Record<string,string>>}
export interface SocialAccount {account:string;profile:string}
export interface SystemSettings {socialAccounts:Record<string,SocialAccount>;channels:string[];contacts?:Contact[]}
export interface Salesperson {id:string;name:string;marketIds:string[];title:string;languages:string;phone:string;email:string;active:boolean;notes:string}
export interface Goal {goal:string;positioning:string;actions:string[]}
export interface WorkspaceData {sales:Salesperson[];goal:Goal;business?:import('./business-workspace').BusinessWorkspace}
export interface Design {pageMode:'multi'|'single';motion:'static'|'subtle'|'expressive'}
export interface SiteDocument {theme:string;languages:string[];sourceLanguage:string;pages:Page[];design:Design;site?:SiteSettings}
export interface Website {id:string;name:string;domain:string;profileMode:'shared'|'independent';profile:Company|null;document:SiteDocument}
export interface Project {company:Company;plan:string;theme:string;languages:string[];sourceLanguage:string;pages:Page[];workspace?:WorkspaceData;design?:Design;site?:SiteSettings;system?:SystemSettings;websites?:{activeId:string;items:Website[]}}
export interface Snapshot {revision:number;project:Project;publishedRevision:number|null;publicUrl:string|null}
export interface Catalog {skeletons:{id:string;name:string;nodes:{id:string;parent:string;title:string;path:string}[]}[];styles:{id:string;name:string}[];themes:{id:string;name:string;style:string;audience:string;distinction:string;goal:string;cta?:string;classes:string;thumbnail:string;heroes:Record<Design['motion'],string>}[];markets:{id:string;zh:string;en:string;keys:string[]}[];marketLanguages:Record<string,string[]>;languageNames:Record<string,string>;languageLabels:Record<string,Record<string,string>>;socialChannels:{id:string;name:string;fit:string;format:string;loginUrl:string}[]}
export interface ImportedWebsite {pages:Page[];warnings:string[];source:string;language?:string;siteId?:string}
export function marketMatches(m:Catalog['markets'][number],query:string):boolean{
  const q=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g,'');
  return !q||m.keys.some(k=>k.includes(q));
}
export function mergeImported(project:Project,result:ImportedWebsite):Project{
  const language=result.language||project.sourceLanguage;
  const languages=Array.from(new Set([...project.languages,language]));
  return {...project,sourceLanguage:language,languages,pages:result.pages,site:project.site?{...project.site,presentations:{},structure:{template:'existing-website',revision:(project.site.structure?.revision||0)+1}}:undefined};
}
export const emptyProject=():Project=>({company:{name:'',product:'',strength:'',excluded:'',description:'',markets:[]},plan:'',theme:'T02',sourceLanguage:'zh-Hans',languages:['zh-Hans'],pages:[]});
export function applySkeleton(project:Project,nodes:Catalog['skeletons'][number]['nodes']):Project {
  const old=new Map(project.pages.filter(p=>p.kind!=='detail'&&!p.ownerPageId).map(page=>[page.path,page]));
  const used=new Set(project.pages.map(p=>p.id));
  const ids=new Map(nodes.map(n=>{let id=old.get(n.path)?.id;if(!id){id=used.has(n.id)?crypto.randomUUID():n.id;used.add(id);}return [n.id,id];}));
  const pages:Page[]=nodes.map(n=>({...old.get(n.path),...n,id:ids.get(n.id)!,parent:ids.get(n.parent)||'',detailDeleted:old.get(n.path)?.detailDeleted||false,content:old.get(n.path)?.content||{[project.sourceLanguage]:{title:n.title,html:''}}}));
  const kept=new Set(pages.map(p=>p.id));
  for(const page of project.pages)if(!kept.has(page.id)&&(page.kind==='detail'||page.ownerPageId||Object.values(page.content).some(c=>c.html.trim()))){const mountIds=(page.mountIds??[page.ownerPageId||page.id]).filter(id=>kept.has(id));pages.push({...page,kind:'detail',parent:'',menuCode:'',ownerPageId:mountIds[0]||'',mountIds});}
  for(const page of pages)if(page.mountIds)page.mountIds=page.mountIds.filter(id=>kept.has(id));
  return {...project,pages,site:project.site?{...project.site,presentations:Object.fromEntries(Object.entries(project.site.presentations).filter(([id])=>kept.has(id)))}:undefined};
}
export function updateContent(project:Project,id:string,locale:string,title:string,html:string):Project {
  if(!project.languages.includes(locale))throw Error('请选择网站已有语言');
  if(!project.pages.some(p=>p.id===id))throw Error('栏目不存在');
  return {...project,pages:project.pages.map(p=>p.id===id?{...p,title:(p.kind==='detail'||p.ownerPageId)&&locale===project.sourceLanguage?title:p.title,content:{...(locale===project.sourceLanguage&&(p.content[locale]?.title!==title||p.content[locale]?.html!==html)?{}:p.content),[locale]:{title,html,menuTitle:p.content[locale]?.menuTitle||p.title}}}:p)};
}
export function ancestors(pages:Page[],id:string):Page[] {
  const result:Page[]=[],seen=new Set<string>();
  let current=pages.find(p=>p.id===id);
  while(current){if(seen.has(current.id))throw Error('栏目层级循环');seen.add(current.id);result.unshift(current);current=pages.find(p=>p.id===current?.parent);}
  return result;
}
export function readyLanguages(project:Project):string[]{
  const pages=project.pages.filter(p=>!p.hidden&&!p.detailDeleted&&p.content[project.sourceLanguage]?.html.trim());
  return project.languages.filter(locale=>project.pages.length>0&&pages.every(page=>page.content[locale]?.title&&page.content[locale]?.html.trim()));
}
