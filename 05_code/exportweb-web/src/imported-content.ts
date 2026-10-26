import '../../../03_design/ux/prototype/ai-acquisition/content-layouts.js';
import '../../../03_design/ux/prototype/ai-acquisition/imported-content.js';
declare global {var LGAImportedContent:{normalize:(root:HTMLElement)=>HTMLElement};}
declare global {var LGAContentLayouts:{components:{id:string;name:string}[];templates:Record<string,string>};}
export const contentLayouts=globalThis.LGAContentLayouts;
export function importedContent(html:string){
 const root=new DOMParser().parseFromString(html,'text/html').body;
 return globalThis.LGAImportedContent.normalize(root).innerHTML;
}
