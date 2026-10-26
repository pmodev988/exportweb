import {test,expect,vi,afterEach,beforeEach} from 'vitest';
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils';
import {createPinia,setActivePinia} from 'pinia';
import App from '../src/App.vue';
import {request,ApiError} from '../src/api';
import {activeTask} from '../src/tasks';
import {useProject} from '../src/store';
vi.mock('../src/api',async importOriginal=>({...await importOriginal<typeof import('../src/api')>(),request:vi.fn()}));
vi.mock('vue-router',()=>({useRoute:()=>({path:'/plan'})}));
vi.mock('vue-i18n',()=>({useI18n:()=>({t:(key:string)=>key})}));
let wrapper:VueWrapper|undefined;
const session={personId:'person-1',orgId:'org-1',name:'User',productName:'Renamed product 301',sharedEntry:true,organizations:[{orgId:'org-1',name:'Organization A'}]};
async function start(productName=session.productName){
 const pinia=createPinia();setActivePinia(pinia);const store=useProject();vi.spyOn(store,'load').mockImplementation(async()=>{store.loaded=true;});
 vi.mocked(request).mockImplementation(async url=>url==='/api/v1/jobs'?[]:{...session,productName});vi.stubGlobal('location',{assign:vi.fn(),reload:vi.fn()});
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();return store;
}
beforeEach(()=>{sessionStorage.clear();localStorage.clear();vi.stubGlobal('location',{hash:'',search:'',assign:vi.fn(),replace:vi.fn(),reload:vi.fn()});});
afterEach(()=>{wrapper?.unmount();activeTask.value=undefined;vi.clearAllMocks();vi.mocked(request).mockReset();vi.unstubAllGlobals();});
test('returning to an already-open anonymous page detects login completed in another tab',async()=>{
 const pinia=createPinia();setActivePinia(pinia);vi.spyOn(useProject(),'load').mockImplementation(async()=>{useProject().loaded=true;});vi.mocked(request).mockRejectedValueOnce(new ApiError('请先登录',401));
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 expect(wrapper.find('.account-state').text()).toBe('正在接续登录…');expect(location.assign).toHaveBeenCalledWith('/oauth2/authorization/exportweb');
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'User'}).mockResolvedValueOnce(session).mockResolvedValueOnce([]);
 window.dispatchEvent(new Event('focus'));await flushPromises();
 expect(wrapper.find('.account-identity').text()).toContain('User');expect(wrapper.findAll('a[href="/oauth2/authorization/exportweb"]')).toHaveLength(0);
});
test('restoring from browser back cache rechecks identity and coalesces simultaneous focus events',async()=>{
 await start();let release!:(value:unknown)=>void;
 vi.mocked(request).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;})).mockResolvedValueOnce(session).mockResolvedValueOnce([]);
 const restored=new Event('pageshow');Object.defineProperty(restored,'persisted',{value:true});
 const before=vi.mocked(request).mock.calls.length;window.dispatchEvent(restored);window.dispatchEvent(new Event('focus'));window.dispatchEvent(restored);await flushPromises();
 expect(vi.mocked(request).mock.calls.length).toBe(before+1);
 release({personId:'person-1',name:'User'});await flushPromises();expect(wrapper!.find('.account-identity').text()).toContain('User');
});
test('background session refresh keeps the current editor mounted while identity is being checked',async()=>{
 const pinia=createPinia();setActivePinia(pinia);const store=useProject();vi.spyOn(store,'load').mockImplementation(async()=>{store.loaded=true;});
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'User'}).mockResolvedValueOnce({...session,orgId:'org-1'}).mockResolvedValueOnce([]);
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:{template:'<textarea data-current-editor>未保存正文</textarea>'}}}});await flushPromises();
 const editor=wrapper.find('[data-current-editor]').element;let release!:(value:unknown)=>void;
 vi.mocked(request).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;})).mockResolvedValueOnce({...session,orgId:'org-1'}).mockResolvedValueOnce([]);
 window.dispatchEvent(new Event('focus'));await flushPromises();expect(wrapper.find('[data-current-editor]').element).toBe(editor);
 release({personId:'person-1',name:'User'});await flushPromises();expect(wrapper.find('[data-current-editor]').element).toBe(editor);expect(store.load).toHaveBeenCalledTimes(1);
 vi.mocked(request).mockRejectedValueOnce(new ApiError('账号服务暂时不可用',503));window.dispatchEvent(new Event('focus'));await flushPromises();expect(wrapper.find('[data-current-editor]').element).toBe(editor);expect(wrapper.find('[role="alert"]').text()).toContain('账号服务暂时不可用');
});
test('an expired session followed by another account never reuses the previous account editing history',async()=>{
 const pinia=createPinia();setActivePinia(pinia);const store=useProject();vi.spyOn(store,'load').mockImplementation(async()=>{store.loaded=true;});vi.stubGlobal('location',{assign:vi.fn(),reload:vi.fn()});
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'User'}).mockResolvedValueOnce({...session,orgId:'org-1'}).mockResolvedValueOnce([]);
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 vi.mocked(request).mockRejectedValueOnce(new ApiError('请先登录',401));window.dispatchEvent(new Event('focus'));await flushPromises();expect(store.loaded).toBe(false);
 vi.mocked(request).mockResolvedValueOnce({personId:'person-2',name:'User 2'}).mockResolvedValueOnce({...session,personId:'person-2',name:'User 2',orgId:'org-2'});
 window.dispatchEvent(new Event('focus'));await flushPromises();expect(location.reload).toHaveBeenCalledOnce();expect(store.load).toHaveBeenCalledTimes(1);expect(store.loaded).toBe(false);
});

