import type {Project,SiteSettings,Page,Presentation} from './model';
export const defaultSiteSettings=():SiteSettings=>({logo:'',communications:{whatsapp:'',email:'',phone:'',link:''},publishLanguages:null,publicationTarget:'platform',presentations:{}});
export function settings(p:Project):SiteSettings{return p.site||=defaultSiteSettings();}
export function presentation(p:Project,id:string):Presentation{return settings(p).presentations[id]||={mode:'list',pagination:false,pageSize:10};}
export const isMenu=(page:Page)=>page.kind!=='detail'&&!page.ownerPageId;
export function menus(p:Project):Page[]{return p.pages.filter(isMenu);}
export function mounts(page:Page):string[]{return page.detailDeleted?[]:page.mountIds??[page.ownerPageId||page.id];}
export function menuPosition(pages:Page[],page:Page):'header'|'footer'{
 const seen=new Set<string>();while(page.parent&&!seen.has(page.id)){seen.add(page.id);const parent=pages.find(p=>p.id===page.parent);if(!parent)break;page=parent;}return page.navPlacement||'header';
}
export function menuLabel(pages:Page[],page:Page):string{const labels=[page.title],seen=new Set([page.id]);let p=page;while(p.parent){const parent=pages.find(n=>n.id===p.parent);if(!parent||seen.has(parent.id))break;seen.add(parent.id);labels.unshift(parent.title);p=parent;}return (menuPosition(pages,page)==='footer'?'页脚':'页头')+' / '+labels.join(' / ');}
export function detailsFor(pages:Page[],menuId:string):Page[]{return pages.filter(p=>mounts(p).includes(menuId));}
export function setMounts(page:Page,ids:string[]){page.mountIds=[...new Set(ids)];if(!isMenu(page))page.ownerPageId=page.mountIds[0]||'';}
export function removeMenus(p:Project,ids:Set<string>){
 const retained:Page[]=[];
 for(const page of p.pages){const remaining=mounts(page).filter(id=>!ids.has(id));
  if(ids.has(page.id)){if(page.detailDeleted||!Object.values(page.content).some(c=>c.html.trim()))continue;page.kind='detail';page.parent='';page.menuCode='';page.ownerPageId=remaining[0]||'';}
  if(page.mountIds||page.ownerPageId||ids.has(page.id))setMounts(page,remaining);
  retained.push(page);
 }
 p.pages=retained;for(const id of ids)delete settings(p).presentations[id];
}
export function numberMenus(p:Project){
 const nodes=menus(p),seen=new Set<string>();
 function walk(parent:string,prefix:string,position:string){nodes.filter(n=>n.parent===parent&&(parent||(n.navPlacement||'header')===position)).forEach((n,i)=>{if(seen.has(n.id))throw Error('栏目层级循环');seen.add(n.id);n.menuCode=prefix+String(i+1).padStart(3,'0');walk(n.id,n.menuCode,position);});}
 walk('','M','header');walk('','F','footer');if(seen.size!==nodes.length)throw Error('上级栏目不存在或层级循环');
}
export function removeDetail(p:Project,id:string){
 const page=p.pages.find(x=>x.id===id);if(!page)throw Error('详情不存在');
 if(!isMenu(page))p.pages=p.pages.filter(x=>x.id!==id);else{page.content={};page.detailDeleted=true;}
}
export const websiteSteps=['网站架构','网站风格','Logo','内容详情','智能软文','GEO 优化','网站语言','通讯设置','发布网站','版本记录'] as const;
export type WebsiteStep=typeof websiteSteps[number];
