-- Milestone 3 exposes only the operations required by the authenticated
-- interview workflow. Existing RLS ownership policies remain authoritative.

grant select, insert, update, delete
on table public.interviews
to authenticated;

grant select, insert
on table public.questions
to authenticated;

grant select, insert, update
on table public.answers
to authenticated;

grant select, insert, update
on table public.evaluations
to authenticated;
