-- Read-only Milestone 3 catalog checks. Run after the Milestone 3 migration.

select
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in ('interviews', 'questions', 'answers', 'evaluations')
order by table_name, privilege_type;

select
  conrelid::regclass as table_name,
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.interviews'::regclass,
  'public.questions'::regclass,
  'public.answers'::regclass,
  'public.evaluations'::regclass
)
order by conrelid::regclass::text, conname;

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
  and tablename in ('interviews', 'questions', 'answers', 'evaluations')
order by tablename, policyname;
