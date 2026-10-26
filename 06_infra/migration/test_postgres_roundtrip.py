"""Local PostgreSQL 18 integration test. Synthetic records, never production."""
import json, subprocess, uuid
from pathlib import Path
from prepare_import import prepare
from test_prepare_import import MigrationTest

def sql(port, database, user, statement=None, file=None, values=(), ok=True):
    args=['/usr/lib/postgresql/18/bin/psql','-X','-qAt','-h','127.0.0.1','-p',str(port),'-d',database,'-U',user,'-v','ON_ERROR_STOP=1']
    for key,value in values:args+=['-v',key+'='+str(value)]
    args+=['-f',str(file)] if file else ['-f','-']
    result=subprocess.run(args,input=None if file else statement,text=True,capture_output=True)
    if ok and result.returncode:raise AssertionError(result.stderr)
    if not ok:assert result.returncode and 'TARGET_NOT_EMPTY' in result.stderr,result.stderr
    return result.stdout.strip()

if __name__=='__main__':
    fixture=MigrationTest();fixture.setUp();tenant=901;org=fixture.org
    doc=fixture.bundle['project']['document'];literal=json.dumps(doc).replace("'","''")
    scope=f"select set_config('lga.tenant_id','{tenant}',true);select set_config('lga.org_id','{org}',true);"
    host='migration-'+org+'.example.test';inquiry=str(uuid.uuid4())
    sql(46249,'lgaqa','lgaqa_app',f"""begin;{scope}
      insert into lga_project(tenant_id,org_id,revision,document) values({tenant},'{org}',7,'{literal}'::jsonb);
      insert into lga_publication(tenant_id,org_id,revision,document,host) values({tenant},'{org}',7,'{literal}'::jsonb,'{host}');
      insert into lga_website_version(tenant_id,org_id,site_id,version_no,source_revision,document,note) values({tenant},'{org}','site-a',1,7,'{literal}'::jsonb,'before separation');
      insert into lga_inquiry(tenant_id,org_id,id,company_id,host,sender_name,email,company_name,country,subject,message,digest,client_hash) values({tenant},'{org}','{inquiry}','old-crm-company','{host}','Buyer','buyer@example.test','Buyer Inc','US','Quote','Specifications','{'a'*64}','{'b'*64}');commit;""")
    exporter=Path(__file__).with_name('export-lga-website.sql')
    before=sql(46249,'lgaqa','lgaqa_app',file=exporter,values=[('tenant_id',tenant),('org_id',org)])
    raw=json.loads(before);clean,assets,statement=prepare(raw,tenant,org)
    sql(46248,'exportwebqa','exportwebqa_app',statement)
    target_scope=f"select set_config('exportweb.tenant_id','{tenant}',true);select set_config('exportweb.org_id','{org}',true);"
    result=sql(46248,'exportwebqa','exportwebqa_app',f"""begin;{target_scope}
      select jsonb_build_object('revision',revision,'markets',document->'company'->'markets','business',document->'workspace'->'business','sales',document->'workspace'->'sales') from exportweb_project;
      select company_id from exportweb_inquiry;
      select count(*) from exportweb_publication;
      select count(*) from exportweb_website_version;rollback;""").splitlines()
    saved=json.loads(result[2]);assert saved['revision']==7 and saved['markets']==['US','DE']
    assert saved['sales']==[] and set(saved['business'])=={'articles','geo'}
    assert result[3:] == ['inquiry-'+inquiry,'1','1'],result
    sql(46248,'exportwebqa','exportwebqa_app',statement,ok=False)
    assert sql(46248,'exportwebqa','exportwebqa_app','select count(*) from exportweb_project')=='0'
    assert before==sql(46249,'lgaqa','lgaqa_app',file=exporter,values=[('tenant_id',tenant),('org_id',org)])
    print('PASS: scoped source export, cleaned import, publications/versions/inquiries, RLS, duplicate rejection, unchanged source')
