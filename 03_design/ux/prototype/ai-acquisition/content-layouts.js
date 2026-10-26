(function(root){
 'use strict';
 const components=[
  {id:'prose',name:'正文与标题'}, {id:'media-text',name:'左右图文'},
  {id:'products',name:'产品列表'}, {id:'cards',name:'产品卡片'},
  {id:'gallery',name:'图片组'}, {id:'specs',name:'参数表'}, {id:'callout',name:'行动按钮'}
 ];
 const media='<div class="media-placeholder" data-media-kind="image" data-media-name="待添加图片" data-media-alt="" data-media-source=""><p>添加图片</p></div>';
 const copy='<h3>产品名称</h3><p>填写产品说明。</p>';
 const product=`<div class="rich-columns rich-columns-2 content-product"><div class="rich-column">${media}</div><div class="rich-column">${copy}</div></div>`;
 const templates={
  prose:'<h2>内容标题</h2><p>填写正文内容。</p>',
  'media-text':`<div class="rich-columns rich-columns-2 content-media-text"><div class="rich-column">${media}</div><div class="rich-column"><h2>图文标题</h2><p>填写与图片对应的说明。</p></div></div>`,
  products:`<div class="content-products">${product}${product}</div>`,
  cards:`<div class="content-card-grid">${Array.from({length:3},()=>`<div class="content-card">${media}${copy}</div>`).join('')}</div>`,
  gallery:`<div class="content-gallery">${Array.from({length:3},()=>`<figure>${media}<figcaption>图片说明</figcaption></figure>`).join('')}</div>`,
  specs:'<figure class="table content-specs"><table><tbody><tr><th>参数</th><th>说明</th></tr><tr><td>参数名称</td><td>填写真实参数</td></tr></tbody></table></figure>',
  callout:'<div class="content-callout"><h3>联系与咨询</h3><p>填写希望访客采取的下一步行动。</p><p><a class="content-button" href="#">设置按钮文字及链接</a></p></div>'
 };
 const css=`
.detail-layout-tools{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:0 0 12px}.detail-layout-tools label{display:flex;align-items:center;gap:8px;margin:0;font-size:13px}.detail-layout-tools select{width:auto;min-width:130px;margin:0}.detail-layout-tools button{white-space:nowrap}.detail-layout-tools small{color:var(--muted)}
/* Standard content components use the active candidate's design tokens. */
.designed-site{--content-gap:24px;--content-pad:22px;--content-radius:var(--detail-radius,6px);--content-shadow:none;--content-edge:1px;--content-heading-font:var(--detail-font,inherit)}
.designed-site.theme-S1{--content-edge:2px;--content-radius:3px}.designed-site.theme-S2{--content-radius:2px;--content-pad:24px}.designed-site.theme-S3{--content-gap:32px;--content-radius:0px}.designed-site.theme-S4{--content-pad:28px;--content-radius:4px}.designed-site.theme-S5{--content-radius:18px}.designed-site.theme-S6{--content-radius:4px;--content-heading-font:Georgia,'Songti SC',serif}.designed-site.theme-S7{--content-edge:2px;--content-radius:10px}.designed-site.theme-S8{--content-radius:16px;--content-shadow:0 5px 24px color-mix(in srgb,var(--accent) 12%,transparent)}.designed-site.theme-S9{--content-radius:5px;--content-pad:24px}.designed-site.theme-S10{--content-radius:20px}.designed-site.theme-S11{--content-radius:0px;--content-heading-font:Georgia,'Songti SC',serif}.designed-site.theme-S12{--content-radius:18px;--content-gap:18px}
.designed-site :is(.rich-content,.smart-detail-content){overflow-wrap:anywhere}
.designed-site :is(.rich-content,.smart-detail-content) .media-placeholder{background:var(--bg);color:var(--ink);border-color:var(--line)}
.designed-site :is(.rich-content,.smart-detail-content) .media-placeholder p{color:inherit}
.designed-site :is(.rich-content,.smart-detail-content) .content-media-text{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:var(--content-gap);align-items:center;margin:24px 0}
.designed-site :is(.rich-content,.smart-detail-content) .content-media-text>.rich-column{min-width:0;min-height:0}
.designed-site :is(.rich-content,.smart-detail-content) .content-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:var(--content-gap);margin:24px 0}
.designed-site :is(.rich-content,.smart-detail-content) :is(.content-card,.content-callout){padding:var(--content-pad);border:var(--content-edge) solid var(--line);border-radius:var(--content-radius);background:var(--paper);color:var(--ink);box-shadow:var(--content-shadow);min-width:0}
.designed-site :is(.rich-content,.smart-detail-content) .content-card :is(h2,h3){font:var(--detail-weight) 21px/1.35 var(--content-heading-font);margin:14px 0 10px}
.designed-site :is(.rich-content,.smart-detail-content) .content-card p{margin:8px 0;white-space:normal;font-size:16px;line-height:1.7}
.designed-site :is(.rich-content,.smart-detail-content) .content-card :is(img,video){width:100%;height:190px;object-fit:contain;margin:0;border-radius:var(--content-radius)}
.designed-site :is(.rich-content,.smart-detail-content) .content-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--content-gap);margin:24px 0}
.designed-site :is(.rich-content,.smart-detail-content) .content-gallery>:is(figure,.rich-column){margin:0;min-width:0;padding:12px;background:var(--paper);border:1px solid var(--line);border-radius:var(--content-radius)}
.designed-site :is(.rich-content,.smart-detail-content) .content-gallery img{width:100%;height:190px;object-fit:contain;margin:0}
.designed-site :is(.rich-content,.smart-detail-content) .content-specs{display:block;width:100%;max-width:100%;margin:24px 0;overflow-x:auto;border:1px solid var(--line);border-radius:var(--content-radius)}
.designed-site :is(.rich-content,.smart-detail-content) .content-specs table{display:table;width:100%;min-width:360px;border-collapse:collapse;margin:0;font-size:15px;line-height:1.6}
.designed-site :is(.rich-content,.smart-detail-content) .content-specs :is(th,td){padding:12px 16px;text-align:start;border:1px solid var(--line);color:var(--ink);vertical-align:top;white-space:normal}
.designed-site :is(.rich-content,.smart-detail-content) .content-specs th{background:var(--paper);font-weight:650}.designed-site :is(.rich-content,.smart-detail-content) .content-specs tr:nth-child(even) td{background:color-mix(in srgb,var(--paper) 60%,var(--bg))}
.designed-site :is(.rich-content,.smart-detail-content) .content-callout{margin:24px 0;border-inline-start:4px solid var(--accent)}
.designed-site :is(.rich-content,.smart-detail-content) .content-callout :is(h2,h3){font-family:var(--content-heading-font);margin:0 0 12px}
.designed-site :is(.rich-content,.smart-detail-content) .content-button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 20px;max-width:100%;border:1px solid var(--accent);border-radius:var(--content-radius);background:var(--accent);color:var(--onaccent);font-size:15px;font-weight:600;line-height:1.4;text-decoration:none!important;white-space:normal}
.designed-site :is(.rich-content,.smart-detail-content) .content-button:hover{filter:brightness(1.08)}.designed-site :is(.rich-content,.smart-detail-content) .content-button:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
.designed-site :is(.rich-content,.smart-detail-content) .content-media-text :is(img,video){width:100%;height:auto;max-height:380px;object-fit:contain;border-radius:var(--content-radius)}
.designed-site :is(.rich-content,.smart-detail-content) .content-product{border-width:var(--content-edge);border-radius:var(--content-radius);box-shadow:var(--content-shadow)}
.designed-site :is(.rich-content,.smart-detail-content) .content-product h3{font-family:var(--content-heading-font)}
@container(max-width:640px){.designed-site :is(.rich-content,.smart-detail-content) :is(.content-media-text,.content-card-grid,.content-gallery){grid-template-columns:minmax(0,1fr);gap:18px}.designed-site{--content-pad:18px}}
@media(max-width:640px){.designed-site :is(.rich-content,.smart-detail-content) :is(.content-media-text,.content-card-grid,.content-gallery){grid-template-columns:minmax(0,1fr);gap:18px}.designed-site{--content-pad:18px}}
.designed-site .rich-content .content-product,.designed-site .smart-detail-content .content-product{display:grid;grid-template-columns:minmax(180px,26%) minmax(0,1fr);gap:clamp(18px,3vw,36px);align-items:center;margin:18px 0;padding:20px;border:var(--content-edge) solid var(--line);border-radius:var(--content-radius);box-shadow:var(--content-shadow);background:var(--paper);color:var(--ink);font-size:16px;line-height:1.7}
.designed-site .rich-content .content-product>.rich-column,.designed-site .smart-detail-content .content-product>.rich-column{min-width:0;min-height:0;padding:0}
.designed-site .rich-content .content-product h3,.designed-site .smart-detail-content .content-product h3{margin:0 0 10px;font-size:clamp(19px,1.7vw,24px);line-height:1.3;font-family:var(--content-heading-font);font-weight:var(--detail-weight)}
.designed-site .rich-content .content-product :is(p,figure),.designed-site .smart-detail-content .content-product :is(p,figure){margin:10px 0;min-height:0}
.designed-site .rich-content .content-product p,.designed-site .smart-detail-content .content-product p{white-space:normal}
.designed-site .rich-content .content-product img,.designed-site .smart-detail-content .content-product img{display:block;width:100%;max-width:100%;height:210px;max-height:none;object-fit:contain;margin:0;border-radius:var(--detail-radius,4px)}
.designed-site .rich-content .content-product h3 a,.designed-site .smart-detail-content .content-product h3 a{color:inherit;text-decoration:none!important}
.designed-site .rich-content .content-product h3 a:hover,.designed-site .smart-detail-content .content-product h3 a:hover{color:var(--accent);text-decoration:underline!important}
.designed-site .rich-content .content-product>.rich-column:last-child>a,.designed-site .smart-detail-content .content-product>.rich-column:last-child>a,.designed-site .rich-content .content-product>.rich-column:last-child>p>a:only-child,.designed-site .smart-detail-content .content-product>.rich-column:last-child>p>a:only-child{display:inline-block;padding:8px 18px;margin-top:8px;border:1px solid var(--accent);border-radius:var(--detail-radius,4px);color:var(--onaccent);background:var(--accent);font-size:14px;text-decoration:none!important}
@container(max-width:640px){.designed-site .rich-content .content-product,.designed-site .smart-detail-content .content-product{grid-template-columns:minmax(0,1fr);padding:16px;gap:14px}.designed-site .rich-content .content-product img,.designed-site .smart-detail-content .content-product img{height:190px}}
@media(max-width:640px){.designed-site .rich-content .content-product,.designed-site .smart-detail-content .content-product{grid-template-columns:minmax(0,1fr);padding:16px;gap:14px}.designed-site .rich-content .content-product img,.designed-site .smart-detail-content .content-product img{height:190px}}
`;

 const api={components,templates,css};root.LGAContentLayouts=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root.document&&!root.document.getElementById('content-layouts-style')){const style=root.document.createElement('style');style.id='content-layouts-style';style.textContent=css;root.document.head.append(style);}
})(typeof globalThis!=='undefined'?globalThis:this);
