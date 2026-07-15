# Database and Security Model

The database is Supabase PostgreSQL. Migrations live in `supabase/migrations/`, use UTC `timestamptz`, UUID primary keys, explicit constraints, and reversible forward fixes. Do not modify Supabase-managed `auth`, `storage`, or `realtime` schemas with custom tables or functions.

## Tables

| Table | Purpose | Key invariants |
| --- | --- | --- |
| `profiles` | Candidate profile linked to Auth | Primary key references `auth.users(id)` |
| `resumes` | Private PDF metadata and processing state | Owned path, safe errors, one primary resume |
| `resume_analysis` | Parsed and structured resume result | One row per resume; provider/model/prompt/schema versions |
| `job_descriptions` | Pasted JD source and status | Text only; no file/storage columns |
| `jd_analysis` | Structured JD and resume alignment | Score 0–100; not a hiring probability |
| `interviews` | Interview configuration and lifecycle | Limit 5/10; immutable engine version; nullable start/completion timestamps |
| `questions` | Exact asked-question history | Unique sequence per interview; provenance; private expected concepts |
| `answers` | Submitted transcript and delivery metrics | One per question; idempotent client request per interview |
| `evaluations` | Structured coaching feedback | One per answer; all scores 0–100; versioned rubric |
| `roadmaps` | Prioritized practice plan and curated resource IDs | Deterministic or versioned AI organization |

Embeddings, vector logs, recruiters, companies, webcam events, and derived report/mastery tables are not required for the MVP.

## Ownership and RLS

All user-owned tables include `user_id`, an index on ownership/query paths, and RLS enabled. The standard policy expression is:

```sql
(select auth.uid()) = user_id
```

Updates require both read ownership and write ownership:

```sql
create policy "users update owned rows"
on public.example_table
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

Fastify still verifies ownership. RLS is defense in depth, not a reason to omit service checks.

## Required constraints

- `interviews.question_limit in (5, 10)`.
- `interviews.adaptive_engine_version` is non-null and fixed after creation.
- `questions` unique on `(interview_id, sequence_number)`.
- `answers.question_id` unique.
- `answers` unique on `(interview_id, client_request_id)`.
- `evaluations.answer_id` unique.
- All evaluation and alignment scores constrained from 0 through 100.
- Status, type, difficulty, input mode, and processing stage constrained to documented values.
- Foreign keys define intentional delete behavior; private Storage deletion is coordinated by the service before/with metadata deletion.

## Resume Storage

Bucket: private `resumes`  
Object path: `resumes/{userId}/{resumeId}.pdf`

Policies validate that the authenticated user owns the user-ID path segment. Never store a public resume URL. Deletion must remove the object or return a safe recoverable failure rather than silently orphaning it.

## Realtime

Resume and JD status tables must be added to the `supabase_realtime` publication before clients subscribe. Clients establish the per-record subscription before triggering processing, reconcile the current row after subscribing, and unsubscribe on completion/unmount.

## Migration review checklist

- [ ] RLS enabled and explicit policies added.
- [ ] `USING` and `WITH CHECK` reviewed.
- [ ] Ownership and common query indexes added.
- [ ] Constraints encode 5/10 and score/status invariants.
- [ ] Grants are no broader than required.
- [ ] Realtime publication change is present where needed.
- [ ] No secrets or real candidate data appear in SQL/fixtures.
- [ ] A clean environment can apply migrations in order.
