import {afterEach,expect,test,vi} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import WebsiteInquiries from '../src/WebsiteInquiries.vue';
const api=vi.hoisted(()=>vi.fn());
vi.mock('../src/api',()=>({request:api}));
afterEach(()=>api.mockReset());
test('inquiry can be read and marked handled with its current revision',async()=>{
 const row={id:'inquiry-1',sender_name:'Buyer',company_name:'Buyer Inc',email:'buyer@example.test',country:'US',subject:'Quotation',message:'Specifications',state:'NEW',revision:3};
 api.mockImplementation(async(url:string,options?:RequestInit)=>options?.method==='PUT'?{}:url.includes('?offset=')?[row]:{...row});
 const wrapper=mount(WebsiteInquiries);await flushPromises();
 await wrapper.get('.inquiry-item').trigger('click');await flushPromises();
 expect(wrapper.get('.inquiry-message').text()).toBe('Specifications');
 await wrapper.get('select').setValue('HANDLED');await wrapper.get('textarea').setValue('Quotation prepared');await wrapper.get('form').trigger('submit');await flushPromises();
 expect(api).toHaveBeenCalledWith('/api/v1/inquiries/inquiry-1',{method:'PUT',body:JSON.stringify({revision:3,state:'HANDLED',note:'Quotation prepared'})});
 expect(wrapper.find('form').exists()).toBe(false);wrapper.unmount();
});
test('a failed save preserves the inquiry and shows the server error',async()=>{
 const row={id:'inquiry-1',subject:'Quotation',state:'NEW',revision:1};
 api.mockImplementation(async(url:string,options?:RequestInit)=>{if(options?.method==='PUT')throw new Error('记录已更新，请重新读取');return url.includes('?offset=')?[row]:{...row};});
 const wrapper=mount(WebsiteInquiries);await flushPromises();await wrapper.get('.inquiry-item').trigger('click');await flushPromises();
 await wrapper.get('form').trigger('submit');await flushPromises();expect(wrapper.get('[role=alert]').text()).toContain('重新读取');expect(wrapper.find('form').exists()).toBe(true);wrapper.unmount();
});