test('a changed identity closes the previous editor before any organization lookup can fail',async()=>{
 const pinia=createPinia();setActivePinia(pinia);const store=useProject();vi.spyOn(store,'load').mockImplementation(async()=>{store.loaded=true;});vi.stubGlobal('location',{assign:vi.fn(),reload:vi.fn()});
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'User'}).mockResolvedValueOnce({...session,orgId:'org-1'}).mockResolvedValueOnce([]);
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:{template:'<textarea data-current-editor>上一账号正文</textarea>'}}}});await flushPromises();
 expect(wrapper.find('[data-current-editor]').exists()).toBe(true);const before=vi.mocked(request).mock.calls.length;
 vi.mocked(request).mockResolvedValueOnce({personId:'person-2',name:'User 2'});window.dispatchEvent(new Event('focus'));await flushPromises();
 expect(vi.mocked(request).mock.calls.length).toBe(before+1);expect(wrapper.find('[data-current-editor]').exists()).toBe(false);expect(store.loaded).toBe(false);expect(location.reload).toHaveBeenCalledOnce();
});
test('shared entry automatically loads its authorized organization without any selection UI',async()=>{
 const store=await start();expect(document.title).toBe(session.productName);expect(store.load).toHaveBeenCalledOnce();
 expect(wrapper!.find('.app-brand span').text()).toBe(session.productName);
 expect(wrapper!.findAll('.app-brand img').map(img=>img.attributes('src'))).toEqual(['/workspace/brand/logo-on-light.svg','/workspace/brand/logo-on-dark.svg']);
 expect(wrapper!.find('.account-organization').text()).toBe('Organization A');expect(wrapper!.find('select').exists()).toBe(false);
 expect(wrapper!.findAll('button').some(button=>button.text()==='进入组织')).toBe(false);
 expect(wrapper!.findAll('button').some(button=>button.text()==='退出')).toBe(true);
 expect(vi.mocked(request).mock.calls.some(([url])=>url==='/api/v1/session/organization')).toBe(false);
});

