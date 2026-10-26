// Native interaction shared by hosted pages, previews and downloaded pages.
document.addEventListener('change',event=>{if(event.target.matches('[data-site-language]'))location.href=event.target.value;});
function closeMenus(root=document){for(const toggle of root.querySelectorAll('[data-site-toggle]')){if(toggle.closest('.site-footer-nav'))continue;toggle.setAttribute('aria-expanded','false');toggle.closest('.site-nav-item').querySelector(':scope > .site-dropdown').hidden=true;}}
document.addEventListener('click',event=>{
 const toggle=event.target.closest('[data-site-toggle]');
 if(toggle){const item=toggle.closest('.site-nav-item'),open=toggle.getAttribute('aria-expanded')!=='true';if(!item.closest('.site-footer-nav'))for(const sibling of item.parentElement.children)if(sibling!==item)closeMenus(sibling);toggle.setAttribute('aria-expanded',String(open));item.querySelector(':scope > .site-dropdown').hidden=!open;return;}
 const label=event.target.closest('.site-nav-label');
 if(label&&!event.target.closest('[data-site-toggle]')){const item=label.closest('.site-nav-item'),dropdown=item.querySelector(':scope > .site-dropdown'),control=label.querySelector('[data-site-toggle]');if(dropdown&&control&&dropdown.hidden){event.preventDefault();if(!item.closest('.site-footer-nav'))for(const sibling of item.parentElement.children)if(sibling!==item)closeMenus(sibling);control.setAttribute('aria-expanded','true');dropdown.hidden=false;return;}}
 const mobile=event.target.closest('[data-site-mobile-toggle]');
 if(mobile){const site=mobile.closest('.designed-site'),open=site.dataset.mobileOpen!=='true';site.dataset.mobileOpen=String(open);mobile.setAttribute('aria-expanded',String(open));return;}
 if(!event.target.closest('.site-dropdown')||event.target.closest('a'))closeMenus();
 if(event.target.closest('.mock-nav a')){const site=event.target.closest('.designed-site');site.dataset.mobileOpen='false';site.querySelector('[data-site-mobile-toggle]')?.setAttribute('aria-expanded','false');}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenus();for(const site of document.querySelectorAll('.designed-site')){site.dataset.mobileOpen='false';site.querySelector('[data-site-mobile-toggle]')?.setAttribute('aria-expanded','false');}}});
for(const box of document.querySelectorAll('[data-sw-collection]')){
 const items=[...box.querySelectorAll('[data-sw-item]')],size=Math.max(1,Number(box.dataset.size)),pages=Math.max(1,Math.ceil(items.length/size));let page=0,active=0;
 function button(label,action,disabled=false,pressed){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));b.addEventListener('click',()=>{action();draw();});return b;}
 function text(value){const s=document.createElement('span');s.textContent=value;return s;}
 function draw(){const slice=items.slice(page*size,(page+1)*size);if(active>=slice.length)active=0;items.forEach(item=>item.hidden=!slice.includes(item)||(box.dataset.mode!=='list'&&slice[active]!==item));
  const tabs=box.querySelector('[data-sw-tabs]');tabs.replaceChildren();if(box.dataset.mode==='tabs')slice.forEach((item,i)=>tabs.append(button(item.querySelector('h3').textContent,()=>active=i,false,i===active)));
  if(box.dataset.mode==='carousel')tabs.append(button('上一项',()=>active--,!active),text((slice.length?active+1:0)+' / '+slice.length),button('下一项',()=>active++,active>=slice.length-1));
  const pager=box.querySelector('[data-sw-pager]');pager.replaceChildren();if(pages>1)pager.append(button('上一页',()=>{page--;active=0;},!page),text('第 '+(page+1)+' / '+pages+' 页'),button('下一页',()=>{page++;active=0;},page===pages-1));
 }
 draw();
}
