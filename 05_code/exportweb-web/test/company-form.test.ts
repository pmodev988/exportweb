import {afterEach,expect,test,vi} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import {createPinia,setActivePinia} from 'pinia';
import {createRouter,createMemoryHistory} from 'vue-router';
import CompanyPlan from '../src/CompanyPlan.vue';
import {useProject} from '../src/store';
import {emptyProject} from '../src/model';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const allMarkets=require('../../../03_design/ux/prototype/ai-acquisition/search-index.js').markets;

afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML='';});
test('visible company fields save and continue without clearing removed historical details',async()=>{
 const pinia=createPinia();setActivePinia(pinia);const store=useProject();let project=emptyProject(),revision=1;
 Object.assign(project.company,{name:'原公司',product:'原产品',strength:'原强项',description:'历史产品介绍',excluded:'历史不做事项'});
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(String(url).includes('catalog'))return Response.json({markets:[]});
  if(String(url).includes('csrf'))return Response.json({header:'X-CSRF-TOKEN',token:'local-test'});
  if(options?.method==='PUT'){project=JSON.parse(options.body);revision++;}
  return Response.json({project,revision});
 }));
 await store.load();const router=createRouter({history:createMemoryHistory(),routes:[{path:'/plan',component:CompanyPlan}]});
 await router.push('/plan');await router.isReady();
 const wrapper=mount(CompanyPlan,{attachTo:document.body,global:{plugins:[pinia,router]}});await flushPromises();
 const form=wrapper.get('.company-profile form');
 expect(form.find('details').exists()).toBe(false);
 expect(form.findAll('input')).toHaveLength(1);expect(form.findAll('textarea')).toHaveLength(2);
 expect((form.get('#company-description').element as HTMLTextAreaElement).value).toBe('原产品\n历史产品介绍');
 const description='精密设备'.repeat(80)+'\n完整规格与服务内容';await form.get('#company-description').setValue(description);await form.get('#company-strength').setValue('按图定制');
 await form.get('.page-actions .primary').trigger('click');await flushPromises();
 expect(router.currentRoute.value.query.tab).toBe('markets');
 await store.load();expect(store.project.company).toMatchObject({product:description.split('\n')[0].slice(0,300),strength:'按图定制',description,excluded:'历史不做事项'});
 await router.push('/plan');await flushPromises();expect((wrapper.get('#company-description').element as HTMLTextAreaElement).value).toBe(description);
 wrapper.unmount();
});

test('market regions and cross-region search preserve all selections and retire the goal route',async()=>{
 const pinia=createPinia();setActivePinia(pinia);const store=useProject();let project=emptyProject(),revision=1;
 project.company.markets=['US'];project.plan='历史计划';
 const markets=allMarkets;
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(String(url).includes('catalog'))return Response.json({markets});
  if(String(url).includes('csrf'))return Response.json({header:'X-CSRF-TOKEN',token:'local-test'});
  if(options?.method==='PUT'){project=JSON.parse(options.body);revision++;}
  return Response.json({project,revision});
 }));
 await store.load();const router=createRouter({history:createMemoryHistory(),routes:[{path:'/plan',component:CompanyPlan}]});await router.push('/plan?tab=markets');await router.isReady();
 const wrapper=mount(CompanyPlan,{attachTo:document.body,global:{plugins:[pinia,router]}});await flushPromises();
 const region=(label:string)=>wrapper.findAll('.market-region-nav button').find(b=>b.text().startsWith(label))!;
 const visibleCodes=()=>wrapper.findAll('.market-groups input').map(i=>i.attributes('value'));
 const subregion=(label:string)=>wrapper.findAll('.market-subregion-nav button').find(b=>b.text().startsWith(label))!;
 expect(visibleCodes()).toHaveLength(41);expect(subregion('所有').attributes('aria-pressed')).toBe('true');
 await region('欧洲').trigger('click');
 expect(wrapper.findAll('.market-subregion-nav button').map(b=>b.text())).toEqual(['所有','西欧','北欧','南欧','东欧']);
 expect(visibleCodes()).toHaveLength(54);expect(visibleCodes()).toContain('GB');
 await wrapper.get('input[value="GB"]').setValue(true);expect(subregion('所有').text()).toBe('所有1');
 await subregion('西欧').trigger('click');expect(visibleCodes()).toHaveLength(9);expect(visibleCodes()).not.toContain('GB');
 await subregion('所有').trigger('click');expect(visibleCodes()).toHaveLength(54);expect((wrapper.get('input[value="GB"]').element as HTMLInputElement).checked).toBe(true);
 await subregion('西欧').trigger('click');await region('欧洲').trigger('click');expect(visibleCodes()).toHaveLength(54);expect(subregion('所有').attributes('aria-pressed')).toBe('true');
 await region('南美').trigger('click');expect(visibleCodes()).toHaveLength(16);expect(wrapper.find('.market-subregion-nav').exists()).toBe(false);
 await region('亚洲').trigger('click');await wrapper.findAll('.market-subregion-nav button').find(b=>b.text()==='东南亚')!.trigger('click');await wrapper.get('input[value="SG"]').setValue(true);
 for(const q of ['德国','germany','deu','deguo','dg']){await wrapper.get('#markets-search').setValue(q);if(q==='dg')expect(visibleCodes()).toEqual(expect.arrayContaining(['DE','DG']));else expect(visibleCodes()).toEqual(['DE']);}
 await wrapper.get('input[value="DE"]').setValue(true);await wrapper.get('#markets-search').setValue('not-a-market');expect(wrapper.find('.choice-empty').exists()).toBe(true);
 await wrapper.get('#markets-search').setValue('');expect(visibleCodes()).toHaveLength(11);expect(subregion('东南亚').attributes('aria-pressed')).toBe('true');
 await region('北美').trigger('click');expect(visibleCodes()).toHaveLength(41);expect(subregion('所有').attributes('aria-pressed')).toBe('true');expect((wrapper.get('input[value="US"]').element as HTMLInputElement).checked).toBe(true);expect(store.project.company.markets).toEqual(['US','GB','SG','DE']);
 await wrapper.get('form').trigger('submit');await flushPromises();await store.load();expect(store.project.company.markets).toEqual(['US','GB','SG','DE']);expect(store.project.plan).toBe('历史计划');
 await router.push('/plan?tab=goal');await flushPromises();expect(router.currentRoute.value.query.tab).toBeUndefined();expect(wrapper.findAll('[role="tab"]')).toHaveLength(2);expect(wrapper.text()).not.toContain('目标计划');wrapper.unmount();
});
