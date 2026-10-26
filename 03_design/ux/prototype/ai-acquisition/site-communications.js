(function(root){
  'use strict';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fields=[['whatsapp','WhatsApp','国际号码，如 +81 90 1234 5678'],['email','联系邮箱','sales@example.com'],['phone','联系电话','带国家或地区代码的电话号码'],['link','其他通讯链接','https://']];
  function settings(s){return Object.fromEntries(fields.map(([id])=>[id,String(s.site.communications?.[id]||'')]));}
  function normalize(p){
    const out={};for(const [id,label] of fields){
      const value=String(p[id]??'').trim();if(value.length>1000)throw Error(label+'：内容过长');out[id]=value;if(!value)continue;
      if(id==='whatsapp'||id==='phone'){
        if(!/^\+?[\d ()-]+$/.test(value))throw Error(label+'：请填写含国家或地区代码的电话号码');
        out[id]=value.replace(/[ ()-]/g,'');if(!/^\+?[1-9]\d{6,14}$/.test(out[id]))throw Error(label+'：请填写有效的国际号码');
      }else if(id==='email'){
        if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value))throw Error('联系邮箱：请填写有效邮箱地址');
      }else{
        let url;try{url=new URL(value);}catch{throw Error('其他通讯链接：请填写完整的 HTTPS 地址');}
        if(url.protocol!=='https:'||url.username||url.password||/[\r\n]/.test(value))throw Error('其他通讯链接：请填写不含登录凭据的 HTTPS 地址');out[id]=url.href;
      }
    }return out;
  }
  function href(id,value){return id==='whatsapp'?'https://wa.me/'+value.replace(/^\+/,''):id==='email'?'mailto:'+encodeURIComponent(value).replace(/%40/g,'@'):id==='phone'?'tel:'+value:value;}
  const paths={whatsapp:'M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5ZM8 7c0 5 3 8 8 8l1-2-3-1-1 1-3-3 1-1-1-3Z',email:'M3 5h18v14H3ZM3 5l9 7 9-7',phone:'M7 3 4 4c-3 6 10 19 16 16l1-3-5-3-2 2-6-6 2-2Z',link:'M21 11a8 8 0 0 1-8 8H7l-4 3 1-6a8 8 0 1 1 17-5ZM7 11h10M7 8h6'};
  const types=[['whatsapp','WhatsApp'],['email','邮箱'],['phone','电话'],['telegram','Telegram'],['line','LINE'],['wechat','微信'],['messenger','Messenger'],['signal','Signal'],['viber','Viber'],['link','其他通讯链接']];
  const ui={edit:null};
  const sites=s=>[s.site,...(s.business?.sites||[]).map(w=>w.document)];
  function registry(s){const out=JSON.parse(JSON.stringify(s.communications||[]));for(const site of sites(s))if(site.communicationIds==null)for(const [type,label] of fields){const value=site.communications?.[type];if(value&&!out.some(c=>c.type===type&&c.value===value))out.push({id:'legacy-'+out.length,type,label,value});}return out;}
  function migrate(s){const out=registry(s);for(const site of sites(s))if(site.communicationIds==null)site.communicationIds=out.filter(c=>site.communications?.[c.type]===c.value).map(c=>c.id);s.communications=out;return out;}
  function selected(s){return registry(s).filter(c=>s.site.communicationIds==null?s.site.communications?.[c.type]===c.value:s.site.communicationIds.includes(c.id));}
  function contact(p){if(!types.some(t=>t[0]===p.type)||!String(p.label||'').trim())throw Error('请填写通讯类型与名称');const key=['email','phone','whatsapp'].includes(p.type)?p.type:'link',value=normalize({[key]:p.value})[key];if(!value)throw Error('请填写通讯号码或地址');return {id:p.id,type:p.type,label:String(p.label).trim().slice(0,180),value};}
  function system(s){const list=registry(s),c=ui.edit;return `<section class="card"><header class="between"><div class="sw-heading-line"><h2>通讯设置</h2><p class="small muted">统一维护联系方式，供各网站选择使用。</p></div><button type="button" class="primary" data-action="addGlobalContact">添加通讯</button></header><div class="communication-grid">${list.map(c=>`<article class="communication-card"><div class="sw-heading-line"><strong>${esc(c.label)}</strong><span class="tag">${esc(types.find(t=>t[0]===c.type)?.[1])}</span></div><p>${esc(c.value)}</p><div class="inline"><button data-action="editGlobalContact" data-id="${esc(c.id)}">修改</button><button data-action="removeGlobalContact" data-id="${esc(c.id)}">删除</button></div></article>`).join('')}</div>${list.length?'':'<p class="empty">尚未添加联系方式。</p>'}</section>${c?`<dialog id="global-contact-dialog" class="global-contact-dialog"><header class="between"><h2>通讯资料</h2><button data-action="closeGlobalContact" aria-label="关闭">×</button></header><form data-form="globalCommunication"><input type="hidden" name="id" value="${esc(c.id)}"><div class="grid2"><label>通讯类型<select name="type">${types.map(([id,label])=>`<option value="${id}" ${c.type===id?'selected':''}>${label}</option>`).join('')}</select></label><label>显示名称<input name="label" required maxlength="180" placeholder="例如：销售咨询、售后服务" value="${esc(c.label)}"></label><label class="communication-full">通讯号码或地址<input name="value" required maxlength="1000" value="${esc(c.value)}" placeholder="号码、邮箱或 HTTPS 通讯链接"></label></div><div class="card-actions"><button type="button" data-action="closeGlobalContact">取消</button><button class="primary">保存</button></div></form></dialog>`:''}`;}
  function widget(s,{inline=false}={}){
    const lang=s.site.locale||'zh-Hans',zh=lang.startsWith('zh');
    const links=selected(s).flatMap(raw=>{let c;try{c=contact(raw);}catch{return [];}const url=href(c.type,c.value);return `<a class="site-contact site-contact-${esc(c.type)}" href="${esc(url)}" ${url.startsWith('https:')?'target="_blank" rel="noopener noreferrer"':''} aria-label="${esc(c.label)}" title="${esc(c.label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[c.type]||paths.link}"/></svg></a>`;}).join('');
    return links?`<nav class="site-contact-widget${inline?' site-contact-sample':''}" aria-label="${zh?'联系商家':'Contact us'}">${links}</nav>`:'';
  }
  function form(s){const list=registry(s),ids=selected(s).map(c=>c.id);return `<section class="card sw-card website-communications"><header class="between"><div class="sw-heading-line"><h2>通讯设置</h2><p class="small muted">选择本站使用的联系方式，图标固定在网站左上角。</p></div><button type="button" data-action="navigate" data-page="system-communications">管理全局通讯</button></header><form data-form="websiteCommunications"><div class="communication-grid">${list.map(c=>`<label class="communication-card communication-choice"><input type="checkbox" name="contact:${esc(c.id)}" ${ids.includes(c.id)?'checked':''}><span><strong>${esc(c.label)}</strong><small>${esc(types.find(t=>t[0]===c.type)?.[1])}</small><span>${esc(c.value)}</span></span></label>`).join('')}</div>${list.length?'':'<p class="empty">请先在系统设置的通讯设置中添加联系方式。</p>'}<div class="website-communication-actions">${widget(s,{inline:true})}<div class="card-actions"><button>保存通讯选择</button><button type="button" class="primary" data-action="continueWebsite" data-page="website-publish">下一步：发布网站</button></div></div></form></section>`;}
  const css=`
.site-contact-widget{position:fixed;top:12px;left:12px;right:auto;z-index:60;display:flex;flex-direction:column;gap:8px;width:max-content;max-height:calc(100dvh - 24px);overflow-y:auto;padding:3px;direction:ltr}
a.site-contact{display:flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;min-width:40px;box-sizing:border-box;border:1px solid #fff;border-radius:50%;color:#fff;background:#216c9c;box-shadow:0 2px 7px #0003;text-decoration:none}
a.site-contact-whatsapp{background:#168b46}a.site-contact-link{background:#33745d}a.site-contact:hover{filter:brightness(1.12)}a.site-contact:focus-visible{outline:3px solid #eea52b;outline-offset:2px}.site-contact svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.site-preview{position:relative;isolation:isolate}.site-preview .site-contact-widget{position:absolute;top:48px;left:8px;max-height:calc(100% - 56px)}.has-site-contacts>.mock-nav,.localized-site.has-site-contacts>header{padding-left:70px}.site-contact-sample{position:static;flex-direction:row;max-height:none;overflow:visible}.website-communication-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px}.website-communication-actions .card-actions{margin:0;padding:0;border:0;margin-left:auto}
@media(max-width:600px){.site-contact-widget{top:8px;left:6px;gap:6px}a.site-contact{width:36px;height:36px;min-width:36px}.website-communication-actions{flex-wrap:wrap}.has-site-contacts>.mock-nav,.localized-site.has-site-contacts>header{padding-left:56px}}
`;
  const api={types,ui,registry,migrate,selected,contact,system,fields,settings,normalize,href,widget,form,css};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGASiteCommunications=api;
})(typeof globalThis!=='undefined'?globalThis:this);
