let csrf={header:'',token:''};
const authenticationListeners=new Set<()=>void>();
export function onAuthenticationRequired(listener:()=>void){authenticationListeners.add(listener);return ()=>{authenticationListeners.delete(listener);};}
export class ApiError extends Error {constructor(message:string,public status:number){super(message);this.name='ApiError';}}
export async function request<T>(path:string,options:RequestInit={}):Promise<T>{
  const method=options.method||'GET';
  if(!['GET','HEAD'].includes(method)&&!csrf.token)csrf=await request('/api/v1/csrf');
  const response=await fetch(path,{credentials:'same-origin',...options,headers:{'Accept':'application/json',...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(!['GET','HEAD'].includes(method)?{[csrf.header]:csrf.token}:{}),...options.headers}});
  if(!response.ok){
    const error=await response.json().catch(()=>({}));
    if(response.status===401){csrf={header:'',token:''};for(const listener of authenticationListeners)listener();throw new ApiError('请先登录',401);}
    if(response.status===409)throw new ApiError(error.message||'服务器资料已更新，请同步最新资料；当前编辑内容仍保留。',409);
    throw new ApiError(error.message||'操作未完成，请稍后重试',response.status);
  }
  return response.status===204?undefined as T:response.json() as Promise<T>;
}
export async function upload(file:File,signal?:AbortSignal):Promise<string>{
  const form=new FormData();form.append('file',file);
  return (await request<{url:string}>('/api/v1/assets',{method:'POST',body:form,signal})).url;
}
export async function download(path:string,revision:number,name:string):Promise<void>{
 if(!csrf.token)csrf=await request('/api/v1/csrf');
 const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{[csrf.header]:csrf.token,'If-Match':String(revision),'Content-Type':'application/json'},body:'{}'});
 if(!r.ok){const body=await r.json().catch(()=>({}));throw Error(body.message||'网站文件生成失败');}
 const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
