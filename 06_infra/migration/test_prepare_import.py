import copy, unittest, uuid
from prepare_import import prepare

class MigrationTest(unittest.TestCase):
    def setUp(self):
        self.org=str(uuid.uuid4());self.asset=str(uuid.uuid4())
        doc={'company':{'name':"O'Brien",'markets':['US','DE']},'pages':[{'id':'hero'}],
             'websites':{'activeId':'site-a','items':[{'id':'site-a'}]},'plan':'LGA-private-plan',
             'workspace':{'sales':[{'name':'private'}],'business':{'articles':[{'id':'a'}],'geo':{},'acquisition':{'secret':'not for builder'}}},
             'system':{'socialAccounts':{'private':'secret'},'contacts':[{'id':'contact-a'}]}}
        self.bundle={'format':'lga-website-extraction-v1','tenantId':901,'orgId':self.org,
                     'project':{'tenant_id':901,'org_id':self.org,'revision':7,'document':doc,'updated_at':'2026-10-26T00:00:00Z'},
                     'assets':[{'tenant_id':901,'org_id':self.org,'id':self.asset,'object_key':f'lga/901/{self.org}/{self.asset}',
                                'byte_size':100,'media_type':'image/png','created_at':'2026-10-26T00:00:00Z','site_id':'site-a','file_name':'logo.png'}]}
    def test_preserves_site_market_and_ids_but_excludes_lga_business(self):
        original=copy.deepcopy(self.bundle);out,assets,sql=prepare(self.bundle,901,self.org);doc=out['project'][0]['document']
        self.assertEqual(['US','DE'],doc['company']['markets']);self.assertEqual('site-a',doc['websites']['activeId'])
        self.assertEqual(['articles','geo'],list(doc['workspace']['business']));self.assertEqual([],doc['workspace']['sales'])
        self.assertNotIn('secret',sql);self.assertIn("O''Brien",sql);self.assertIn('TARGET_NOT_EMPTY',sql)
        self.assertEqual(original,self.bundle);self.assertTrue(assets[0]['targetKey'].startswith('exportweb/'))
    def test_rejects_cross_organization_and_unowned_assets(self):
        with self.assertRaises(ValueError):prepare(self.bundle,902,self.org)
        self.bundle['assets'][0]['org_id']=str(uuid.uuid4())
        with self.assertRaises(ValueError):prepare(self.bundle,901,self.org)
    def test_missing_project_and_future_schema_fail_closed(self):
        self.bundle['project']['document']['unknown']=True
        with self.assertRaises(ValueError):prepare(self.bundle,901,self.org)
        self.bundle['project']=None
        with self.assertRaises(ValueError):prepare(self.bundle,901,self.org)
if __name__=='__main__':unittest.main()
