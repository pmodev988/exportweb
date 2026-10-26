import {test,expect} from 'vitest';
import {skins,defaults,valid,readAppearance,applyAppearance} from '../src/appearance';
test('all shared skins, modes and densities apply without modifying product data; account preferences are isolated',()=>{
 expect(skins).toHaveLength(16);
 for(const skin of skins)for(const mode of ['light','dark','system'])for(const density of ['compact','standard','comfortable']){
  const setting={skin:skin.id,mode,density};applyAppearance(setting);
  expect({...document.documentElement.dataset}).toMatchObject({bxSkin:skin.id,bxMode:mode,bxDensity:density});
 }
 localStorage.setItem('exportweb-appearance:org:a',JSON.stringify({skin:skins[3].id,mode:'dark',density:'comfortable'}));
 expect(readAppearance('org:a').mode).toBe('dark');expect(readAppearance('org:b')).toEqual(defaults);
 expect(valid({skin:'invalid',density:'invalid',mode:'invalid'})).toEqual(defaults);
});
