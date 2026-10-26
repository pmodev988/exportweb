create table exportweb_project(
 tenant_id bigint not null, org_id uuid not null, revision bigint not null default 0,
 document jsonb not null, updated_at timestamptz not null default now(),
 primary key(tenant_id,org_id)
);
create table exportweb_revision(
 tenant_id bigint not null, org_id uuid not null, revision bigint not null,
 document jsonb not null, created_at timestamptz not null default now(),
 primary key(tenant_id,org_id,revision)
);
create table exportweb_publication(
 tenant_id bigint not null, org_id uuid not null, revision bigint not null,
 document jsonb not null, host text not null, published_at timestamptz not null default now(),
 primary key(tenant_id,org_id), unique(host)
);
create table exportweb_asset(
 tenant_id bigint not null, org_id uuid not null, id uuid not null,
 media_type text not null, object_key text not null, byte_size bigint not null, created_at timestamptz not null default now(),
 primary key(tenant_id,org_id,id)
);
do $$ declare t text; begin
 foreach t in array array['exportweb_project','exportweb_revision','exportweb_publication','exportweb_asset'] loop
  execute format('alter table %I enable row level security',t);
  execute format('alter table %I force row level security',t);
  execute format('create policy org_scope on %I using (tenant_id = nullif(current_setting(''exportweb.tenant_id'',true),'''')::bigint and org_id = nullif(current_setting(''exportweb.org_id'',true),'''')::uuid) with check (tenant_id = nullif(current_setting(''exportweb.tenant_id'',true),'''')::bigint and org_id = nullif(current_setting(''exportweb.org_id'',true),'''')::uuid)',t);
 end loop;
end $$;
create table spring_session(primary_id char(36) not null primary key,session_id char(36) not null,creation_time bigint not null,last_access_time bigint not null,max_inactive_interval integer not null,expiry_time bigint not null,principal_name varchar(100));
create unique index spring_session_ix1 on spring_session(session_id);
create index spring_session_ix2 on spring_session(expiry_time);
create index spring_session_ix3 on spring_session(principal_name);
create table spring_session_attributes(session_primary_id char(36) not null,attribute_name varchar(200) not null,attribute_bytes bytea not null,primary key(session_primary_id,attribute_name),foreign key(session_primary_id) references spring_session(primary_id) on delete cascade);