test('missing catalog display name never exposes the numeric management ID',async()=>{
 await start('302');expect(document.title).toBe('独立网站');expect(wrapper!.find('.app-brand span').text()).toBe('独立网站');
 // The current navigation shown in the user's screenshots includes separate customer and trade pages.
 expect(wrapper!.findAll('.workspace-nav a').map(link=>link.find('.nav-text').text())).toEqual([
  '独立网站','公司及产品','目标市场','网站询盘'
 ]);
});
test('verified identity remains visible when product scope lookup fails',async()=>{
 const pinia=createPinia();setActivePinia(pinia);
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'销售甲',login:'sales@example.test'}).mockRejectedValueOnce(new Error('组织授权暂时不可用'));
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 expect(wrapper.find('.account-identity').text()).toContain('销售甲');expect(wrapper.find('.account-identity').text()).toContain('sales@example.test');expect(wrapper.find('.account-organization').text()).toBe('组织信息未取得');expect(wrapper.find('.account-state').exists()).toBe(false);
 expect(wrapper.findAll('a[href="/oauth2/authorization/exportweb"]')).toHaveLength(0);expect(wrapper.find('[role="alert"]').text()).toContain('重试');
});
test('expired LGA session clears stale identity and offers reauthentication',async()=>{
 const pinia=createPinia();setActivePinia(pinia);
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'销售甲'}).mockRejectedValueOnce(new ApiError('请先登录',401));
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 expect(wrapper.find('.account-identity').exists()).toBe(false);expect(wrapper.find('[role="alert"]').text()).toContain('登录已失效');expect(wrapper.find('[role="alert"] a').text()).toBe('重新登录');expect(useProject().loaded).toBe(false);
});
test('initial anonymous session starts SSO instead of leaving an already-signed-in OPS user on a login button',async()=>{
 const pinia=createPinia();setActivePinia(pinia);vi.spyOn(useProject(),'load').mockImplementation(async()=>{useProject().loaded=true;});vi.mocked(request).mockRejectedValueOnce(new ApiError('请先登录',401));
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 expect(wrapper.find('.account-state').text()).toBe('正在接续登录…');expect(location.assign).toHaveBeenCalledWith('/oauth2/authorization/exportweb');expect(wrapper.find('[role="alert"]').exists()).toBe(false);
});
test('account service failure is a retry state, not a claim that the user is logged out',async()=>{
 const pinia=createPinia();setActivePinia(pinia);vi.spyOn(useProject(),'load').mockImplementation(async()=>{useProject().loaded=true;});vi.mocked(request).mockRejectedValueOnce(new ApiError('账号服务暂时不可用',503));
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 expect(wrapper.find('.account-state').text()).toBe('账号信息读取失败');expect(wrapper.findAll('a[href="/oauth2/authorization/exportweb"]')).toHaveLength(0);
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'销售甲'}).mockResolvedValueOnce(session).mockResolvedValueOnce([]);
 await wrapper.find('[role="alert"] button').trigger('click');await flushPromises();expect(wrapper.find('.account-identity').text()).toContain('User');expect(wrapper.find('[role="alert"]').exists()).toBe(false);
});
test('the initial identity request does not flash a please-login message',async()=>{
 const pinia=createPinia();setActivePinia(pinia);vi.spyOn(useProject(),'load').mockImplementation(async()=>{useProject().loaded=true;});vi.mocked(request).mockImplementationOnce(()=>new Promise(()=>{}));
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 expect(wrapper.find('.account-state').text()).toBe('正在读取账号…');expect(wrapper.text()).not.toContain('请先');expect(wrapper.findAll('a[href="/oauth2/authorization/exportweb"]')).toHaveLength(0);
});
test('retrying under a different account reloads the workspace instead of reusing the prior account project',async()=>{
 const pinia=createPinia();setActivePinia(pinia);const store=useProject();vi.spyOn(store,'load').mockImplementation(async()=>{store.loaded=true;});vi.stubGlobal('location',{assign:vi.fn(),reload:vi.fn()});
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'销售甲'}).mockResolvedValueOnce({...session,orgId:'org-1',sharedEntry:false}).mockResolvedValueOnce([]);
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 vi.mocked(request).mockRejectedValueOnce(new ApiError('任务服务不可用',503));await wrapper.findAll('button').find(b=>b.text()==='查看任务')!.trigger('click');await flushPromises();
 vi.mocked(request).mockResolvedValueOnce({personId:'person-2',name:'销售乙'}).mockResolvedValueOnce({...session,personId:'person-2',name:'销售乙',orgId:'org-1',sharedEntry:false});
 await wrapper.find('[role="alert"] button').trigger('click');await flushPromises();
 expect(location.reload).toHaveBeenCalledOnce();expect(store.loaded).toBe(false);expect(store.load).toHaveBeenCalledTimes(1);
});
test('obsolete local organization hints cannot change the server organization',async()=>{
 localStorage.setItem('exportweb-selected-organization:person-1','other-org');localStorage.setItem('exportweb-selected-organization:other-person','org-1');
 await start();expect(wrapper!.find('.account-organization').text()).toBe('Organization A');expect(wrapper!.find('select').exists()).toBe(false);
 expect(vi.mocked(request).mock.calls.some(([url])=>url==='/api/v1/session/organization')).toBe(false);
});

