-- Run manually after all three Milestone 1 migrations.
-- This file is read-only and does not change the database.

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'resumes',
    'resume_analysis',
    'job_descriptions',
    'jd_analysis',
    'interviews',
    'questions',
    'answers',
    'evaluations',
    'roadmaps'
  )
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where
  (schemaname = 'public')
  or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select
  grantee,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by table_name, grantee;

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'resumes';

select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'profiles',
    'resumes',
    'resume_analysis',
    'job_descriptions',
    'jd_analysis',
    'interviews',
    'questions',
    'answers',
    'evaluations',
    'roadmaps'
  )
order by tablename, indexname;
