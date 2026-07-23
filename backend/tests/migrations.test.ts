import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDirectory = resolve(process.cwd(), "../supabase/migrations");
const domainMigration = readFileSync(
  resolve(migrationsDirectory, "20260715230000_create_mvp_domain_tables.sql"),
  "utf8",
).toLowerCase();
const storageMigration = readFileSync(
  resolve(
    migrationsDirectory,
    "20260715231000_create_private_resume_storage.sql",
  ),
  "utf8",
).toLowerCase();
const resumeAccessMigration = readFileSync(
  resolve(
    migrationsDirectory,
    "20260715235250_enable_resume_metadata_access.sql",
  ),
  "utf8",
).toLowerCase();
const milestoneTwoMigration = readFileSync(
  resolve(
    migrationsDirectory,
    "20260716191511_complete_milestone_2_context_analysis.sql",
  ),
  "utf8",
).toLowerCase();
const milestoneThreeMigration = readFileSync(
  resolve(
    migrationsDirectory,
    "20260723090000_enable_interview_core_access.sql",
  ),
  "utf8",
).toLowerCase();
const emptyInterviewCleanupMigration = readFileSync(
  resolve(
    migrationsDirectory,
    "20260723113000_reclassify_empty_completed_interviews.sql",
  ),
  "utf8",
).toLowerCase();
const milestoneFourMigration = readFileSync(
  resolve(
    migrationsDirectory,
    "20260723220000_enable_milestone_4_roadmaps.sql",
  ),
  "utf8",
).toLowerCase();

const ownedTables = [
  "resumes",
  "resume_analysis",
  "job_descriptions",
  "jd_analysis",
  "interviews",
  "questions",
  "answers",
  "evaluations",
  "roadmaps",
] as const;

describe("Milestone 1 migrations", () => {
  it("creates every approved owned table without premature Data API grants", () => {
    for (const table of ownedTables) {
      expect(domainMigration).toContain(`create table public.${table}`);
      expect(domainMigration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(domainMigration).toContain(
        `revoke all on table public.${table} from public, anon, authenticated`,
      );
      expect(domainMigration).not.toContain(
        `grant select, insert, update, delete on table public.${table}`,
      );
    }
  });

  it("encodes ownership checks and cross-owner parent references", () => {
    expect(domainMigration.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(
      ownedTables.length * 2,
    );
    expect(domainMigration).toContain("with check ((select auth.uid()) = user_id)");
    expect(domainMigration).toContain("foreign key (resume_id, user_id)");
    expect(domainMigration).toContain(
      "foreign key (job_description_id, user_id)",
    );
    expect(domainMigration).toContain("foreign key (interview_id, user_id)");
    expect(domainMigration).toContain(
      "foreign key (question_id, interview_id, user_id)",
    );
    expect(domainMigration).toContain(
      "foreign key (answer_id, question_id, interview_id, user_id)",
    );
  });

  it("keeps the locked interview and resume constraints", () => {
    expect(domainMigration).toContain("question_limit in (5, 10)");
    expect(domainMigration).toContain(
      "adaptive_engine_version = 'adaptive-v1'",
    );
    expect(domainMigration).toContain("mime_type = 'application/pdf'");
    expect(domainMigration).toContain("file_size <= 5242880");
    expect(domainMigration).not.toContain("source_type");
  });

  it("creates a private PDF-only bucket with per-user path policies", () => {
    expect(storageMigration).toContain("'resumes'");
    expect(storageMigration).toContain("false");
    expect(storageMigration).toContain("5242880");
    expect(storageMigration).toContain("array['application/pdf']::text[]");
    expect(storageMigration.match(/on storage\.objects/g)).toHaveLength(4);
    expect(storageMigration.match(/to authenticated/g)).toHaveLength(4);
    expect(storageMigration).toContain(
      "(storage.foldername(name))[1] = (select auth.uid()::text)",
    );
    expect(storageMigration).toContain(
      "lower(storage.extension(name)) = 'pdf'",
    );
    expect(storageMigration).not.toContain("service_role");
    expect(storageMigration).not.toContain("security definer");
  });

  it("grants only the table operations required by the resume upload slice", () => {
    expect(resumeAccessMigration).toContain("grant select, insert, delete");
    expect(resumeAccessMigration).toContain("on table public.resumes");
    expect(resumeAccessMigration).toContain("to authenticated");
    expect(resumeAccessMigration).not.toContain("update");
    expect(resumeAccessMigration).not.toContain("anon");
    expect(resumeAccessMigration).not.toContain("service_role");
  });
});

describe("Milestone 2 migration", () => {
  it("grants only the operations required by context analysis", () => {
    expect(milestoneTwoMigration).toContain(
      "grant update\non table public.resumes\nto authenticated",
    );
    expect(milestoneTwoMigration).toContain(
      "grant select, insert, update\non table public.resume_analysis\nto authenticated",
    );
    expect(milestoneTwoMigration).toContain(
      "grant select, insert, update, delete\non table public.job_descriptions\nto authenticated",
    );
    expect(milestoneTwoMigration).toContain(
      "grant select, insert, update\non table public.jd_analysis\nto authenticated",
    );
    expect(milestoneTwoMigration).not.toContain("to anon");
    expect(milestoneTwoMigration).not.toContain("service_role");
    expect(milestoneTwoMigration).not.toContain("security definer");
  });

  it("publishes only the two processing status tables to Realtime", () => {
    expect(milestoneTwoMigration).toContain(
      "alter publication supabase_realtime add table public.resumes",
    );
    expect(milestoneTwoMigration).toContain(
      "alter publication supabase_realtime add table public.job_descriptions",
    );
    expect(
      milestoneTwoMigration.match(
        /alter publication supabase_realtime add table/g,
      ),
    ).toHaveLength(2);
  });
});

describe("Milestone 3 migration", () => {
  it("grants only the operations required by the interview core", () => {
    expect(milestoneThreeMigration).toContain(
      "grant select, insert, update, delete\non table public.interviews\nto authenticated",
    );
    expect(milestoneThreeMigration).toContain(
      "grant select, insert\non table public.questions\nto authenticated",
    );
    expect(milestoneThreeMigration).toContain(
      "grant select, insert, update\non table public.answers\nto authenticated",
    );
    expect(milestoneThreeMigration).toContain(
      "grant select, insert, update\non table public.evaluations\nto authenticated",
    );
    expect(milestoneThreeMigration).not.toContain("to anon");
    expect(milestoneThreeMigration).not.toContain("service_role");
    expect(milestoneThreeMigration).not.toContain("security definer");
  });

  it("reclassifies only completed interviews without answers", () => {
    expect(emptyInterviewCleanupMigration).toContain(
      "set\n  status = 'abandoned'",
    );
    expect(emptyInterviewCleanupMigration).toContain(
      "where interview.status = 'completed'",
    );
    expect(emptyInterviewCleanupMigration).toContain(
      "where answer.interview_id = interview.id",
    );
    expect(emptyInterviewCleanupMigration).not.toContain("delete");
  });
});

describe("Milestone 4 migration", () => {
  it("exposes only owned roadmap operations through the existing RLS policy", () => {
    expect(milestoneFourMigration).toContain(
      "grant select, insert, update, delete\non table public.roadmaps\nto authenticated",
    );
    expect(milestoneFourMigration).not.toContain("to anon");
    expect(milestoneFourMigration).not.toContain("service_role");
    expect(milestoneFourMigration).not.toContain("security definer");
  });
});
