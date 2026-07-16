-- Read-only catalog checks for the manually applied Milestone 2 migration.

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'resumes',
    'resume_analysis',
    'job_descriptions',
    'jd_analysis'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select
  schemaname,
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('resumes', 'job_descriptions')
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'resumes',
    'resume_analysis',
    'job_descriptions',
    'jd_analysis'
  )
order by tablename, policyname;
