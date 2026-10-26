create table exportweb_inquiry (
 tenant_id bigint not null, org_id uuid not null, id uuid not null,
 company_id varchar(80) not null, host text not null, sender_name varchar(120) not null,
 email varchar(254) not null, company_name varchar(160) not null, country char(2) not null,
 subject varchar(180) not null, message varchar(5000) not null, digest char(64) not null,
 client_hash char(64) not null, state varchar(20) not null default 'NEW' check(state in ('NEW','HANDLED','SPAM')),
 note varchar(3000) not null default '', revision bigint not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(tenant_id,org_id,id)
);
create index exportweb_inquiry_rate on exportweb_inquiry(tenant_id,org_id,client_hash,created_at);
alter table exportweb_inquiry enable row level security;
alter table exportweb_inquiry force row level security;
create policy org_scope on exportweb_inquiry using (
 tenant_id = nullif(current_setting('exportweb.tenant_id',true),'')::bigint and org_id = nullif(current_setting('exportweb.org_id',true),'')::uuid
) with check (
 tenant_id = nullif(current_setting('exportweb.tenant_id',true),'')::bigint and org_id = nullif(current_setting('exportweb.org_id',true),'')::uuid
);
