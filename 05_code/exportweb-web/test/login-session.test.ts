import {beforeEach,afterEach,test,expect,vi} from 'vitest';
import {beginLogin,completeLogin,leaveAfterLogout} from '../src/login-session';
beforeEach(()=>{sessionStorage.clear();vi.stubGlobal('location',{hash:'#/website?site=sample',search:'',assign:vi.fn(),replace:vi.fn()});});
afterEach(()=>vi.unstubAllGlobals());
test('initial SSO attempts once, then exposes manual retry without an automatic loop',()=>{
 expect(beginLogin(true)).toBe(true);expect(beginLogin(true)).toBe(false);expect(location.assign).toHaveBeenCalledTimes(1);
 expect(beginLogin(false)).toBe(true);expect(location.assign).toHaveBeenCalledTimes(2);
});
test('authenticated callback returns to the original workspace page and consumes its marker',()=>{
 beginLogin();vi.stubGlobal('location',{hash:'#/',search:'',assign:vi.fn(),replace:vi.fn()});
 expect(completeLogin()).toBe(true);expect(location.replace).toHaveBeenCalledWith('/workspace/#/website?site=sample');expect(completeLogin()).toBe(false);
});
test('logout does not immediately log the user back in with the still-active identity session',()=>{
 leaveAfterLogout();expect(location.assign).toHaveBeenCalledWith('/workspace/?signedOut=1');expect(beginLogin(true)).toBe(false);
 expect(beginLogin()).toBe(true);
});
test('signed-out landing suppresses automatic SSO even when session storage was cleared',()=>{
 vi.stubGlobal('location',{hash:'#/',search:'?signedOut=1',assign:vi.fn(),replace:vi.fn()});expect(beginLogin(true)).toBe(false);expect(location.assign).not.toHaveBeenCalled();
});
test('external or malformed return destinations cannot leave the workspace',()=>{
 for(const target of ['https://evil.example/','#//evil.example/','#/\n//evil.example/']){sessionStorage.setItem('exportweb-login-return',target);expect(completeLogin()).toBe(false);}
 expect(location.replace).not.toHaveBeenCalled();
});
