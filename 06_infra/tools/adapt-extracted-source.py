"""Apply the initial product boundary to the recorded source extraction."""
from pathlib import Path
import json,re
r=Path(__file__).resolve().parents[2]
j=r/'05_code/exportweb-api/src/main/java/dev/pmo/exportweb'
w=r/'05_code/exportweb-web'
def edit(p,fn):p.write_text(fn(p.read_text(encoding='utf-8')),encoding='utf-8',newline='\n')
def between(s,a,b,replacement=''):
    start=s.index(a);end=s.index(b,start);return s[:start]+replacement+s[end:]

edit(j/'OpsAccess.java',lambda s:s.replace('301','302'))
edit(j/'BusinessApi.java',lambda s:between(s,' record ProspectRequest',' @PostMapping("/api/v1/articles/generate")').replace('"0.1.23"','"0.1.0"'))
edit(j/'AiTasks.java',lambda s:between(s,' Map<String,Object> outreach(', ' Project translate('))
edit(j/'JobWorker.java',lambda s:between(s,' @org.springframework.beans.factory.annotation.Autowired private ProspectingTasks',' private final Jobs')
 .replace('   if("RECEPTION".equals(row.get("kind"))){reception.run(scope,work,person,json.readTree((String)row.get("input_text")));return;}\n','')
 .replace('   }else if(kind.equals("PROSPECT"))', '   }else if(kind.equals("PROSPECT"))'))
def worker(s):
    s=re.sub(r'\}else if\(kind.equals\("PROSPECT"\)\).*?\n','}\n',s)
    s=re.sub(r'   else if\(kind.equals\("OUTREACH_DRAFT"\)\).*?\n','',s)
    s=s.replace('case "OUTREACH_DRAFT"->"正在生成个性化开发信";','').replace('case "PROSPECT"->"正在分析企业资料";','')
    s=s.replace('if("RECEPTION".equals(row.get("kind")))reception.failed(work,row);','')
    return s.replace('"IMPORT","ARTICLE","OUTREACH_DRAFT"','"IMPORT","ARTICLE"')
edit(j/'JobWorker.java',worker)
edit(j/'Jobs.java',lambda s:between(s,' // Called inside the inquiry transaction;', ' private final '))
# Only article and GEO records belong to the builder business document.
def business(s):
    s=s.replace('  BusinessRecords.validate(node);','  for(String key:node.propertyNames())if(!Set.of("sequence","articles","geo").contains(key))throw new IllegalArgumentException("独立网站不接受其他产品的业务资料");')
    s=between(s,'  bound(node.path("acquisition")','  var articles=')
    return between(s,'  for(var t:node.path("acquisition")','  if(node.has("geo"))')
edit(j/'BusinessWorkspace.java',business)
edit(j/'Project.java',lambda s:between(s,'  if(workspace.business()!=null)for(var a:','  if(design.pageMode()'))
for name in ['BusinessRecords.java','TradeDocuments.java']:(j/name).unlink()
# All owned source/config identities are independent of LGA. Branding artwork is intentionally shared.
for p in j.glob('*.java'):
    edit(p,lambda s:s.replace('"lga"','"exportweb"').replace('/authorization/lga','/authorization/exportweb').replace('LGA 运行','ExportWeb 运行').replace('LGA 需要','ExportWeb 需要'))
props=r/'05_code/exportweb-api/src/main/resources/application.properties'
def config(s):
    lines=[x for x in s.splitlines() if not re.match(r'exportweb\.(reception|sources|amail|outreach|prospecting|discovery)\.',x)]
    return '\n'.join(lines).replace('spring.application.name=lga','spring.application.name=exportweb').replace('EXPORTWEB_PORT:8097','EXPORTWEB_PORT:8098').replace('registration.lga','registration.exportweb')+'\n'
edit(props,config)
edit(j/'Security.java',lambda s:s.replace('.csrf(c->c.ignoringRequestMatchers("/ingest/v1/*/*/*"))','.csrf(Customizer.withDefaults())'))
# Reuse editor and selected catalogs, but never ship the former acquisition/review application.
prepare=w/'tools/prepare.mjs'
def prep(s):
    s=s.replace("import {prepareReview} from './prepare-review.mjs';\n",'').replace("import {prepareInsights} from './prepare-insights.mjs';\n",'')
    s=between(s,'// The production opening',"const generated=",'')
    s=s.replace('await prepareInsights(prototype,generated);\n','')
    s=between(s,'const opening=','const Languages=')
    s=s.replace(",Growth=require(path.join(prototype,'growth.js'))",'')
    s=s.replace("  socialChannels:Growth.channels.map(x=>({id:x.id,name:x.name,fit:x.zh,format:x.format,loginUrl:Growth.channelLogin(x.id)}))",'  socialChannels:[]')
    return s.replace('prepareReview(output);','')
edit(prepare,prep)
edit(w/'src/business-workspace.ts',lambda s:s[:s.index('export interface BusinessWorkspace')]+'''export interface BusinessWorkspace {sequence:number;articles:Article[];geo?:Record<string,Record<string,string>[]>}
export function business(p:Project):BusinessWorkspace {
 p.workspace||={sales:[],goal:{goal:'',positioning:'',actions:[]}};
 return p.workspace.business||={sequence:0,articles:[]};
}
''')
for name in ['business-facts.ts','trade-data.ts','customer-data.ts']:(w/'src'/name).unlink()
# Preserve the source target-market selection UI; sales-team operations stay in LGA.
def company(s):
    s=s.replace(",['sales','销售团队','']",'')
    s=s.replace("save('sales')","save()")
    s=between(s," <section v-else-if=\"item[0]==='sales'\"",' </section>\n </section>', ' </section>') if " </section>\n </section>" in s[s.index(" <section v-else-if=\"item[0]==='sales'\""):] else s
    return s
# Sales tab removed first; remaining dead sales markup is removed separately with the template review.
edit(w/'src/CompanyPlan.vue',lambda s:s.replace(",['sales','销售团队','']",'').replace("save('sales')","save()"))
edit(w/'src/App.vue',lambda s:s.replace("import {reviewVersion} from './generated/review-version';",'').replace("import {reviewVersion} from './generated/review-version'",'')
 .replace('301','302').replace("'LGA'","'独立网站'").replace('LGA 仅向','独立网站仅向').replace('你的获客工作台','独立网站工作台').replace('AI 帮你安排获客工作','网站编辑与发布')
 .replace('<a href="/workspace/review/index.html">原型审核 · {{reviewVersion}}</a>','').replace('/oauth2/authorization/lga','/oauth2/authorization/exportweb'))
edit(w/'src/login-session.ts',lambda s:s.replace('/oauth2/authorization/lga','/oauth2/authorization/exportweb').replace('lga-login','exportweb-login'))
edit(w/'src/appearance.ts',lambda s:s.replace('lga-appearance','exportweb-appearance'))
edit(w/'index.html',lambda s:s.replace('<title>LGA</title>','<title>独立网站</title>').replace('<link rel="stylesheet" href="/workspace/brand/brand-intro.css">',''))
edit(w/'package.json',lambda s:s.replace('"name": "lga"','"name": "exportweb"'))
edit(w/'package-lock.json',lambda s:s.replace('"version": "0.1.23"','"version": "0.1.0"'))
print('Independent runtime and builder-only API boundary applied.')
