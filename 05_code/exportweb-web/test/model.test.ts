import {test} from 'vitest';
import assert from 'node:assert/strict';
import {applySkeleton,updateContent,ancestors,emptyProject,readyLanguages} from '../src/model.ts';
test('skeleton changes preserve original detail by path; each page and language remains independent',()=>{
 let p=applySkeleton(emptyProject(),[{id:'home',parent:'',title:'首页',path:'/'},{id:'equipment',parent:'',title:'设备',path:'/equipment/'}]);
 p=updateContent(p,'equipment','zh-Hans','已保存设备','<p>原有参数</p>');
 p=applySkeleton(p,[{id:'hero',parent:'',title:'首页',path:'/'},{id:'products',parent:'',title:'产品',path:'/equipment/'}]);
 assert.equal(p.pages[1].content['zh-Hans'].html,'<p>原有参数</p>');
 assert.equal(p.pages[0].content['zh-Hans'].html,'');
 assert.throws(()=>updateContent(p,'missing','zh-Hans','',''));assert.throws(()=>updateContent(p,'hero','en','',''));
 assert.equal(p.pages[0].id,'home');assert.equal(p.pages[1].id,'equipment');
 assert.deepEqual(readyLanguages(p),['zh-Hans']);p=updateContent(p,'home','zh-Hans','首页','<p>首页</p>');assert.deepEqual(readyLanguages(p),['zh-Hans']);
});
test('architecture changes retain existing page references and remap new child parents without ID collisions',()=>{
 const p=emptyProject();p.pages=[{id:'new-child',parent:'',title:'设备',path:'/equipment/',content:{'zh-Hans':{title:'设备',html:'<a href="#page-new-child">设备</a><img src="/api/v1/assets/kept">'}}}];
 const next=applySkeleton(p,[{id:'new-parent',parent:'',title:'产品',path:'/equipment/'},{id:'new-child',parent:'new-parent',title:'明细',path:'/detail/'}]);
 assert.equal(next.pages[0].id,'new-child');assert.equal(next.pages[1].parent,'new-child');assert.notEqual(next.pages[1].id,'new-child');assert.deepEqual(next.pages[0].content,p.pages[0].content);
});
test('breadcrumbs preserve hierarchy and reject cycles',()=>{
 const p=applySkeleton(emptyProject(),[{id:'a',parent:'',title:'设备',path:'/a/'},{id:'b',parent:'a',title:'切割',path:'/b/'}]);
 assert.deepEqual(ancestors(p.pages,'b').map(p=>p.id),['a','b']);p.pages[0].parent='b';assert.throws(()=>ancestors(p.pages,'b'));
});
