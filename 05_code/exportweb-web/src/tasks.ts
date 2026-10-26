import {ref} from 'vue';
import {request} from './api';
export interface Ticket<T=unknown>{id:string;kind:string;status:'QUEUED'|'RUNNING'|'SUCCEEDED'|'FAILED'|'CANCELLED';progress:number;message:string;result:T}
export const activeTask=ref<Ticket>();
export async function cancelTask(){if(activeTask.value){activeTask.value=await request<Ticket>('/api/v1/jobs/'+activeTask.value.id+'/cancel',{method:'POST',body:'{}'});}}
export async function task<T>(path:string,revision:number,body:unknown={},signal?:AbortSignal):Promise<T>{
 let ticket=await request<Ticket<T>>(path,{method:'POST',headers:{'If-Match':String(revision),'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)});
 activeTask.value=ticket;
 while(ticket.status==='RUNNING'||ticket.status==='QUEUED'){
  if(signal?.aborted){await cancelTask();throw new DOMException('已取消','AbortError');}
  await new Promise(resolve=>setTimeout(resolve,1000));
  ticket=await request<Ticket<T>>('/api/v1/jobs/'+ticket.id);activeTask.value=ticket;
 }
 if(ticket.status!=='SUCCEEDED')throw Error(ticket.message||'任务未完成，原有内容保留');
 activeTask.value=undefined;
 return ticket.result;
}
