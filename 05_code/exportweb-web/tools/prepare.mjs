import {build} from 'rolldown';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
import {prepareWorkspaceStyles} from './prepare-workspace-styles.mjs';
const require=createRequire(import.meta.url);
const root=path.resolve(import.meta.dirname,'../../..'),prototype=path.join(root,'03_design/ux/prototype/ai-acquisition');
const S=require(path.join(prototype,'sitemap-catalog.js')),D=require(path.join(prototype,'site-design.js')),Search=require(path.join(prototype,'search.js'));
const output=path.resolve(import.meta.dirname,'../public');
if(fs.existsSync(output)){
 const resolved=fs.realpathSync(output);
 if(resolved!==output||!resolved.startsWith(fs.realpathSync(root)+path.sep))throw Error('Generated asset directory is outside the workspace or is linked');
 fs.rmSync(output,{recursive:true,force:true});
}
fs.mkdirSync(output,{recursive:true});
fs.cpSync(path.join(prototype,'brand'),path.join(output,'brand'),{recursive:true,filter:src=>fs.statSync(src).isDirectory()||/\.(svg|png)$/.test(src)});
const generated=path.resolve(import.meta.dirname,'../src/generated');
fs.mkdirSync(generated,{recursive:true});
prepareWorkspaceStyles(prototype,generated);
fs.writeFileSync(path.join(generated,'market-regions.ts'),'// Generated from the approved market-regions.js.\nexport const marketRegions='+JSON.stringify(require(path.join(prototype,'market-regions.js')).groups)+';\n');
const Languages=require(path.join(prototype,'site-languages.js'));
fs.writeFileSync(path.join(generated,'language-catalog.ts'),'// Generated from the approved market/language catalog.\nexport const marketLanguages:Record<string,string[]>='+JSON.stringify(Object.fromEntries(Object.keys(Languages.markets).map(id=>[id,Languages.recommend([id])])) )+';\n');
fs.appendFileSync(path.join(generated,'language-catalog.ts'),'export const languageLabels:Record<string,Record<string,string>>='+JSON.stringify(Object.fromEntries(Languages.languages.map(id=>[id,Languages.labels(id)])))+';\n');
fs.writeFileSync(path.join(output,'site-theme.css'),D.css+'\n'+fs.readFileSync(path.resolve(import.meta.dirname,'../src/site-view.css'),'utf8'));
const collections=require('postcss').parse(fs.readFileSync(path.join(prototype,'self-website.css'),'utf8'));
collections.walkRules(rule=>{rule.selectors=rule.selectors.filter(s=>/\.sw-(collection|items)/.test(s));if(!rule.selectors.length)rule.remove();});
fs.appendFileSync(path.join(output,'site-theme.css'),'\n'+collections.toString());
const contacts=require('postcss').parse(fs.readFileSync(path.join(prototype,'design.css'),'utf8'));
contacts.walkRules(rule=>{rule.selectors=rule.selectors.filter(s=>/site-contact|has-site-contacts/.test(s));if(!rule.selectors.length)rule.remove();});
fs.appendFileSync(path.join(output,'site-theme.css'),'\n'+contacts.toString());
fs.copyFileSync(path.resolve(import.meta.dirname,'../src/site-view.js'),path.join(output,'site-view.js'));
fs.writeFileSync(path.join(output,'catalog.json'),JSON.stringify({
  skeletons:S.templates.map(t=>({id:t.id,name:t.zh,nodes:S.nodes(t.id)})),
  styles:D.catalog.styles.map(s=>({id:s.id,name:s.name})),
  themes:D.catalog.candidates.map(t=>({id:t.id,name:t.name,style:t.style,audience:t.audience,distinction:t.distinction,goal:t.goal,cta:t.cta,classes:D.themeClasses({candidate:t.id}),thumbnail:D.presentation.thumbnail(t),heroes:Object.fromEntries(['static','subtle','expressive'].map(motion=>[motion,D.presentation.hero(t,{motion,heading:'h1',title:'EXPORTWEB_TITLE_SLOT',bodyHtml:'EXPORTWEB_BODY_SLOT',kicker:'EXPORTWEB_COMPANY_SLOT',actionHtml:'EXPORTWEB_ACTION_SLOT'})]))})),
  markets:Search.data.markets,
  marketLanguages:Object.fromEntries(Object.keys(Languages.markets).map(id=>[id,Languages.recommend([id])])),
  languageNames:Object.fromEntries(Languages.languages.map(id=>[id,Languages.name(id,'zh-CN')])),
  languageLabels:Object.fromEntries(Languages.languages.map(id=>[id,Languages.labels(id)])),
  socialChannels:[]
  ,contentLayouts:require(path.join(prototype,'content-layouts.js')).components.map(c=>({...c,html:require(path.join(prototype,'content-layouts.js')).templates[c.id]}))
}));

const shared=path.join(root,'05_code/shared-experience');
const manifest=JSON.parse(fs.readFileSync(path.join(shared,'manifest.json'),'utf8'));
for(const [file,hash] of Object.entries(manifest.files))if(crypto.createHash('sha256').update(fs.readFileSync(path.join(shared,file))).digest('hex')!==hash)throw Error('Shared experience hash mismatch: '+file);
fs.mkdirSync(path.join(output,'experience'),{recursive:true});
for(const file of Object.keys(manifest.files))if(/\.(css|png)$/.test(file))fs.copyFileSync(path.join(shared,file),path.join(output,'experience',file));


await build({input:path.join(prototype,"site-geo.js"),platform:"browser",output:{format:"esm",file:path.join(generated,"site-geo.js")}});
fs.writeFileSync(path.join(generated,"site-geo.d.ts"),"declare const view:any; export default view;\n");
