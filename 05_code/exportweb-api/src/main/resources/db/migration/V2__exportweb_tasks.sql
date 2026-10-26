create table exportweb_job(
 tenant_id bigint not null, org_id uuid not null, id uuid not null,
 person_id uuid not null, host text not null, kind text not null check(kind in ('PLAN','TRANSLATE','IMPORT')),
 expected_revision bigint not null, status text not null default 'QUEUED' check(status in ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
 input jsonb not null, result jsonb, message text not null default '', progress int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(tenant_id,org_id,id)
);
create unique index exportweb_job_active_org on exportweb_job(tenant_id,org_id) where status in ('QUEUED','RUNNING');
alter table exportweb_job enable row level security;
alter table exportweb_job force row level security;
create policy org_scope on exportweb_job using (
 tenant_id=nullif(current_setting('exportweb.tenant_id',true),'')::bigint and org_id=nullif(current_setting('exportweb.org_id',true),'')::uuid
) with check (
 tenant_id=nullif(current_setting('exportweb.tenant_id',true),'')::bigint and org_id=nullif(current_setting('exportweb.org_id',true),'')::uuid
);
-- Delivery metadata only: no input, output, credentials or personal content. Worker scans this
-- table across organizations, then establishes RLS scope before touching a business job.
create table exportweb_job_outbox(
 job_id uuid primary key, tenant_id bigint not null, org_id uuid not null,
 attempts int not null default 0, available_at timestamptz not null default now(),
 foreign key(tenant_id,org_id,job_id) references exportweb_job(tenant_id,org_id,id)
);
