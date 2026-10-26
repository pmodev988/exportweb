"""One-time, source-only extraction. Refuses to overwrite existing product source."""
from pathlib import Path
import hashlib, json, re, shutil, subprocess

source = Path(r'C:\098_pmo\05Lga')
target = Path(__file__).resolve().parents[2]
assert target == Path(r'C:\098_pmo\06ExportWeb')
assert not (target/'05_code/exportweb-api').exists()
baseline = subprocess.check_output(['wsl','-d','Ubuntu-rls-260921','-u','rls','--','git','-C','/mnt/c/098_pmo/05Lga','rev-parse','HEAD'],text=True).strip()
manifest=[]
def copy(src, dst, adapt=False):
    data=src.read_bytes(); dst.parent.mkdir(parents=True,exist_ok=True)
    if adapt:
        text=data.decode('utf-8').replace('\r\n','\n')
        text=text.replace('dev.pmo.lga','dev.pmo.exportweb').replace('lga-api','exportweb-api').replace('lga-web','exportweb-web')
        text=text.replace('lga_','exportweb_').replace('lga.','exportweb.').replace('lga/','exportweb/').replace('LGA_','EXPORTWEB_')
        data=text.encode('utf-8')
    assert not dst.exists(),dst
    dst.write_bytes(data)
    manifest.append({'source':str(src.relative_to(source)).replace('\\','/'),'target':str(dst.relative_to(target)).replace('\\','/'),'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest()})

for p in source.iterdir():
    if p.is_dir() and re.match(r'^\d{2}_',p.name) and p.name not in ('88_ana','98_ref','99_tmp'):
        (target/p.name).mkdir(exist_ok=True)
for name in ['.gitignore','.gitattributes']:
    if (source/name).exists(): copy(source/name,target/name)
for name in ['shared-experience']:
    for p in (source/'05_code'/name).rglob('*'):
        if p.is_file(): copy(p,target/p.relative_to(source))

backend='AiTasks BusinessRecords BusinessWorkspace ContentHtml DatabaseGuard EntryAuthorization ImportedContent Jobs MediaObjects OpsAccess OrganizationEntryFilter Project ProjectMapper ProjectStore PublicWebsiteReader RequestTrace Security SiteHtml SiteMetadata SiteSettings SystemSettings ThemeCatalog TradeDocuments WebsiteImport WebsiteNavigation WebsitePackage Websites WorkspaceData BusinessApi JobWorker LgaApplication'.split()
for name in backend:
    p=source/'05_code/lga-api/src/main/java/dev/pmo/lga'/f'{name}.java'
    dst=target/'05_code/exportweb-api/src/main/java/dev/pmo/exportweb'/f'{name}.java'
    if name=='LgaApplication':dst=dst.with_name('ExportWebApplication.java')
    copy(p,dst,True)
    if name=='LgaApplication':dst.write_text(dst.read_text().replace('LgaApplication','ExportWebApplication'),encoding='utf-8')
copy(source/'05_code/lga-api/pom.xml',target/'05_code/exportweb-api/pom.xml',True)
for name in ['application.properties','application-worker.properties','website-package-readme.txt']:
    copy(source/'05_code/lga-api/src/main/resources'/name,target/'05_code/exportweb-api/src/main/resources'/name,True)
for p in (source/'05_code/lga-api/src/main/resources/db/migration').glob('*.sql'):
    if int(re.match(r'V(\d+)',p.name)[1])<=5:copy(p,target/'05_code/exportweb-api/src/main/resources/db/migration'/p.name.replace('lga','exportweb'),True)

frontend='App.vue AppearanceSettings.vue CompanyPlan.vue DetailEditor.vue FolderIcon.vue MenuDetailLinks.vue SafeContent.vue SharedDetailIcon.vue SiteArticles.vue SiteGeo.vue SiteMenu.vue Website.vue WebsiteCollection.vue WebsiteContacts.vue WebsiteContentTree.vue WebsiteDesign.vue WebsiteLabels.vue WebsiteLanguages.vue WebsiteList.vue WebsitePreview.vue WebsiteStructure.vue WebsiteTreeNode.vue WebsiteVersions.vue api.ts appearance.ts business-facts.ts business-workspace.ts business.ts communications.ts customer-data.ts detail-media.ts imported-content.ts login-session.ts model.ts navigation.ts project-merge.ts site-settings.ts store.ts tasks.ts trade-data.ts translation-sheet.ts websites.ts style.css workspace.css website-workspace.css site-view.css site-view.js'.split()
for name in frontend:copy(source/'05_code/lga-web/src'/name,target/'05_code/exportweb-web/src'/name,True)
for name in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html']:
    copy(source/'05_code/lga-web'/name,target/'05_code/exportweb-web'/name,True)
for name in ['prepare.mjs','prepare-workspace-styles.mjs']:
    copy(source/'05_code/lga-web/tools'/name,target/'05_code/exportweb-web/tools'/name,True)

# Build-time catalog and presentation sources only; no LGA SPA or simulated backend.
proto=source/'03_design/ux/prototype/ai-acquisition'
pending=[proto/n for n in ['sitemap-catalog.js','site-design.js','search.js','site-languages.js','content-layouts.js','market-regions.js']]
seen=set()
while pending:
    p=pending.pop().resolve()
    if p in seen:continue
    seen.add(p)
    copy(p,target/p.relative_to(source))
    for ref in re.findall(r"require\(['\"](\.[^'\"]+)['\"]\)",p.read_text(encoding='utf-8')):
        dep=(p.parent/ref).resolve()
        if not dep.suffix:dep=dep.with_suffix('.js')
        if dep.is_file():pending.append(dep)
for name in ['style.css','theme.css','growth.css','prospecting.css','design.css','detail-studio.css','business.css','self-website.css','insights.css','acquisition.css']:
    copy(proto/name,target/(proto/name).relative_to(source))
for p in (proto/'brand').glob('*'):
    if p.suffix in ('.png','.svg'):copy(p,target/p.relative_to(source))

for folder in [target/'05_code/exportweb-api',target/'05_code/exportweb-web']:
    p=folder/('pom.xml' if folder.name.endswith('api') else 'package.json')
    text=p.read_text(encoding='utf-8').replace('0.1.23','0.1.0')
    p.write_text(text,encoding='utf-8')
out=target/'04_contracts/LGA-SOURCE-MANIFEST.json';out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'sourceCommit':baseline,'files':manifest},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Extracted {len(manifest)} source files from {baseline}; no credentials or customer data copied.')
