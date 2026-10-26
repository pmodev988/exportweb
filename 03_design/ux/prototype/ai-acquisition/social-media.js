(function(root){
 'use strict';
 const limit=100*1024*1024;
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 function normalize(value={}){
  check(['text','video'].includes(value.type),'请选择文案或视频');
  const source=value.source||'none';check(['none','url','local','content'].includes(source),'视频来源无效');
  const media={type:value.type,source};
  if(source==='url'){
   let url;try{url=new URL(value.url);}catch{throw Error('请填写 HTTPS 视频直链');}
   check(url.protocol==='https:'&&!url.username&&!url.password&&/\.(mp4|webm)$/i.test(url.pathname),'请填写不含登录凭据的 HTTPS MP4 / WebM 直链');media.url=url.href;
  }
  if(source==='local'){
   check(/^[a-f0-9-]{36}$/i.test(value.assetId||'')&&Number.isInteger(value.bytes)&&value.bytes>0&&value.bytes<=limit,'本地视频记录无效');
   check(['video/mp4','video/webm'].includes(value.mime),'请选择 MP4 或 WebM 视频');
   Object.assign(media,{assetId:value.assetId,name:String(value.name||'视频').slice(0,160),bytes:value.bytes,mime:value.mime});
  }
  if(source==='content'){check(typeof value.artifact==='string'&&value.artifact.length>0&&value.artifact.length<160,'视频产物无效');media.artifact=value.artifact;}
  return media;
 }
 const current=s=>s.social.media||{type:s.content.manifest?.type==='video'?'video':'text',source:s.content.manifest?.type==='video'?'content':'none',...(s.content.manifest?.type==='video'?{artifact:s.content.manifest.id}:{})};
 function open(){return new Promise((resolve,reject)=>{
  if(!root.indexedDB)return reject(Error('浏览器不支持本地视频保存，请使用视频直链。'));
  const request=root.indexedDB.open('lga-social-media-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('videos');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('无法打开本地视频库，请使用视频直链。'));
  request.onblocked=()=>reject(Error('视频库正在使用，请关闭其他原型标签后重试。'));
 });}
 async function transaction(scope,id,mode,run){
  const db=await open();try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction('videos',mode),request=run(tx.objectStore('videos'),[scope,id]);let result;
   request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);
   tx.onerror=tx.onabort=()=>reject(Error('视频未能保存或读取，请检查浏览器可用空间。'));
  });}finally{db.close();}
 }
 async function put(scope,file){
  const mime=file.type||(/\.mp4$/i.test(file.name)?'video/mp4':/\.webm$/i.test(file.name)?'video/webm':'');
  check(['video/mp4','video/webm'].includes(mime),'请选择 MP4 或 WebM 视频');check(file.size>0&&file.size<=limit,'视频须大于 0 且不超过 100 MB');
  const media=normalize({type:'video',source:'local',assetId:root.crypto.randomUUID(),name:file.name,bytes:file.size,mime});
  await transaction(scope,media.assetId,'readwrite',(store,key)=>store.put(file,key));return media;
 }
 const get=(scope,id)=>transaction(scope,id,'readonly',(store,key)=>store.get(key));
 const remove=(scope,id)=>transaction(scope,id,'readwrite',(store,key)=>store.delete(key));
 function probe(src){return new Promise((resolve,reject)=>{
  const video=root.document.createElement('video');let timer;
  const finish=error=>{clearTimeout(timer);video.onloadedmetadata=video.onerror=null;video.removeAttribute('src');video.load();error?reject(error):resolve();};
  video.onloadedmetadata=()=>finish(video.videoWidth>0&&video.videoHeight>0&&video.duration>0?null:Error('该文件没有可播放的视频画面。'));
  video.onerror=()=>finish(Error('视频无法播放，请使用可播放的 MP4 / WebM 文件或直链。'));
  timer=setTimeout(()=>finish(Error('视频读取超时，请检查链接或更换文件。')),15000);video.preload='metadata';video.src=src;
 });}
 const fields=['title','coverUrl','tags','visibility','youtubeCategory','youtubeAudience','tiktokCommercial'];
 const metadata=s=>Object.fromEntries(fields.map(k=>[k,String(s.social[k]||'')]));
 function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
 function errors(s,targets){
  const m=current(s),v=metadata(s),out=[];
  if(m.type==='video'){
   if(m.source==='none')out.push('请添加视频');
   if(!v.title.trim())out.push('请填写标题');
   if(!v.visibility)out.push('请选择可见范围');
  }else if(!s.social.caption?.trim())out.push('请填写发布正文');
  if(v.coverUrl&&!safeUrl(v.coverUrl))out.push('封面须为 HTTPS 图片链接');
  if(targets.includes('youtube')){
   if(m.type!=='video')out.push('YouTube：请选择视频');
   if(!v.title.trim()||v.title.length>100||/[<>]/.test(v.title))out.push('YouTube：标题须为 1–100 字，不能包含 < >');
   if(!v.youtubeCategory)out.push('YouTube：请选择视频分类');
   if(!['yes','no'].includes(v.youtubeAudience))out.push('YouTube：请选择是否面向儿童');
  }
  if(targets.includes('tiktok')){
   if(m.type!=='video')out.push('TikTok：请选择视频');
   if((s.social.caption||'').length>2200)out.push('TikTok：简介最多 2200 字');
   if(!v.tiktokCommercial)out.push('TikTok：请选择商业内容类型');
  }
  return out;
 }
 function history(s){
  const rows=[...(s.social.publications||[])];
  // Older approvals contain a hash, not the original text. Never substitute today's draft.
  for(const a of s.approvals.filter(a=>a.scope==='social:publish')){
   if(rows.some(r=>r.approvalId===a.id))continue;
   const op=s.operations.find(o=>o.kind==='social'&&o.key===`social:${a.revision}`);
   const receipt=s.receipts.find(r=>r.operation===op?.id);
   if(!op&&a.details.mode!=='manual')continue;
   for(const target of a.details.targets||[{id:'legacy',account:a.details.channel||''}])rows.push({id:'legacy:'+a.id+':'+target.id,approvalId:a.id,platform:target.id,account:target.account||'',title:'旧发布记录',caption:'',media:a.details.media||{type:'text',source:'none'},legacy:true,revision:a.revision,createdAt:a.at,updatedAt:receipt?.at||a.at,publishedAt:receipt?.at||'',status:op?(op.status==='SUCCEEDED'?'DEMO_COMPLETED':op.status==='FAILED'?'FAILED':'UNKNOWN'):'LEGACY_MANUAL',environment:'SIMULATED',url:'',reason:op?.status==='FAILED'?'原操作核对失败':'',events:[]});
  }
  return rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
 }
 function remember(s,snapshot,batch,status,receipt='',at=new Date().toISOString()){
  s.social.publications||=[];
  for(const target of snapshot.targets){
   const id=batch+':'+target.id;let r=s.social.publications.find(r=>r.id===id);
   if(!r){r={...JSON.parse(JSON.stringify(snapshot)),id,batch,platform:target.id,account:target.account||'',createdAt:at,events:[]};delete r.targets;s.social.publications.push(r);}
   if(r.status===status||r.status==='MANUAL_RECORDED'||(status==='MANUAL_TODO'&&r.status))continue;
   Object.assign(r,{status,updatedAt:at,receipt,url:r.url||'',publishedAt:status==='DEMO_COMPLETED'?at:'',reason:status==='FAILED'?'发布演示核对失败':''});
   r.events.push({at,status,reason:r.reason});
  }
 }
 const domains={linkedin:['linkedin.com'],youtube:['youtube.com','youtu.be'],facebook:['facebook.com','fb.watch'],instagram:['instagram.com'],tiktok:['tiktok.com'],x:['x.com','twitter.com'],line:['line.me','line.biz'],'wechat-video':['weixin.qq.com'],wechat:['weixin.qq.com'],douyin:['douyin.com'],red:['xiaohongshu.com','xhslink.com'],bilibili:['bilibili.com','b23.tv']};
 function publicationUrl(value,platform){
  const url=safeUrl(value);check(url,'请填写 HTTPS 原文链接');const u=new URL(url);
  check(u.pathname!=='/'&&(domains[platform]||[]).some(host=>u.hostname===host||u.hostname.endsWith('.'+host)),'请填写对应平台的内容链接');return url;
 }
 const searchDefaults={platform:'',account:'',query:'',type:'',market:'',status:'',dateField:'publishedAt',from:'',to:'',sort:'newest'};
 function filterRecords(records,criteria={}){
  const c={...searchDefaults,...criteria},dateField=['publishedAt','createdAt','updatedAt'].includes(c.dateField)?c.dateField:'publishedAt';
  function day(value){if(!value)return null;check(/^\d{4}-\d{2}-\d{2}$/.test(value),'日期格式无效');const [y,m,d]=value.split('-').map(Number),v=new Date(y,m-1,d);check(v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d,'日期无效');return v;}
  const from=day(c.from),to=day(c.to);check(!from||!to||from<=to,'开始日期不能晚于结束日期');if(to)to.setDate(to.getDate()+1);
  const words=String(c.query).trim().toLowerCase().split(/\s+/).filter(Boolean),account=String(c.account).trim().toLowerCase();
  const rows=records.filter(r=>{
   if(c.platform&&r.platform!==c.platform||c.type&&r.media?.type!==c.type||c.market&&!(r.markets||[]).includes(c.market)||c.status&&r.status!==c.status)return false;
   if(account&&!String(r.account||'').toLowerCase().includes(account))return false;
   const haystack=[r.title,r.caption,r.tags,r.account,r.reference,r.url].join(' ').toLowerCase();if(!words.every(w=>haystack.includes(w)))return false;
   if(from||to){const t=new Date(r[dateField]).getTime();if(!Number.isFinite(t)||from&&t<from.getTime()||to&&t>=to.getTime())return false;}
   return true;
  });
  const stamp=r=>Date.parse(r[dateField]||'')||0;
  return rows.sort((a,b)=>c.sort==='title'?String(a.title||'').localeCompare(String(b.title||''),'zh-CN'):c.sort==='oldest'?stamp(a)-stamp(b):stamp(b)-stamp(a));
 }
 const api={limit,normalize,current,put,get,remove,probe,fields,metadata,safeUrl,errors,history,remember,publicationUrl,searchDefaults,filterRecords};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGASocialMedia=api;
})(typeof globalThis!=='undefined'?globalThis:this);
