import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),postcss=require('postcss');
// Reuse the approved presentation rules; scope them to native production pages.
// No prototype state, HTML renderer, dispatch function or simulated service is shipped here.
export function prepareWorkspaceStyles(prototype,generated){
 const files=['style.css','theme.css','growth.css','prospecting.css','design.css','detail-studio.css','business.css','self-website.css','insights.css','acquisition.css'];
 const output=[];
 for(const file of files){
  const sheet=postcss.parse(fs.readFileSync(path.join(prototype,file),'utf8'));
  sheet.walkRules(rule=>{
   if(rule.parent.type==='atrule'&&/keyframes$/i.test(rule.parent.name))return;
   rule.selectors=rule.selectors.map(selector=>{
    if([':root','body','.bx-root','html'].includes(selector))return '.approved-page';
    if(selector.startsWith('.bx-root[')||selector.startsWith('html['))return selector.replace(/^(\.bx-root\[[^\]]+\]|html\[[^\]]+\])/,'$1 .approved-page');
    return '.approved-page '+selector.replace(/^body\s+/,'').replace(/^\.bx-root\s+/,'');
   });
  });
  output.push('/* Approved '+file+' */\n'+sheet.toString());
 }
 fs.writeFileSync(path.join(generated,'approved-workspace.css'),output.join('\n'));
}
