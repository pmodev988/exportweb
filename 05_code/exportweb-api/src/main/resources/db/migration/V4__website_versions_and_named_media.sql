create table exportweb_website_version(
 tenant_id bigint not null, org_id uuid not null, site_id varchar(80) not null,
 version_no bigint not null, source_revision bigint not null, document jsonb not null,
 note varchar(500) not null, created_at timestamptz not null default now(),
 primary key(tenant_id,org_id,site_id,version_no)
);
alter table exportweb_website_version enable row level security;
alter table exportweb_website_version force row level security;
create policy org_scope on exportweb_website_version using (
 tenant_id=nullif(current_setting('exportweb.tenant_id',true),'')::bigint and org_id=nullif(current_setting('exportweb.org_id',true),'')::uuid
) with check (
 tenant_id=nullif(current_setting('exportweb.tenant_id',true),'')::bigint and org_id=nullif(current_setting('exportweb.org_id',true),'')::uuid
);
alter table exportweb_asset add column site_id varchar(80) not null default '';
alter table exportweb_asset add column file_name varchar(255) not null default '';
create unique index exportweb_asset_named on exportweb_asset(tenant_id,org_id,site_id,file_name) where file_name<>'';
alter table exportweb_job drop constraint exportweb_job_kind_check;
alter table exportweb_job add constraint exportweb_job_kind_check check(kind in ('PLAN','TRANSLATE','IMPORT','EDIT'));
