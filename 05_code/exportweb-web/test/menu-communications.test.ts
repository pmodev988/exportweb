import {test,expect,vi,afterEach} from 'vitest';
import {mount} from '@vue/test-utils';
import {webcrypto} from 'node:crypto';
import {emptyProject,applySkeleton,type Page} from '../src/model';
import {isMenu,settings,numberMenus,mounts,detailsFor,setMounts,removeMenus} from '../src/site-settings';
import {globalContacts,selectedContacts,removeContact} from '../src/communications';
import {newWebsite,websites,switchWebsite} from '../src/websites';
import {mediaItems,replaceMedia} from '../src/detail-media';
import SiteMenu from '../src/SiteMenu.vue';
import WebsiteStructure from '../src/WebsiteStructure.vue';
afterEach(()=>vi.unstubAllGlobals());
const menus=():Page[]=>[{id:'header',parent:'',title:'支持',path:'/support/',content:{}},{id:'footer',parent:'',title:'支持',path:'/footer-support/',navPlacement:'footer',footerExpanded:true,content:{}},{id:'child',parent:'footer',title:'售后服务',path:'/service/',content:{}}];
test('same titled header/footer menus remain distinct and footer expansion is independently interactive',async()=>{
 const p=emptyProject();p.pages=menus();numberMenus(p);expect(p.pages.map(n=>n.menuCode)).toEqual(['M001','F001','F001001']);
 const header=mount(SiteMenu,{props:{pages:p.pages,current:'header'}}),footer=mount(SiteMenu,{props:{pages:p.pages,current:'header',position:'footer'}});
 expect(header.findAll('a').map(n=>n.attributes('href'))).toEqual(['#preview-header']);expect(footer.find('button').attributes('aria-expanded')).toBe('true');await footer.find('button').trigger('click');expect(footer.find('.site-dropdown').attributes('hidden')).toBeDefined();await footer.find('button').trigger('click');expect(footer.find('button').attributes('aria-expanded')).toBe('true');header.unmount();footer.unmount();
});
test('one detail appears at each selected menu and survives deleting either menu without duplicate content',()=>{
 const p=emptyProject();p.pages=menus();const detail:Page={id:'d',kind:'detail',parent:'',ownerPageId:'header',title:'服务说明',path:'/detail/',content:{en:{title:'Service',html:'<p>原文</p>'}}};p.pages.push(detail);setMounts(detail,['header','footer']);
 expect(detailsFor(p.pages,'header')).toContain(detail);expect(detailsFor(p.pages,'footer')).toContain(detail);removeMenus(p,new Set(['header']));expect(mounts(detail)).toEqual(['footer']);expect(detail.content.en.html).toBe('<p>原文</p>');removeMenus(p,new Set(['footer','child']));expect(mounts(detail)).toEqual([]);expect(isMenu(detail)).toBe(false);expect(p.pages).toEqual([detail]);
 const changed=applySkeleton(p,[{id:'new',parent:'',title:'新栏目',path:'/new/'}]);expect(changed.pages.find(n=>n.id==='d')?.content.en.html).toBe('<p>原文</p>');
});
test('structure groups positions, applies configured footer expansion and marks shared detail titles',()=>{
 const pages=menus();pages.push({id:'d',kind:'detail',parent:'',path:'/d/',title:'共享详情',mountIds:['header','footer'],content:{en:{title:'共享详情',html:'<p>正文</p>'}}});
 const w=mount(WebsiteStructure,{props:{pages:pages.filter(isMenu),details:pages,source:'en',company:'测试'}});expect(w.findAll('.map-position-group')).toHaveLength(2);expect(w.findAll('.map-menu-leaf')).toHaveLength(1);expect(w.find('details').attributes('open')).toBeDefined();expect(w.findAll('.shared-detail-icon')).toHaveLength(2);w.unmount();
});
test('legacy contacts migrate once, website selections remain independent, and global changes follow selection IDs',()=>{
 vi.stubGlobal('crypto',webcrypto);const p=emptyProject();p.pages=menus();settings(p).communications.email='sales@example.test';const data=websites(p),first=data.activeId,other=newWebsite(p);data.items.push(other);
 const contacts=globalContacts(p);expect(contacts).toHaveLength(1);expect(globalContacts(p)).toHaveLength(1);const id=contacts[0].id;switchWebsite(p,other.id);globalContacts(p);expect(selectedContacts(p)).toEqual([]);settings(p).communicationIds=[id];contacts[0].label='业务咨询';expect(selectedContacts(p)[0].label).toBe('业务咨询');switchWebsite(p,first);expect(selectedContacts(p)[0].id).toBe(id);removeContact(p,id);expect(selectedContacts(p)).toEqual([]);switchWebsite(p,other.id);expect(selectedContacts(p)).toEqual([]);
});
test('replacing one placeholder preserves its alt, surrounding content and another occurrence of the same source',()=>{
 const html='<p>参数</p><div class="media-placeholder" data-media-kind="image" data-media-name="press.jpg" data-media-alt="冲压设备" data-media-source="https://example.test/press.jpg"><p>图片占位</p></div><img src="https://example.test/press.jpg" alt="旧图"><video src="https://example.test/demo.mp4"></video>';
 expect(mediaItems(html).map(n=>n.kind)).toEqual(['image','image','video']);const next=replaceMedia(html,0,'image','/api/v1/assets/new','replacement.jpg');const doc=new DOMParser().parseFromString(next,'text/html');expect(doc.querySelector('img')?.alt).toBe('冲压设备');expect(doc.querySelectorAll('img')[1].src).toBe('https://example.test/press.jpg');expect(doc.querySelector('video')?.src).toBe('https://example.test/demo.mp4');expect(doc.querySelector('.media-placeholder')).toBeNull();expect(doc.querySelector('p')?.textContent).toBe('参数');
 const video=replaceMedia('<div class="media-placeholder" data-media-kind="video" data-media-alt="操作演示" data-media-name="old.mp4"></div>',0,'video','/api/v1/assets/video','new.mp4');expect(mediaItems(video)[0]).toMatchObject({kind:'video',name:'new.mp4',alt:'操作演示',placeholder:false,source:'/api/v1/assets/video'});
});