test('a returning login restores the original page and automatically reads its organization',async()=>{
 sessionStorage.setItem('exportweb-login-return','#/website');const pinia=createPinia();setActivePinia(pinia);const store=useProject();vi.spyOn(store,'load').mockImplementation(async()=>{store.loaded=true;});
 vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'User'}).mockResolvedValueOnce(session).mockResolvedValueOnce([]);
 wrapper=mount(App,{global:{plugins:[pinia],stubs:{AppearanceSettings:true,RouterLink:{template:'<a><slot/></a>'},RouterView:true}}});await flushPromises();
 expect(location.replace).toHaveBeenCalledWith('/workspace/#/website');expect(store.load).toHaveBeenCalledOnce();expect(wrapper.find('.account-organization').text()).toBe('Organization A');expect(wrapper.find('select').exists()).toBe(false);
});

test('personal or revoked accounts keep identity but close the prior business editor',async()=>{
 const store=await start();vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'User'}).mockRejectedValueOnce(new ApiError('LGA 仅向已获授权的组织用户开放',403));
 window.dispatchEvent(new Event('focus'));await flushPromises();
 expect(wrapper!.find('.account-identity').text()).toContain('User');expect(wrapper!.find('.account-organization').text()).toBe('组织信息未取得');expect(wrapper!.text()).toContain('LGA 仅向');expect(store.loaded).toBe(false);expect(wrapper!.find('router-view-stub').exists()).toBe(false);expect(wrapper!.find('select').exists()).toBe(false);
});

for(const invalid of [
 {...session,orgId:'',organizations:[]},
 {...session,organizations:[...session.organizations,{orgId:'org-2',name:'Organization B'}]},
 {...session,orgId:'other-org'},
 {...session,personId:'other-person'}
])test('an inconsistent server session never opens a business page: '+JSON.stringify(invalid),async()=>{
 const store=await start();vi.mocked(request).mockResolvedValueOnce({personId:'person-1',name:'User'}).mockResolvedValueOnce(invalid);
 window.dispatchEvent(new Event('focus'));await flushPromises();expect(store.loaded).toBe(false);expect(wrapper!.find('router-view-stub').exists()).toBe(false);expect(wrapper!.find('[role="alert"]').exists()).toBe(true);expect(wrapper!.find('select').exists()).toBe(false);
});

test('running tasks keep the read-only account and organization visible',async()=>{
 await start();activeTask.value={id:'task',kind:'PLAN',status:'RUNNING',progress:25,message:'Running',result:{}};await wrapper!.vm.$nextTick();expect(wrapper!.find('.account-organization').text()).toBe('Organization A');expect(wrapper!.find('select').exists()).toBe(false);expect(wrapper!.find('.workspace-topbar').attributes('inert')).toBeDefined();
});
