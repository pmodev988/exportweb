"""Offline, single-organization migration preparation; never connects to a database.

Input must come from export-lga-website.sql. Writes an import transaction, a cleaned
bundle, and the asset copy inventory. RLS owns backup, object copy, review and cutover.
No credentials or production data should be committed to Git.
"""
import argparse, copy, hashlib, json, re, uuid
from pathlib import Path

FIELDS = {'company','plan','theme','languages','sourceLanguage','pages','workspace','design','websites','site','system'}
TABLES = {
 'project': ('exportweb_project', ['tenant_id','org_id','revision','document','updated_at']),
 'publications': ('exportweb_publication', ['tenant_id','org_id','revision','document','host','published_at']),
 'versions': ('exportweb_website_version', ['tenant_id','org_id','site_id','version_no','source_revision','document','note','created_at']),
 'assets': ('exportweb_asset', ['tenant_id','org_id','id','media_type','object_key','byte_size','created_at','site_id','file_name']),
 'inquiries': ('exportweb_inquiry', ['tenant_id','org_id','id','company_id','host','sender_name','email','company_name','country','subject','message','digest','client_hash','state','note','revision','created_at','updated_at'])
}
def document(raw):
    if not isinstance(raw, dict) or not set(raw).issubset(FIELDS):
        raise ValueError('Unsupported project schema; review before migration')
    out=copy.deepcopy(raw)
    business=(out.get('workspace') or {}).get('business') or {}
    out['workspace']={'sales':[], 'goal':{'goal':'','positioning':'','actions':[]},
                      'business':{k:v for k,v in business.items() if k in ('articles','geo','sequence')}}
    out['plan']=''
    system=out.get('system') or {}
    out['system']={'socialAccounts':{},'channels':[],'contacts':system.get('contacts',[])}
    return out

def prepare(raw, tenant, org):
    if raw.get('format')!='lga-website-extraction-v1' or raw.get('tenantId')!=tenant or raw.get('orgId')!=org:
        raise ValueError('Source organization does not match the explicit target')
    if not isinstance(raw.get('project'),dict):raise ValueError('Source project missing')
    out={'format':'exportweb-import-v1','tenantId':tenant,'orgId':org};inventory=[]
    for key in TABLES:
        rows=[raw[key]] if key=='project' else raw.get(key,[])
        clean=[]
        for source in rows:
            if source.get('tenant_id')!=tenant or source.get('org_id')!=org:raise ValueError('Cross-organization row')
            row={k:copy.deepcopy(source[k]) for k in TABLES[key][1]}
            if 'document' in row:row['document']=document(row['document'])
            if key=='inquiries':
                uuid.UUID(row['id'])
                row['company_id']='inquiry-'+row['id']
            if key=='assets':
                uuid.UUID(row['id'])
                old=row['object_key'];expected=f'lga/{tenant}/{org}/{row["id"]}'
                if old!=expected or row['byte_size']<1:raise ValueError('Unrecognized asset ownership')
                row['object_key']=f'exportweb/{tenant}/{org}/{row["id"]}'
                inventory.append({'id':row['id'],'sourceKey':old,'targetKey':row['object_key'],'bytes':row['byte_size'],'mediaType':row['media_type']})
            clean.append(row)
        out[key]=clean
    sql=['\\set ON_ERROR_STOP on','begin;',f"select set_config('exportweb.tenant_id','{tenant}',true);",f"select set_config('exportweb.org_id','{org}',true);",'select pg_advisory_xact_lock(hashtextextended(\''+str(tenant)+':'+org+'\',0));']
    for table,_ in TABLES.values():
        sql.append(f"do $$ begin if exists(select 1 from {table} where tenant_id={tenant} and org_id='{org}'::uuid) then raise exception 'TARGET_NOT_EMPTY'; end if; end $$;")
    # Reject active customer work too; never overwrite a new customer's target.
    for table in ['exportweb_job']:
        sql.append(f"do $$ begin if exists(select 1 from {table} where tenant_id={tenant} and org_id='{org}'::uuid) then raise exception 'TARGET_NOT_EMPTY'; end if; end $$;")
    for key,(table,columns) in TABLES.items():
        for row in out[key]:
            literal=json.dumps(row,ensure_ascii=False).replace("'","''")
            cols=','.join(columns)
            sql.append(f"insert into {table}({cols}) select {cols} from jsonb_populate_record(null::{table},'{literal}'::jsonb);")
    sql.append('commit;')
    return out,inventory,'\n'.join(sql)+'\n'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);parser.add_argument('output',type=Path)
    parser.add_argument('--tenant',type=int,required=True);parser.add_argument('--org',required=True)
    a=parser.parse_args();org=str(uuid.UUID(a.org))
    if a.tenant<1:raise ValueError('Invalid tenant')
    if a.output.exists():raise ValueError('Output must be a new directory; existing results are never overwritten')
    if a.source.stat().st_size>256*1024*1024:raise ValueError('Bundle too large for this tool; arrange a bounded migration')
    raw=json.loads(a.source.read_text(encoding='utf-8'));bundle,assets,sql=prepare(raw,a.tenant,org)
    a.output.mkdir(parents=True)
    for name,value in [('bundle.json',bundle),('assets.json',assets)]:
        (a.output/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (a.output/'import.sql').write_text(sql,encoding='utf-8')
    manifest={'sourceSha256':hashlib.sha256(a.source.read_bytes()).hexdigest(),'tenantId':a.tenant,'orgId':org,
              'counts':{k:len(bundle[k]) for k in TABLES},'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in a.output.iterdir()}}
    (a.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print('Prepared offline import. Copy and hash-verify every asset before applying SQL; no source data changed.')
if __name__=='__main__':main()
