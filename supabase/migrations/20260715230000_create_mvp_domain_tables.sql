create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null,
  status text not null default 'pending',
  processing_stage text,
  processing_attempt integer not null default 0,
  error_code text,
  error_message text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resumes_id_user_id_unique unique (id, user_id),
  constraint resumes_mime_type_check check (mime_type = 'application/pdf'),
  constraint resumes_file_size_check check (
    file_size > 0 and file_size <= 5242880
  ),
  constraint resumes_status_check check (
    status in ('pending', 'processing', 'completed', 'failed')
  ),
  constraint resumes_processing_stage_check check (
    processing_stage is null
    or processing_stage in ('uploaded', 'parsing', 'redacting', 'analyzing')
  ),
  constraint resumes_processing_attempt_check check (processing_attempt >= 0)
);

create unique index resumes_one_primary_per_user_idx
on public.resumes (user_id)
where is_primary;

create index resumes_user_id_created_at_idx
on public.resumes (user_id, created_at desc);

create table public.resume_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid not null unique,
  extracted_text text not null,
  summary text not null,
  skills jsonb not null,
  projects jsonb not null,
  education jsonb not null,
  experience jsonb not null,
  certifications jsonb not null,
  technologies jsonb not null,
  strengths jsonb not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_analysis_resume_owner_fkey
    foreign key (resume_id, user_id)
    references public.resumes (id, user_id)
    on delete cascade
);

create index resume_analysis_user_id_idx
on public.resume_analysis (user_id);

create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  company text,
  raw_text text not null,
  status text not null default 'pending',
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_descriptions_id_user_id_unique unique (id, user_id),
  constraint job_descriptions_status_check check (
    status in ('pending', 'analyzing', 'completed', 'failed')
  )
);

create index job_descriptions_user_id_created_at_idx
on public.job_descriptions (user_id, created_at desc);

create table public.jd_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_description_id uuid not null unique,
  required_skills jsonb not null,
  preferred_skills jsonb not null,
  minimum_experience text not null,
  responsibilities jsonb not null,
  keywords jsonb not null,
  matching_skills jsonb not null,
  missing_skills jsonb not null,
  alignment_score integer not null,
  alignment_algorithm_version text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jd_analysis_job_description_owner_fkey
    foreign key (job_description_id, user_id)
    references public.job_descriptions (id, user_id)
    on delete cascade,
  constraint jd_analysis_alignment_score_check check (
    alignment_score between 0 and 100
  )
);

create index jd_analysis_user_id_idx
on public.jd_analysis (user_id);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid,
  job_description_id uuid,
  type text not null,
  status text not null default 'created',
  current_difficulty text not null default 'easy',
  question_limit integer not null default 5,
  target_topics jsonb not null default '[]'::jsonb,
  adaptive_engine_version text not null default 'adaptive-v1',
  overall_score integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interviews_id_user_id_unique unique (id, user_id),
  constraint interviews_resume_owner_fkey
    foreign key (resume_id, user_id)
    references public.resumes (id, user_id),
  constraint interviews_job_description_owner_fkey
    foreign key (job_description_id, user_id)
    references public.job_descriptions (id, user_id),
  constraint interviews_type_check check (
    type in ('hr', 'technical', 'behavioral', 'dsa')
  ),
  constraint interviews_status_check check (
    status in ('created', 'in_progress', 'completed', 'abandoned')
  ),
  constraint interviews_current_difficulty_check check (
    current_difficulty in ('easy', 'medium', 'hard')
  ),
  constraint interviews_question_limit_check check (question_limit in (5, 10)),
  constraint interviews_adaptive_engine_version_check check (
    adaptive_engine_version = 'adaptive-v1'
  ),
  constraint interviews_overall_score_check check (
    overall_score is null or overall_score between 0 and 100
  )
);

create index interviews_user_id_created_at_idx
on public.interviews (user_id, created_at desc);

create index interviews_user_id_status_idx
on public.interviews (user_id, status);

create index interviews_resume_id_idx
on public.interviews (resume_id)
where resume_id is not null;

create index interviews_job_description_id_idx
on public.interviews (job_description_id)
where job_description_id is not null;

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  interview_id uuid not null,
  sequence_number integer not null,
  text text not null,
  type text not null,
  topic text not null,
  difficulty text not null,
  expected_concepts jsonb not null,
  follow_up_topics jsonb not null,
  estimated_seconds integer not null,
  source text not null,
  question_bank_id text,
  adaptation_strategy text,
  adaptation_reason text,
  provider text,
  model text,
  prompt_version text,
  schema_version text not null,
  created_at timestamptz not null default now(),
  constraint questions_id_interview_user_unique unique (
    id,
    interview_id,
    user_id
  ),
  constraint questions_interview_sequence_unique unique (
    interview_id,
    sequence_number
  ),
  constraint questions_interview_owner_fkey
    foreign key (interview_id, user_id)
    references public.interviews (id, user_id)
    on delete cascade,
  constraint questions_sequence_number_check check (sequence_number > 0),
  constraint questions_type_check check (
    type in ('hr', 'technical', 'behavioral', 'dsa')
  ),
  constraint questions_difficulty_check check (
    difficulty in ('easy', 'medium', 'hard')
  ),
  constraint questions_estimated_seconds_check check (estimated_seconds > 0),
  constraint questions_source_check check (
    source in (
      'question_bank',
      'resume_generated',
      'jd_generated',
      'adaptive_follow_up'
    )
  )
);

