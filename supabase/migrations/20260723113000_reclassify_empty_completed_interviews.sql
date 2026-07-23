-- Interviews ended before any answer was submitted have no completion report.
-- Reclassify records created before the application enforced this rule.

update public.interviews as interview
set
  status = 'abandoned',
  overall_score = null,
  completed_at = coalesce(interview.completed_at, now()),
  updated_at = now()
where interview.status = 'completed'
  and not exists (
    select 1
    from public.answers as answer
    where answer.interview_id = interview.id
  );
