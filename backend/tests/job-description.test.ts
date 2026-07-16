import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AIClient } from "../src/infrastructure/ai/ai.types.js";
import { AIClientError } from "../src/infrastructure/ai/ai.types.js";
import type { AuthVerifier } from "../src/modules/auth/auth.types.js";
import type {
  JobDescription,
  JobDescriptionAnalysis,
  JobDescriptionRepository,
} from "../src/modules/job-description/job-description.types.js";
import type { Resume, ResumeAnalysis, ResumeRepository } from "../src/modules/resume/resume.types.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const resumeId = "44444444-4444-4444-8444-444444444444";
const applications = new Set<ReturnType<typeof buildApp>>();

const authVerifier: AuthVerifier = {
  verify: (token) => Promise.resolve(
    token === "token" ? { id: userId } : token === "other" ? { id: otherUserId } : null,
  ),
};

function completedResume(): { resume: Resume; analysis: ResumeAnalysis } {
  const now = new Date().toISOString();
  return {
    resume: {
      id: resumeId, user_id: userId, file_name: "resume.pdf", storage_path: `${userId}/${resumeId}.pdf`,
      mime_type: "application/pdf", file_size: 1_000, status: "completed", processing_stage: "analyzing",
      processing_attempt: 1, error_code: null, error_message: null, is_primary: true, created_at: now, updated_at: now,
    },
    analysis: {
      id: "55555555-5555-4555-8555-555555555555", user_id: userId, resume_id: resumeId,
      extracted_text: "TypeScript Node.js PostgreSQL APIs", summary: "Backend engineer", skills: ["TypeScript", "Node.js"],
      projects: [], education: [], experience: [{ role: "Engineer", organization: "Acme", duration: "2 years", duration_years: 2, highlights: ["Built APIs"] }],
      certifications: [], technologies: ["PostgreSQL"], strengths: ["API design"], provider: "test", model: "test",
      prompt_version: "resume-analysis-v1", schema_version: "resume-analysis-schema-v1", created_at: now, updated_at: now,
    },
  };
}

function resumeRepository(includeCompleted = true): ResumeRepository {
  const record = completedResume();
  return {
    hasPrimaryForUser: () => Promise.resolve(includeCompleted), createForUser: () => Promise.reject(new Error("unused")),
    listForUser: () => Promise.resolve(includeCompleted ? [record.resume] : []),
    findByIdForUser: (ownerId, _token, id) => Promise.resolve(includeCompleted && ownerId === userId && id === resumeId ? record.resume : null),
    updateForUser: () => Promise.reject(new Error("unused")), downloadStorageObject: () => Promise.reject(new Error("unused")),
    transitionForUser: () => Promise.reject(new Error("unused")),
    findAnalysisForResume: (ownerId, _token, id) => Promise.resolve(includeCompleted && ownerId === userId && id === resumeId ? record.analysis : null),
    upsertAnalysis: () => Promise.reject(new Error("unused")), removeStorageObject: () => Promise.reject(new Error("unused")),
    deleteForUser: () => Promise.reject(new Error("unused")),
  };
}

function createJobRepository() {
  const jobs = new Map<string, JobDescription>();
  const analyses = new Map<string, JobDescriptionAnalysis>();
  const repository: JobDescriptionRepository = {
    createForUser: (ownerId, _token, record) => {
      const now = new Date().toISOString();
      const saved = { ...record, user_id: ownerId, created_at: now, updated_at: now };
      jobs.set(saved.id, saved); return Promise.resolve(saved);
    },
    listForUser: (ownerId) => Promise.resolve([...jobs.values()].filter((job) => job.user_id === ownerId)),
    findByIdForUser: (ownerId, _token, id) => Promise.resolve(jobs.get(id)?.user_id === ownerId ? jobs.get(id)! : null),
    updateForUser: (ownerId, _token, id, changes) => {
      const existing = jobs.get(id); if (!existing || existing.user_id !== ownerId) return Promise.reject(new Error("not found"));
      const updated = { ...existing, ...changes, updated_at: new Date().toISOString() }; jobs.set(id, updated); return Promise.resolve(updated);
    },
    transitionForUser: (ownerId, _token, id, expectedStatus, changes) => {
      const existing = jobs.get(id);
      if (!existing || existing.user_id !== ownerId || existing.status !== expectedStatus) return Promise.resolve(null);
      const updated = { ...existing, ...changes, updated_at: new Date().toISOString() }; jobs.set(id, updated); return Promise.resolve(updated);
    },
    deleteForUser: (ownerId, _token, id) => { if (jobs.get(id)?.user_id === ownerId) jobs.delete(id); return Promise.resolve(); },
    findAnalysisForJobDescription: (ownerId, _token, id) => Promise.resolve(analyses.get(id)?.user_id === ownerId ? analyses.get(id)! : null),
    upsertAnalysis: (ownerId, _token, input) => {
      const now = new Date().toISOString();
      const saved = { ...input, user_id: ownerId, id: "66666666-6666-4666-8666-666666666666", created_at: now, updated_at: now };
      analyses.set(input.job_description_id, saved); return Promise.resolve(saved);
    },
  };
  return { repository, jobs, analyses };
}

function aiClient(failures = 0): AIClient {
  let attempts = 0;
  return {
    generateStructured(request) {
      attempts += 1;
      if (attempts <= failures) return Promise.reject(new AIClientError("AI_UNAVAILABLE", "temporary"));
      const output = { required_skills: ["TypeScript", "Node.js"], preferred_skills: ["Docker"], minimum_experience: "2 years", minimum_experience_years: 2, responsibilities: ["Build APIs"], keywords: ["PostgreSQL"] };
      return Promise.resolve({ data: request.schema.parse(output), metadata: { provider: "test", model: "test", promptVersion: request.promptVersion, schemaVersion: request.schemaVersion, latencyMs: 5 } });
    },
  };
}