create index questions_user_id_idx
on public.questions (user_id);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  interview_id uuid not null,
  question_id uuid not null unique,
  client_request_id uuid not null,
  transcript text not null,
  input_mode text not null,
  processing_status text not null default 'pending',
  speaking_duration_seconds numeric,
  word_count integer not null,
  filler_words jsonb not null default '[]'::jsonb,
  filler_rate numeric,
  words_per_minute numeric,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint answers_id_question_interview_user_unique unique (
    id,
    question_id,
    interview_id,
    user_id
  ),
  constraint answers_interview_client_request_unique unique (
    interview_id,
    client_request_id
  ),
  constraint answers_interview_owner_fkey
    foreign key (interview_id, user_id)
    references public.interviews (id, user_id)
    on delete cascade,
  constraint answers_question_owner_fkey
    foreign key (question_id, interview_id, user_id)
    references public.questions (id, interview_id, user_id)
    on delete cascade,
  constraint answers_input_mode_check check (input_mode in ('text', 'voice')),
  constraint answers_processing_status_check check (
    processing_status in ('pending', 'evaluated', 'failed')
  ),
  constraint answers_speaking_duration_check check (
    speaking_duration_seconds is null or speaking_duration_seconds >= 0
  ),
  constraint answers_word_count_check check (word_count >= 0),
  constraint answers_filler_rate_check check (
    filler_rate is null or filler_rate >= 0
  ),
  constraint answers_words_per_minute_check check (
    words_per_minute is null or words_per_minute >= 0
  )
);

create index answers_user_id_idx
on public.answers (user_id);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  interview_id uuid not null,
  question_id uuid not null,
  answer_id uuid not null unique,
  overall_score integer not null,
  technical_score integer,
  communication_score integer not null,
  completeness_score integer not null,
  relevance_score integer not null,
  delivery_score integer,
  strengths jsonb not null,
  weaknesses jsonb not null,
  detected_concepts jsonb not null,
  missing_concepts jsonb not null,
  improvement_tip text not null,
  example_answer text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null,
  rubric_version text not null,
  created_at timestamptz not null default now(),
  constraint evaluations_answer_owner_fkey
    foreign key (answer_id, question_id, interview_id, user_id)
    references public.answers (id, question_id, interview_id, user_id)
    on delete cascade,
  constraint evaluations_overall_score_check check (
    overall_score between 0 and 100
  ),
  constraint evaluations_technical_score_check check (
    technical_score is null or technical_score between 0 and 100
  ),
  constraint evaluations_communication_score_check check (
    communication_score between 0 and 100
  ),
  constraint evaluations_completeness_score_check check (
    completeness_score between 0 and 100
  ),
  constraint evaluations_relevance_score_check check (
    relevance_score between 0 and 100
  ),
  constraint evaluations_delivery_score_check check (
    delivery_score is null or delivery_score between 0 and 100
  )
);

create index evaluations_user_id_idx
on public.evaluations (user_id);

create index evaluations_interview_id_idx
on public.evaluations (interview_id);

create index evaluations_question_id_idx
on public.evaluations (question_id);

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_interview_id uuid,
  focus_topics jsonb not null,
  plan jsonb not null,
  resource_ids jsonb not null,
  algorithm_version text not null,
  provider text,
  model text,
  prompt_version text,
  schema_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roadmaps_source_interview_owner_fkey
    foreign key (source_interview_id, user_id)
    references public.interviews (id, user_id)
    on delete cascade
);

create index roadmaps_user_id_created_at_idx
on public.roadmaps (user_id, created_at desc);

create index roadmaps_source_interview_id_idx
on public.roadmaps (source_interview_id)
where source_interview_id is not null;

alter table public.resumes enable row level security;
alter table public.resume_analysis enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.jd_analysis enable row level security;
alter table public.interviews enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.evaluations enable row level security;
alter table public.roadmaps enable row level security;

revoke all on table public.resumes from public, anon, authenticated;
revoke all on table public.resume_analysis from public, anon, authenticated;
revoke all on table public.job_descriptions from public, anon, authenticated;
revoke all on table public.jd_analysis from public, anon, authenticated;
revoke all on table public.interviews from public, anon, authenticated;
revoke all on table public.questions from public, anon, authenticated;
revoke all on table public.answers from public, anon, authenticated;
revoke all on table public.evaluations from public, anon, authenticated;
revoke all on table public.roadmaps from public, anon, authenticated;

create policy "Users manage their own resumes"
on public.resumes
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own resume analysis"
on public.resume_analysis
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own job descriptions"
on public.job_descriptions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own JD analysis"
on public.jd_analysis
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own interviews"
on public.interviews
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own questions"
on public.questions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own answers"
on public.answers
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own evaluations"
on public.evaluations
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own roadmaps"
on public.roadmaps
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
