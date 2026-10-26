import {vi} from 'vitest';
// DOM integration only. These geometry shims do not constitute visual/browser evidence.
globalThis.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}};
window.matchMedia=vi.fn().mockImplementation(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false;}}));
Range.prototype.getClientRects=()=>[] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect=()=>new DOMRect();
HTMLElement.prototype.scrollIntoView=()=>{};
HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
