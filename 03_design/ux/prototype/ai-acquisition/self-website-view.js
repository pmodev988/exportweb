(function(root){
  'use strict';
  const local=typeof module!=='undefined'&&module.exports;
  const W=local?require('./self-website.js'):root.LGASelfWebsite,L=local?require('./site-languages.js'):root.LGASiteLanguages;
  const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let ui={scope:'',dialog:'',pageId:'',entryId:'',versionId:''};
  const button=(action,label,attrs='',cls='')=>`<button type="button" data-sw="${action}" ${attrs} class="${cls}">${label}</button>`;
  const field=(label,html)=>`<label class="sw-field"><span>${label}</span>${html}</label>`;
  const go=(page,label)=>`<button type="button" data-action="navigate" data-page="${page}">${label}</button>`;
  const label=(s,id)=>s.site.sitemap?.nodes.find(n=>n.id===id)?.title||s.site.blocks.find(b=>b.id===id)?.title||id;
  function pageRows(s){return `<section class="card sw-card"><header class="between"><div class="sw-heading-line"><h2>栏目页面</h2><p class="small muted">每个栏目选择显示方式；日期、标题、图片和摘要可编辑，详情使用独立页面。</p></div>${go('website-sitemap','修改网站架构')}</header><div class="table-scroll"><table><thead><tr><th>栏目 / 路径</th><th>显示方式</th><th>分页</th><th>内容数量</th><th>操作</th></tr></thead><tbody>${s.site.blocks.filter(n=>!n.parentPageId).map(n=>{const c=W.config(s,n.id);return `<tr><td><strong>${e(label(s,n.id))}</strong><small class="sw-block">${e(s.site.sitemap?.nodes.find(x=>x.id===n.id)?.path||'/'+n.id+'/')}</small></td><td>${e(W.modes[c.mode]||'未选择')}</td><td>${c.pagination?'每页 '+c.pageSize+' 项':'不分页'}</td><td>${c.entries.length}</td><td class="sw-row-actions">${button('settings','显示设置',`data-id="${e(n.id)}"`)}${button('entries','内容列表',`data-id="${e(n.id)}" ${c.mode?'':'disabled'}`)}${button('preview','预览',`data-id="${e(n.id)}" ${c.mode?'':'disabled'}`)}</td></tr>`;}).join('')}</tbody></table></div>${!s.site.blocks.length?'<p class="empty">先在网站架构中选择模板，或从已有站点读入。</p>':''}</section>`;}
  function details(s){
    const M=local?require('./sitemap-view.js'):root.LGASitemapView;
    const nodes=s.site.sitemap?.nodes?.length?s.site.sitemap.nodes:s.site.blocks.filter(b=>!b.parentPageId).map(b=>({id:b.id,title:b.id==='hero'?'首页':b.title,parent:'',path:b.id==='hero'?'/':'/'+b.id+'/',visible:true}));
    const plus='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',trash='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"/></svg>';
    const row=(title,action,attrs,pending=false)=>`<li class="content-entry-row"><button type="button" class="content-title-link" data-action="${action}" ${attrs} title="${e(title)}">${e(title)}</button>${pending?'<span class="content-pending" title="待填写" aria-label="待填写">·</span>':''}<button type="button" class="content-icon content-delete" data-action="removeSiteDetail" ${attrs} aria-label="删除详情 ${e(title)}" title="删除详情">${trash}</button></li>`;
    const node=n=>`<div class="content-map-heading">${M.folderIcon}<strong title="${e(n.title)}">${e(n.title)}</strong><button type="button" class="content-icon" data-action="addSiteDetail" data-page-id="${e(n.id)}" aria-label="新增详情 ${e(n.title)}" title="新增详情">${plus}</button></div><ul class="content-title-list">${W.detailsFor(s,n.id).map(block=>{const entry=W.config(s,n.id).entries.find(x=>x.detailId===block.id);return row(block.title,entry?'openEntryDetail':'editSiteBlock',entry?`data-page-id="${e(n.id)}" data-entry-id="${e(entry.id)}"`:`data-id="${e(block.id)}"`,!block.body?.trim()).replace('</button>', '</button>'+W.mountIcon(block));}).join('')}</ul>`;

    return `<div class="website-content-index">${M.menuMap(nodes,node,(zh,en)=>zh,s.company.draft.name,{contentIndex:true})}${s.site.blocks.some(b=>b.kind==='detail'&&!W.mounts(b).length)?'<section class="map-position-group"><h3>未挂载详情</h3>'+s.site.blocks.filter(b=>b.kind==='detail'&&!W.mounts(b).length).map(b=>'<button data-action="editSiteBlock" data-id="'+e(b.id)+'">'+e(b.title)+'</button>').join('')+'</section>':''}</div>`;
  }
  function versions(s){const rows=s.site.sourceVersions||[];return `<section class="card sw-card"><header class="between"><div class="sw-heading-line"><h2>页面与配置版本</h2><p class="small muted">恢复版本会生成新草稿，不替换已上线的网站。</p></div>${button('saveVersion','保存版本','','primary')}</header><div class="sw-policy"><strong>媒体保留规则</strong><span>同名图片、视频只保留最新文件；恢复页面版本时仍使用最新媒体。</span></div><div class="table-scroll"><table><thead><tr><th>版本</th><th>保存时间</th><th>说明</th><th>操作</th></tr></thead><tbody>${rows.slice().reverse().map(v=>`<tr><td>${e(v.id)}</td><td>${e(new Date(v.at).toLocaleString())}</td><td>${e(v.note)}</td><td>${button('versionDetail','查看',`data-id="${e(v.id)}"`)} ${button('restore','恢复为草稿',`data-id="${e(v.id)}"`)}</td></tr>`).join('')}</tbody></table></div>${rows.length?'':'<p class="empty">尚无保存的版本。页面编辑仍自动保存在当前浏览器。</p>'}<p class="small muted">原型仅保存本机记录。正式方案使用平台自建的 Forgejo / Gitea 私有仓库管理页面及配置；媒体不把历史大文件写入 Git。</p></section>`;}
  function languageSelection(s){const allowed=W.languages(s),chosen=W.selectedLanguages(s);return `<section class="card sw-card"><header class="between"><div class="sw-heading-line"><h2>选择发布语言</h2><p class="small muted">仅从当前目标市场的语言中选择；未选择的语言不发布。</p></div>${go('markets','修改目标市场')}</header><form data-sw-form="languages"><div class="sw-language-options">${allowed.map(id=>`<label class="check"><input type="checkbox" name="locale:${e(id)}" ${chosen.includes(id)?'checked':''}>${e(L.name(id,'zh-CN'))}</label>`).join('')||'<p>尚未选择目标市场。</p>'}</div><div class="card-actions"><button type="submit" class="primary" ${allowed.length?'':'disabled'}>保存发布语言</button></div></form></section>`;}
  function release(s){
    const B=local?require('./business.js'):root.LGABusiness,target=W.publication(s).target,receipt=W.currentPackage(s);
    return `<section class="card sw-card sw-publication"><header class="between"><div class="sw-heading-line"><h2>发布网站</h2><p class="small muted">选择平台托管，或下载到自己的服务器。</p></div></header>
      <form data-form="websitePublication"><fieldset class="sw-publication-targets"><legend>发布方式</legend>
        <label class="sw-publication-choice"><input type="radio" name="target" value="platform" ${target==='platform'?'checked':''}><span><strong>平台托管</strong><small>发布到平台 server</small></span></label>
        <label class="sw-publication-choice"><input type="radio" name="target" value="external" ${target==='external'?'checked':''}><span><strong>独立部署</strong><small>下载 ZIP，自有服务器托管</small></span></label>
      </fieldset><div class="sw-grid sw-publication-info"><div><span class="small muted sw-platform-note">拟发布地址</span><span class="small muted sw-external-note">网站域名（独立部署时配置）</span><p><strong>${e(s.site.domain?'https://'+s.site.domain+'/':'尚未设置域名')}</strong> <button type="button" data-action="openBusiness" data-kind="site" data-id="${e(B.activeId(s))}">修改</button></p></div><div><span class="small muted">发布语言</span><p>${W.selectedLanguages(s).map(id=>e(L.name(id,'zh-CN'))).join('、')||'未选择'}</p></div></div>
      <p class="small muted sw-platform-note">管理员先完成本站域名登记、解析、HTTPS 和访问入口配置，再点击发布。内容发布到上方地址；以后修改后点击更新，无需手工上传 ZIP。</p><p class="small muted sw-external-note">下载 ZIP 并完整解压，上传到服务器的网站目录，再为该目录配置域名和 HTTPS。可部署到我们自己的 server 或其他网站空间，无需运行平台后台。</p>
      <p class="small muted sw-package-note">ZIP 包含全部公开页面、已选发布语言、样式、脚本、图片、视频和部署说明；保留邮箱、电话等联系入口，不含询盘或 AI 接待后台。媒体未读入、下载失败或嵌入视频未替换时会提示，避免遗漏文件。</p><p class="small muted">当前原型下载为演示文件包，完整媒体打包与实际发布使用正式网站入口。</p>
      ${receipt?`<p role="status">${receipt.target==='external'?'外部':'本站'}发布包 ${e(receipt.version)} 已准备；网站尚未上线。</p>`:''}
      <div class="card-actions">${go('website-versions','版本记录')}<button type="button" data-action="openWebsitePreview">网站预览</button><button type="submit">保存发布设置</button><button type="button" class="primary" data-action="prepareWebsitePackage">下载完整网站 ZIP</button></div></form></section>`;
  }
  function dialog(s){
    if(!ui.dialog)return '';
    const c=W.config(s,ui.pageId),current=s.site.blocks.find(n=>n.id===ui.pageId),title=label(s,ui.pageId);let heading='',body='',footer='';
    if(ui.dialog==='settings'){
      heading='显示设置 · '+title;body=`<form id="sw-dialog-form" data-sw-form="settings"><div class="sw-grid">${field('显示方式 *',`<select name="mode" required><option value="">请选择</option>${Object.entries(W.modes).map(([id,n])=>`<option value="${id}" ${c.mode===id?'selected':''}>${n}</option>`).join('')}</select>`)}${field('是否分页',`<select name="pagination"><option value="off" ${!c.pagination?'selected':''}>不分页</option><option value="on" ${c.pagination?'selected':''}>分页</option></select>`)}${field('每页显示数量',`<input type="number" name="pageSize" min="1" max="100" required value="${c.pageSize}">`)}<div class="sw-field"><span>跳转详情</span><p>在内容列表中为每项选择详情页。</p></div></div><div class="sw-mode-notes"><p><strong>列表</strong>：日期、标题，可修改。</p><p><strong>Tab</strong>：图片、部分文字，点击标签切换内容。</p><p><strong>轮播</strong>：图片、部分文字，支持上一个 / 下一个。</p></div></form>`;footer='<button type="submit" form="sw-dialog-form" class="primary">保存设置</button>';
    }else if(ui.dialog==='entries'){
      heading='内容列表 · '+title;body=`<header class="between"><span>${e(W.modes[c.mode])} · ${c.entries.length} 项</span>${button('newEntry','新增内容','','primary')}</header><div class="table-scroll"><table><thead><tr><th>日期</th><th>标题</th><th>详情页</th><th>操作</th></tr></thead><tbody>${c.entries.map(x=>`<tr><td>${e(x.date||'—')}</td><td>${e(x.title)}</td><td>${e(x.detailId?label(s,x.detailId):'不跳转')}</td><td>${button('editEntry','修改',`data-id="${e(x.id)}"`)} ${button('removeEntry','删除',`data-id="${e(x.id)}"`)}</td></tr>`).join('')}</tbody></table></div>${c.entries.length?'':'<p class="empty">新增日期、标题、图片和摘要，再关联详情页。</p>'}`;
    }else if(ui.dialog==='entry'){
      const row=c.entries.find(x=>x.id===ui.entryId)||{};heading=(row.id?'修改':'新增')+'内容 · '+title;
      body=`<form id="sw-dialog-form" data-sw-form="entry"><div class="sw-grid">${field('标题 *',`<input name="title" value="${e(row.title)}" required maxlength="200">`)}${field('日期',`<input name="date" type="date" value="${e(row.date)}">`)}${field('图片地址',`<input name="image" type="url" value="${e(row.image)}" placeholder="https://…">`)}${field('跳转详情',`<select name="detailId"><option value="">不跳转</option>${s.site.blocks.filter(n=>n.visible).map(n=>`<option value="${e(n.id)}" ${row.detailId===n.id?'selected':''}>${e(label(s,n.id))}</option>`).join('')}</select>`)}</div>${field('部分文字 / 摘要',`<textarea name="summary" rows="3" maxlength="2000">${e(row.summary)}</textarea>`)}<p class="small muted">详情页在“内容详情”中使用人工编排或 AI 编辑；此处管理栏目入口。</p></form>`;footer='<button type="submit" form="sw-dialog-form" class="primary">保存内容</button>';
    }else if(ui.dialog==='preview'){
      heading='栏目预览 · '+title;body=`<div class="sw-visitor">${collection(s,ui.pageId)}</div>`;
    }else if(ui.dialog==='saveVersion'){
      heading='保存网站版本';body=`<form id="sw-dialog-form" data-sw-form="version">${field('版本说明',`<textarea name="note" rows="3" maxlength="500" required placeholder="例如：调整产品栏目、更新公司介绍"></textarea>`)}<p>保存页面内容、架构、显示方式、语言和配置。图片／视频只使用最新文件。</p></form>`;footer='<button type="submit" form="sw-dialog-form" class="primary">保存版本</button>';
    }else if(ui.dialog==='versionDetail'){
      const v=s.site.sourceVersions.find(v=>v.id===ui.versionId);heading='版本 '+v.id;body=`<p>${e(v.note)}</p><div class="sw-grid"><p>页面数量：${v.document.blocks.length}</p><p>发布语言：${v.document.publishLanguages.map(id=>e(L.name(id,'zh-CN'))).join('、')}</p></div><ul>${v.document.blocks.map(n=>`<li>${e(n.title)} · ${e(W.modes[v.document.presentations[n.id]?.mode||'list']||'列表')}</li>`).join('')}</ul><p class="hint">历史页面可恢复，媒体仍指向最新文件。</p>`;

    }
    return `<dialog class="sw-dialog" id="self-website-dialog"><header><h2>${e(heading)}</h2>${button('close','×','aria-label="关闭窗口"')}</header><div class="sw-dialog-body">${body}<p role="alert" data-sw-error hidden></p></div><footer>${button('close',ui.dialog==='entry'?'返回':'关闭')}${footer}</footer></dialog>`;
  }
  function render(s,page){return `<div data-sw-root>${page==='website-pages'?pageRows(s):page==='website-versions'?versions(s):release(s)}${dialog(s)}</div>`;}
  function languageMarkup(s){return `<div data-sw-root>${languageSelection(s)}</div>`;}
  function collection(s,id,hrefFor){
    const c=W.config(s,id);if(!c.mode)return '';c.entries=c.entries.filter(x=>!x.detailId||!s.site.blocks.find(b=>b.id===x.detailId)?.mountIds||W.mounts(s.site.blocks.find(b=>b.id===x.detailId)).includes(id));for(const block of W.detailsFor(s,id).filter(b=>b.id!==id&&!c.entries.some(e=>e.detailId===b.id))){const info=Object.values(s.site.presentations||{}).flatMap(p=>p.entries||[]).find(x=>x.detailId===block.id);c.entries.push({...info,id:'mounted-'+block.id,title:block.title,detailId:block.id});}
    return `<div class="sw-collection" data-sw-collection data-mode="${e(c.mode)}" data-size="${c.pagination?c.pageSize:Math.max(1,c.entries.length)}"><div class="sw-collection-controls" data-sw-tabs></div><div class="sw-items">${c.entries.filter(x=>!x.detailId||s.site.blocks.some(b=>b.id===x.detailId&&b.visible)).map((x,i)=>`<article class="sw-collection-item" data-sw-item="${i}">${x.image&&c.mode!=='list'?`<img src="${e(x.image)}" alt="${e(x.title)}" loading="lazy">`:''}<div>${c.mode==='list'?`<time>${e(x.date)}</time>`:''}<h3 data-sw-entry-title>${e(x.title)}</h3>${c.mode!=='list'?`<p>${e(x.summary)}</p>`:''}${x.detailId?(hrefFor?`<a href="${e(hrefFor(x.detailId))}" data-site-page-link="${e(x.detailId)}">查看详情</a>`:`<button type="button" data-sw-detail="${e(x.detailId)}">查看详情</button>`):''}</div></article>`).join('')||'<p class="empty">暂无内容。</p>'}</div><div class="sw-collection-controls" data-sw-pager></div></div>`;
  }
  function mountCollections(doc,onDetail){
    for(const box of doc.querySelectorAll('[data-sw-collection]')){
      if(box.dataset.mounted)continue;box.dataset.mounted='true';const items=[...box.querySelectorAll('[data-sw-item]')],size=Number(box.dataset.size),pages=Math.max(1,Math.ceil(items.length/size));let page=0,active=0;
      const draw=()=>{const slice=items.slice(page*size,(page+1)*size);if(active>=slice.length)active=0;items.forEach(x=>x.hidden=!slice.includes(x)||(box.dataset.mode!=='list'&&slice[active]!==x));
        const tabs=box.querySelector('[data-sw-tabs]');tabs.innerHTML=box.dataset.mode==='tabs'?slice.map((x,i)=>`<button type="button" data-sw-index="${i}" aria-pressed="${active===i}">${e(x.querySelector('h3').textContent)}</button>`).join(''):box.dataset.mode==='carousel'?`<button type="button" data-sw-slide="-1" ${active?'':'disabled'}>上一项</button><span>${slice.length?active+1:0} / ${slice.length}</span><button type="button" data-sw-slide="1" ${active<slice.length-1?'':'disabled'}>下一项</button>`:'';
        box.querySelector('[data-sw-pager]').innerHTML=pages>1?`<button type="button" data-sw-page="-1" ${page?'':'disabled'}>上一页</button><span>第 ${page+1} / ${pages} 页</span><button type="button" data-sw-page="1" ${page<pages-1?'':'disabled'}>下一页</button>`:'';};
      box.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.swDetail){event.preventDefault();const site=b.closest('.designed-site');if(site)site.dispatchEvent(new CustomEvent('lga:page',{detail:b.dataset.swDetail}));else onDetail?.(b.dataset.swDetail);return;}if(b.dataset.swIndex!==undefined)active=Number(b.dataset.swIndex);if(b.dataset.swSlide)active+=Number(b.dataset.swSlide);if(b.dataset.swPage){page+=Number(b.dataset.swPage);active=0;}draw();});draw();
    }
  }
  function mount(doc,{getState,scope,dispatch,render,onDetail,notify}={}){
    if(ui.scope!==scope)ui={scope,dialog:'',pageId:'',entryId:'',versionId:''};
    const dlg=doc.querySelector('#self-website-dialog');if(dlg){dlg.showModal();dlg.addEventListener('cancel',ev=>{ev.preventDefault();close();});}
    const form=dlg?.querySelector('form'),initial=form?JSON.stringify([...new FormData(form)]):'';
    function close(){if(form&&JSON.stringify([...new FormData(form)])!==initial&&!root.confirm('修改尚未保存，确定离开？'))return;ui.dialog=ui.dialog==='entry'?'entries':'';render();}
    const execute=(type,p)=>dispatch(type,p);
    for(const box of doc.querySelectorAll('[data-sw-root]')){
      box.addEventListener('click',ev=>{const b=ev.target.closest('[data-sw]');if(!b)return;ev.preventDefault();ev.stopPropagation();try{
        const action=b.dataset.sw,id=b.dataset.id;
        if(action==='close'){close();return;}
        if(['settings','entries','preview'].includes(action)){ui.pageId=id;ui.dialog=action;}
        if(action==='newEntry'||action==='editEntry'){ui.entryId=action==='newEntry'?'':id;ui.dialog='entry';}
        if(action==='removeEntry'){if(!root.confirm('删除这条栏目内容？'))return;execute('removePageEntry',{pageId:ui.pageId,id});return;}
        if(action==='saveVersion')ui.dialog=action;
        if(action==='versionDetail'){ui.versionId=id;ui.dialog=action;}
        if(action==='restore'){if(!root.confirm('恢复为新草稿？当前内容会先保存，媒体仍使用最新文件。'))return;execute('restoreWebsiteVersion',{id});notify('版本已恢复为草稿，网站未发布。');return;}
        render();
      }catch(err){showError(err);}});
      box.addEventListener('submit',ev=>{const f=ev.target.closest('[data-sw-form]');if(!f)return;ev.preventDefault();ev.stopPropagation();try{
        if(!f.reportValidity())return;const p=Object.fromEntries(new FormData(f)),kind=f.dataset.swForm;
        if(kind==='settings'){execute('savePagePresentation',{...p,id:ui.pageId});ui.dialog='';}
        if(kind==='entry'){execute('savePageEntry',{...p,pageId:ui.pageId,id:ui.entryId});ui.dialog='entries';}
        if(kind==='languages')execute('savePublishLanguages',{locales:Object.keys(p).filter(k=>k.startsWith('locale:')).map(k=>k.slice(7))});
        if(kind==='version'){execute('saveWebsiteVersion',p);ui.dialog='';}
        render();
      }catch(err){showError(err);}});
    }
    function showError(err){const node=doc.querySelector('[data-sw-error]');if(node){node.hidden=false;node.textContent=err.message;}else notify(err.message,true);}
    mountCollections(doc,id=>{ui.dialog='';onDetail(id);});
  }
  function setScope(scope){if(ui.scope!==scope)ui={scope,dialog:'',pageId:'',entryId:'',versionId:''};}
  const api={render,details,languageMarkup,collection,mount,mountCollections,setScope};if(local)module.exports=api;else root.LGASelfWebsiteView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
