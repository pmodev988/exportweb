import {test,expect,vi,afterEach} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import {createPinia,setActivePinia} from 'pinia';
import {createRouter,createMemoryHistory} from 'vue-router';
import ElementPlus from 'element-plus';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import {emptyProject,applySkeleton,readyLanguages} from '../src/model';
import {settings,numberMenus,removeDetail,websiteSteps} from '../src/site-settings';
import {websites,newWebsite,switchWebsite,synchronizeWebsite} from '../src/websites';
import {useProject} from '../src/store';
import Website from '../src/Website.vue';
import WebsiteCollection from '../src/WebsiteCollection.vue';

import {translationSheet,importTranslation} from '../src/translation-sheet';
const catalog=JSON.parse(fs.readFileSync('public/catalog.json','utf8'));
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();document.body.innerHTML='';});
test('translation sheets round-trip multiline HTML and labels; invalid locale or stale menu IDs leave the project intact',async()=>{
 vi.stubGlobal('crypto',webcrypto);const p=applySkeleton(emptyProject(),[{id:'hero',parent:'',title:'首页',path:'/'}]);p.languages.push('en');p.pages[0].content.en={title:'A, "title"',html:'<p>line one\nline two</p><img src="https://example.test/logo.png">',menuTitle:'=1+1'};settings(p).labels={en:{footer:'Company, Inc.',cta:'Contact',nav:'',notice:''}};
 const original=JSON.stringify(p),csv=await translationSheet(p,'en'),restored=await importTranslation(p,'en',csv);expect(restored).toEqual(p);await expect(importTranslation(p,'ja',csv)).rejects.toThrow('语言');await expect(importTranslation(p,'en',csv.replace('"hero"','"removed"'))).rejects.toThrow('栏目');expect(JSON.stringify(p)).toBe(original);p.pages[0].content[p.sourceLanguage]={title:'Changed',html:'<p>new</p>'};await expect(importTranslation(p,'en',csv)).rejects.toThrow('原文已变化');
});
test('nested menu numbering follows hierarchy independently for each website; details and settings survive switching',()=>{
 const p=applySkeleton(emptyProject(),[{id:'a',parent:'',title:'A',path:'/'},{id:'b',parent:'a',title:'B',path:'/b/'},{id:'c',parent:'a',title:'C',path:'/c/'},{id:'d',parent:'c',title:'D',path:'/d/'}]);
 numberMenus(p);expect(p.pages.map(n=>n.menuCode)).toEqual(['M001','M001001','M001002','M001002001']);
 settings(p).logo='/api/v1/assets/11111111-1111-1111-1111-111111111111';settings(p).communications.email='a@example.test';settings(p).presentations.a={mode:'tabs',pagination:true,pageSize:2};
 const data=websites(p),first=data.activeId,next=newWebsite(p);next.name='Other';data.items.push(next);switchWebsite(p,next.id);expect(settings(p).logo).toBe('');settings(p).communications.phone='+819012345678';synchronizeWebsite(p);
 switchWebsite(p,first);expect(settings(p).communications.email).toBe('a@example.test');expect(settings(p).communications.phone).toBe('');expect(settings(p).presentations.a.mode).toBe('tabs');
 p.pages.push({id:'detail',parent:'',ownerPageId:'a',title:'Details',path:'/detail/',content:{}});removeDetail(p,'a');expect(p.pages.find(n=>n.id==='a')?.detailDeleted).toBe(true);expect(p.pages.find(n=>n.id==='detail')).toBeDefined();removeDetail(p,'detail');expect(p.pages.some(n=>n.id==='detail')).toBe(false);
 expect(readyLanguages(p)).toEqual(['zh-Hans']);expect(p.company.name).toBe('');expect(p.plan).toBe('');
});
test('formal website exposes the approved website tabs, integrated settings and icon content tree without profile prerequisites',async()=>{
 const pinia=createPinia();setActivePinia(pinia);const store=useProject();store.loaded=true;store.project=applySkeleton(emptyProject(),catalog.skeletons[0].nodes);websites(store.project);store.project.company.markets=['CN','US'];
 vi.spyOn(store,'flush').mockResolvedValue();vi.spyOn(store,'changed').mockImplementation(()=>{});vi.stubGlobal('fetch',vi.fn(async()=>Response.json(catalog)));
 const router=createRouter({history:createMemoryHistory(),routes:[{path:'/website',component:Website}]});await router.push('/website?site=primary');await router.isReady();
 const w=mount(Website,{attachTo:document.body,global:{plugins:[pinia,router,ElementPlus]}});await flushPromises();
 expect(w.findAll('.task-tabs button').slice(0,websiteSteps.length).map(b=>b.text())).toEqual([...websiteSteps]);expect(w.text()).not.toMatch(/完善公司资料|核对公司资料/);
 await w.find('.map-page-link').trigger('click');expect(w.find('.map-properties').text()).toContain('显示方式');expect(w.find('.map-properties').text()).not.toMatch(/页面路径|页面用途|保留这个页面/);
 await w.findAll('.task-tabs button').find(b=>b.text()==='内容详情')!.trigger('click');await flushPromises();expect(w.find('.content-icon svg').exists()).toBe(true);expect(w.find('.content-delete').exists()).toBe(true);expect(w.findAll('.menu-folder-icon').length).toBe(store.project.pages.length);
 await w.findAll('.task-tabs button').find(b=>b.text()==='Logo')!.trigger('click');await flushPromises();expect(w.find('input[type=file]').exists()).toBe(true);expect(w.find('.logo-preview').exists()).toBe(true);
 vi.mocked(store.flush).mockRejectedValueOnce(Error('保存失败'));await w.findAll('.task-tabs button').find(b=>b.text()==='网站语言')!.trigger('click');await flushPromises();expect(w.find('.logo-preview').exists()).toBe(true);expect(w.text()).toContain('保存失败');w.unmount();
});
test('list, tabs and carousel preserve active detail selection across pagination',async()=>{
 const entries=Array.from({length:3},(_,i)=>({id:'d'+i,parent:'',ownerPageId:'hero',path:'/d'+i+'/',title:'Details '+i,content:{},entry:{date:'2026-10-22',image:'',summary:'Summary'}}));
 for(const mode of ['list','tabs','carousel'] as const){const w=mount(WebsiteCollection,{props:{entries,display:{mode,pagination:true,pageSize:2},locale:'en'}});
  expect(w.findAll('.sw-collection-item').filter(x=>x.isVisible())).toHaveLength(mode==='list'?2:1);
  await w.findAll('button').find(b=>b.text()==='下一页')!.trigger('click');expect(w.findAll('.sw-collection-item').filter(x=>x.isVisible())).toHaveLength(1);await w.findAll('button').find(b=>b.text()==='查看详情')!.trigger('click');expect(w.emitted('select')?.[0]).toEqual(['d2']);w.unmount();}
});
