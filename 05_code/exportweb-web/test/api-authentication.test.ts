import {test,expect,vi,afterEach} from 'vitest';
import {request,onAuthenticationRequired,ApiError} from '../src/api';
afterEach(()=>vi.unstubAllGlobals());
test('only authentication loss notifies the workspace; permission and service failures do not log the user out',async()=>{
 const listener=vi.fn(),stop=onAuthenticationRequired(listener);
 try{
  for(const status of [403,503,401]){
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({message:'operation failed'}),{status,headers:{'Content-Type':'application/json'}})));
   await expect(request('/api/v1/project')).rejects.toMatchObject({status});
  }
  expect(listener).toHaveBeenCalledTimes(1);stop();
  await expect(request('/api/v1/jobs')).rejects.toBeInstanceOf(ApiError);expect(listener).toHaveBeenCalledTimes(1);
 }finally{stop();}
});