function createApp(jobs: JobDescriptionRepository, resumes: ResumeRepository, ai: AIClient) {
  const app = buildApp({ authVerifier, jobDescriptionRepository: jobs, resumeRepository: resumes, aiClient: ai });
  applications.add(app); return app;
}

const validPayload = { title: "Backend Engineer", company: "Acme", raw_text: "We need a TypeScript and Node.js engineer with 2 years of experience building PostgreSQL APIs. Docker is preferred. ".repeat(3), resume_id: resumeId };

afterEach(async () => { await Promise.all([...applications].map((app) => app.close())); applications.clear(); });

describe("job-description analysis", () => {
  it("accepts paste-only input and stores deterministic alignment guidance", async () => {
    const state = createJobRepository();
    const app = createApp(state.repository, resumeRepository(), aiClient());
    const response = await app.inject({ method: "POST", url: "/api/v1/job-descriptions", headers: { authorization: "Bearer token" }, payload: validPayload });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ data: { jobDescription: { status: "completed" }, analysis: { alignment_score: 85, matching_skills: ["TypeScript", "Node.js"], missing_skills: ["Docker"], alignment_algorithm_version: "jd-alignment-v1" } } });
    expect(state.jobs.size).toBe(1);
    expect(state.analyses.size).toBe(1);
  });

  it("rejects file-shaped fields and does not create before resume validation", async () => {
    const state = createJobRepository();
    const app = createApp(state.repository, resumeRepository(false), aiClient());
    const uploadAttempt = await app.inject({ method: "POST", url: "/api/v1/job-descriptions", headers: { authorization: "Bearer token" }, payload: { ...validPayload, file: "jd.pdf" } });
    const missingResume = await app.inject({ method: "POST", url: "/api/v1/job-descriptions", headers: { authorization: "Bearer token" }, payload: validPayload });

    expect(uploadAttempt.statusCode).toBe(400);
    expect(missingResume.statusCode).toBe(409);
    expect(state.jobs.size).toBe(0);
  });

  it("isolates reads by owner and retries the same failed record", async () => {
    const state = createJobRepository();
    const app = createApp(state.repository, resumeRepository(), aiClient(1));
    const failed = await app.inject({ method: "POST", url: "/api/v1/job-descriptions", headers: { authorization: "Bearer token" }, payload: validPayload });
    const jobId = [...state.jobs.keys()][0]!;
    const crossOwner = await app.inject({ method: "GET", url: `/api/v1/job-descriptions/${jobId}`, headers: { authorization: "Bearer other" } });
    const retried = await app.inject({ method: "POST", url: `/api/v1/job-descriptions/${jobId}/retry`, headers: { authorization: "Bearer token" }, payload: { resume_id: resumeId } });

    expect(failed.statusCode).toBe(503);
    expect(crossOwner.statusCode).toBe(404);
    expect(retried.statusCode).toBe(200);
    expect(state.jobs.size).toBe(1);
    expect(state.analyses.size).toBe(1);
  });

  it("marks a created record failed when its processing transition errors", async () => {
    const state = createJobRepository();
    state.repository.transitionForUser = () =>
      Promise.reject(new Error("temporary database error"));
    const app = createApp(state.repository, resumeRepository(), aiClient());
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/job-descriptions",
      headers: { authorization: "Bearer token" },
      payload: validPayload,
    });

    expect(response.statusCode).toBe(500);
    expect([...state.jobs.values()][0]?.status).toBe("failed");
  });

  it("allows only one concurrent retry transition", async () => {
    const state = createJobRepository();
    let calls = 0;
    let markAnalysisStarted!: () => void;
    let releaseAnalysis!: () => void;
    const analysisStarted = new Promise<void>((resolve) => {
      markAnalysisStarted = resolve;
    });
    const output = {
      required_skills: ["TypeScript"],
      preferred_skills: [],
      minimum_experience: "2 years",
      minimum_experience_years: 2,
      responsibilities: ["Build APIs"],
      keywords: ["PostgreSQL"],
    };
    const ai: AIClient = {
      generateStructured(request) {
        calls += 1;
        if (calls === 1) {
          return Promise.reject(
            new AIClientError("AI_UNAVAILABLE", "temporary"),
          );
        }
        return new Promise((resolve) => {
          markAnalysisStarted();
          releaseAnalysis = () =>
            resolve({
              data: request.schema.parse(output),
              metadata: {
                provider: "test",
                model: "test",
                promptVersion: request.promptVersion,
                schemaVersion: request.schemaVersion,
                latencyMs: 5,
              },
            });
        });
      },
    };
    const app = createApp(state.repository, resumeRepository(), ai);
    await app.inject({
      method: "POST",
      url: "/api/v1/job-descriptions",
      headers: { authorization: "Bearer token" },
      payload: validPayload,
    });
    const jobId = [...state.jobs.keys()][0]!;
    const firstRetry = app.inject({
      method: "POST",
      url: `/api/v1/job-descriptions/${jobId}/retry`,
      headers: { authorization: "Bearer token" },
      payload: { resume_id: resumeId },
    });
    await analysisStarted;
    const duplicateRetry = await app.inject({
      method: "POST",
      url: `/api/v1/job-descriptions/${jobId}/retry`,
      headers: { authorization: "Bearer token" },
      payload: { resume_id: resumeId },
    });
    releaseAnalysis();
    const firstResponse = await firstRetry;

    expect(firstResponse.statusCode).toBe(200);
    expect(duplicateRetry.statusCode).toBe(409);
    expect(calls).toBe(2);
  });
});
