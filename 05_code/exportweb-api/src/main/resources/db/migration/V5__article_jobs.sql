-- Additive task capability; preserve all existing jobs and their evidence.
alter table exportweb_job drop constraint exportweb_job_kind_check;
alter table exportweb_job add constraint exportweb_job_kind_check check(kind in ('PLAN','TRANSLATE','IMPORT','EDIT','ARTICLE'));
