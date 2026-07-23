-- Read-only Milestone 4 catalog verification.

select
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name = 'roadmaps'
order by privilege_type;

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
  and tablename = 'roadmaps';

select
  c.conrelid::regclass as table_name,
  c.conname,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid = 'public.roadmaps'::regclass
order by c.conname;
