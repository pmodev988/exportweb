import {test,expect} from 'vitest';
import {emptyProject} from '../src/model';
import {websites,currentDocument,newWebsite,switchWebsite,websiteProject,synchronizeWebsite} from '../src/websites';
test('websites preserve independent documents, stable page IDs, and shared company updates',()=>{
 const p=emptyProject();p.company.name='共用公司';p.pages=[{id:'original',parent:'',path:'/',title:'首页',content:{'zh-Hans':{title:'A',html:'<video src="/api/v1/assets/unchanged"></video>'}}}];
 const data=websites(p),first=data.items[0].id,second=newWebsite(p);second.name='B';second.profileMode='independent';second.profile!.name='独立品牌';data.items.push(second);
 switchWebsite(p,second.id);expect(p.pages).toEqual([]);expect(websiteProject(p).company.name).toBe('独立品牌');
 p.pages=[{id:'second',parent:'',path:'/',title:'B',content:{}}];p.theme='T04';p.design={pageMode:'single',motion:'subtle'};synchronizeWebsite(p);
 switchWebsite(p,first);expect(p.pages[0].id).toBe('original');expect(p.pages[0].content['zh-Hans'].html).toContain('/api/v1/assets/unchanged');expect(p.theme).toBe('T02');
 p.company.name='共用公司更新';expect(websiteProject(p).company.name).toBe('共用公司更新');switchWebsite(p,second.id);expect(websiteProject(p).company.name).toBe('独立品牌');expect(currentDocument(p).design).toEqual({pageMode:'single',motion:'subtle'});
 expect(()=>switchWebsite(p,'missing')).toThrow('网站不存在');
});
