import tokens from '../../shared-experience/billion-tokens.json';
export const skins=Object.entries(tokens.skins).map(([id,value])=>({id,name:value.name}));
export interface Appearance{skin:string;mode:string;density:string}
export const defaults:Appearance={skin:'shinsui',mode:'light',density:'standard'};
export function valid(value:Partial<Appearance>):Appearance{return {
 skin:skins.some(s=>s.id===value.skin)?value.skin!:defaults.skin,
 mode:['light','dark','system'].includes(value.mode||'')?value.mode!:defaults.mode,
 density:['compact','standard','comfortable'].includes(value.density||'')?value.density!:defaults.density
};}
export function readAppearance(account:string):Appearance{try{return valid(JSON.parse(localStorage.getItem('exportweb-appearance:'+account)||'{}'));}catch{return {...defaults};}}
export function applyAppearance(value:Appearance){const a=valid(value),root=document.documentElement;root.dataset.bxSkin=a.skin;root.dataset.bxMode=a.mode;root.dataset.bxDensity=a.density;}
