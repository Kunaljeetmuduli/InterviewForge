grant update
on table public.resumes
to authenticated;

grant select, insert, update
on table public.resume_analysis
to authenticated;

grant select, insert, update, delete
on table public.job_descriptions
to authenticated;

grant select, insert, update
on table public.jd_analysis
to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'resumes'
  ) then
    alter publication supabase_realtime add table public.resumes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'job_descriptions'
  ) then
    alter publication supabase_realtime add table public.job_descriptions;
  end if;
end
$$;
