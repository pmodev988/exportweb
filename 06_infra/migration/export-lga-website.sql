\set ON_ERROR_STOP on
-- Run through psql -qAt with tenant_id and org_id. Output is one bounded JSON bundle.
-- Source is read-only. The raw project contains LGA business fields: keep this export
-- private and run prepare_import.py to remove them. Never commit a customer bundle.
begin isolation level repeatable read read only;
select set_config('lga.tenant_id', :'tenant_id', true) as ignored \gset
select set_config('lga.org_id', :'org_id', true) as ignored \gset
select jsonb_build_object(
 'format','lga-website-extraction-v1','tenantId',:'tenant_id'::bigint,'orgId',:'org_id'::uuid,
 'project',(select to_jsonb(p) from lga_project p where tenant_id=:'tenant_id'::bigint and org_id=:'org_id'::uuid),
 'publications',coalesce((select jsonb_agg(to_jsonb(p)) from lga_publication p where tenant_id=:'tenant_id'::bigint and org_id=:'org_id'::uuid),'[]'),
 'versions',coalesce((select jsonb_agg(to_jsonb(p)) from lga_website_version p where tenant_id=:'tenant_id'::bigint and org_id=:'org_id'::uuid),'[]'),
 'assets',coalesce((select jsonb_agg(to_jsonb(p)) from lga_asset p where tenant_id=:'tenant_id'::bigint and org_id=:'org_id'::uuid and site_id<>'lga-business'),'[]'),
 'inquiries',coalesce((select jsonb_agg(to_jsonb(p)) from lga_inquiry p where tenant_id=:'tenant_id'::bigint and org_id=:'org_id'::uuid),'[]')
);
rollback;
