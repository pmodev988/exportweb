-- Retain existing published documents and RLS; independent hosts no longer overwrite each other.
alter table exportweb_publication drop constraint exportweb_publication_pkey;
alter table exportweb_publication add primary key(tenant_id,org_id,host);
