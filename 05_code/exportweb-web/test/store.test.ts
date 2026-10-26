import {test,expect,vi,afterEach} from 'vitest';
import {createPinia,setActivePinia} from 'pinia';
import {useProject} from '../src/store';
import {emptyProject,mergeImported} from '../src/model';
import {websites,synchronizeWebsite,switchWebsite} from '../src/websites';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(){
 setActivePinia(createPinia());const store=useProject();let snapshot={project:emptyProject(),revision:0,publicUrl:null,publishedRevision:null};
 const calls:any[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path,options)=>{
  if(String(path).includes('csrf'))return Response.json({header:'X-CSRF-TOKEN',token:'test'});
  if(options.method==='PUT'){calls.push(JSON.parse(options.body));if(Number(options.headers['If-Match'])!==snapshot.revision)return Response.json({}, {status:409});snapshot={...snapshot,project:JSON.parse(options.body),revision:snapshot.revision+1};}
  return Response.json(snapshot);
 }));
 return {store,calls,concurrent(change?:(p:any)=>void){if(change)change(snapshot.project);snapshot.revision++;}};
}
test('queued autosaves preserve changes and avoid saving unchanged versions',async()=>{
 vi.useFakeTimers();const {store,calls}=setup();await store.load();await store.flush();expect(calls).toHaveLength(0);
 store.project.company.name='最初';store.changed();store.project.company.name='最终';store.changed();
 await store.flush();expect(store.project.company.name).toBe('最终');expect(calls).toHaveLength(1);
 await store.flush();expect(calls).toHaveLength(1);
});
test('server revision changes with no overlapping edits are synchronized and saved',async()=>{
 vi.useFakeTimers();const {store,concurrent}=setup();await store.load();store.project.company.name='本机草稿';store.changed();concurrent();
 await store.flush();expect(store.project.company.name).toBe('本机草稿');expect(store.revision).toBe(2);expect(store.error).toBe('');expect(store.pending).toBe(false);
});
test('concurrent changes to the same value preserve local edits and expose recovery actions',async()=>{
 vi.useFakeTimers();const {store,concurrent}=setup();await store.load();store.project.company.name='本机草稿';store.changed();concurrent(p=>p.company.name='服务器名称');
 await expect(store.flush()).rejects.toThrow('相同资料');expect(store.project.company.name).toBe('本机草稿');expect(store.revision).toBe(0);expect(store.conflict).toBe(true);expect(store.pending).toBe(true);
});
test('server old-task cleanup can merge with a new local task',async()=>{
 vi.useFakeTimers();const {store,concurrent}=setup();await store.load();
 store.project.workspace={sales:[],goal:{goal:'',positioning:'',actions:[]}};
 store.project.workspace!.business={sequence:1,acquisition:{tasks:[{id:'old',keyword:'old'}],companies:[{id:'company',fact:'kept'}],selectedTask:'old'},prospecting:{sources:['lga']},businessInsights:{plans:[]},articles:[]};store.changed();await store.flush();
 const a=store.project.workspace!.business!.acquisition;a.tasks.unshift({id:'new',keyword:'new'});a.selectedTask='new';store.project.workspace!.business!.sequence=2;store.changed();
 concurrent(p=>{p.workspace.business.acquisition.tasks=[];p.workspace.business.acquisition.selectedTask='';});
 await store.flush();expect(store.project.workspace!.business!.acquisition.tasks.map((t:any)=>t.id)).toEqual(['new']);expect(store.project.workspace!.business!.acquisition.companies).toHaveLength(1);expect(store.conflict).toBe(false);
});
test('undo and redo restore whole page edits while persistence stays sequential',async()=>{
 vi.useFakeTimers();const {store}=setup();await store.load();store.project.company.name='新名称';store.changed();await store.flush();
 expect(store.canUndo).toBe(true);store.undo();await store.flush();expect(store.project.company.name).toBe('');expect(store.canRedo).toBe(true);
 store.redo();await store.flush();expect(store.project.company.name).toBe('新名称');
});
test('adopting an import replaces the existing structure and keeps imported parent identities',()=>{
 const p=emptyProject();p.pages=[{id:'existing',parent:'',title:'设备',path:'/equipment/',content:{}}];
 const imported={source:'https://supplier.example/',warnings:[],pages:[{id:'incoming',parent:'',title:'设备',path:'/equipment/',content:{}},{id:'child',parent:'incoming',title:'明细',path:'/detail/',content:{}}]};
  const result=mergeImported(p,imported);expect(result.pages.map(page=>page.id)).toEqual(['incoming','child']);expect(result.pages[1].parent).toBe('incoming');
});

test('replacing an old import persists new menus and shared bodies across refresh and website switching',async()=>{
 const {store,calls}=setup();await store.load();
 store.project.pages=[{id:'hero',parent:'',title:'首页',path:'/',content:{'zh-Hans':{title:'旧站首页',html:'<p>旧站正文</p>'}}},{id:'old-product',parent:'',title:'旧站产品',path:'/old-product/',content:{}}];
 websites(store.project);store.project.site=JSON.parse(JSON.stringify(store.project.websites!.items[0].document.site));store.project.site!.presentations={'old-product':{mode:'tabs',pagination:true,pageSize:5}};synchronizeWebsite(store.project);const other=JSON.parse(JSON.stringify(store.project.websites!.items[0]));other.id='other';other.name='其他网站';store.project.websites!.items.push(other);
 store.changed();await store.flush();
 const imported={source:'https://accurlcnc.com/',language:'en',warnings:[],pages:[
  {id:'hero',parent:'',title:'Home',path:'/',content:{en:{title:'New home',html:'<p>New body</p>'}}},
  {id:'products',parent:'',title:'Products',path:'/products/',content:{}},
  {id:'press',parent:'products',title:'Press Brake',path:'/press/',content:{}},
  {id:'about',parent:'',title:'About Us',path:'/about/',mountIds:['about','profile'],content:{en:{title:'Company Profile',html:'<p>Shared new content</p>'}}},
  {id:'profile',parent:'about',title:'Company Profile',path:'/profile/',detailDeleted:true,mountIds:[],content:{}}
 ]};
  store.project=mergeImported(store.project,imported);store.changed();await store.flush();await store.load();
 expect(store.project.sourceLanguage).toBe('en');expect(store.project.site?.presentations).toEqual({});expect(store.project.site?.structure?.template).toBe('existing-website');expect(store.project.pages.map(p=>p.title)).toEqual(['Home','Products','Press Brake','About Us','Company Profile']);expect(JSON.stringify(store.project.pages)).not.toContain('旧站');
 expect(store.project.pages.find(p=>p.id==='profile')?.parent).toBe('about');expect(store.project.pages.find(p=>p.id==='about')?.mountIds).toEqual(['about','profile']);
 switchWebsite(store.project,'other');expect(store.project.pages[0].title).toBe('首页');switchWebsite(store.project,'primary');expect(store.project.pages[0].title).toBe('Home');
  store.project=mergeImported(store.project,imported);store.changed();await store.flush();await store.load();expect(store.project.pages).toHaveLength(5);expect(calls.at(-1).websites.items[0].document.pages).toHaveLength(5);
});
