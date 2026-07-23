-- Milestone 4 persists deterministic roadmap snapshots. Existing ownership RLS
-- remains authoritative; only the operations used by the API are exposed.

grant select, insert, update, delete
on table public.roadmaps
to authenticated;
