import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import {
  AIClientError,
  type AIClient,
} from "../src/infrastructure/ai/ai.types.js";
import type { AuthVerifier } from "../src/modules/auth/auth.types.js";
import type { PdfExtractor } from "../src/modules/resume/pdf-extractor.js";
import type {
  Resume,
  ResumeAnalysis,
  ResumeRepository,
} from "../src/modules/resume/resume.types.js";

const userId = "11111111-1111-4111-8111-111111111111";
const applications = new Set<ReturnType<typeof buildApp>>();

const authVerifier: AuthVerifier = {
  verify: (token) =>
    Promise.resolve(token === "token" ? { id: userId } : null),
};

const analysisOutput = {
  summary: "Backend developer with API experience.",
  skills: ["Node.js", "PostgreSQL"],
  projects: [],
  education: [],
  experience: [],
  certifications: [],
  technologies: ["TypeScript"],
  strengths: ["API design"],
};

function createRepository(file = new TextEncoder().encode("%PDF-1.7")) {
  const resumes = new Map<string, Resume>();
  const analyses = new Map<string, ResumeAnalysis>();
  const statusHistory: string[] = [];

  const repository: ResumeRepository = {
    hasPrimaryForUser: () => Promise.resolve(resumes.size > 0),
    createForUser: (ownerId, _token, record) => {
      const now = new Date().toISOString();
      const resume = { ...record, user_id: ownerId, created_at: now, updated_at: now };
      resumes.set(resume.id, resume);
      return Promise.resolve(resume);
    },
    listForUser: (ownerId) =>
      Promise.resolve([...resumes.values()].filter((item) => item.user_id === ownerId)),
    findByIdForUser: (ownerId, _token, resumeId) =>
      Promise.resolve(resumes.get(resumeId)?.user_id === ownerId ? resumes.get(resumeId)! : null),
    updateForUser: (ownerId, _token, resumeId, changes) => {
      const existing = resumes.get(resumeId);
      if (!existing || existing.user_id !== ownerId) {
        return Promise.reject(new Error("Resume not found."));
      }
      const updated = { ...existing, ...changes, updated_at: new Date().toISOString() };
      resumes.set(resumeId, updated);
      statusHistory.push(`${changes.status}:${changes.processing_stage ?? "none"}`);
      return Promise.resolve(updated);
    },
    transitionForUser: (
      ownerId,
      _token,
      resumeId,
      expectedStatus,
      changes,
    ) => {
      const existing = resumes.get(resumeId);
      if (
        !existing ||
        existing.user_id !== ownerId ||
        existing.status !== expectedStatus
      ) {
        return Promise.resolve(null);
      }
      const updated = { ...existing, ...changes, updated_at: new Date().toISOString() };
      resumes.set(resumeId, updated);
      statusHistory.push(`${changes.status}:${changes.processing_stage ?? "none"}`);
      return Promise.resolve(updated);
    },
    downloadStorageObject: () => Promise.resolve(file),
    findAnalysisForResume: (ownerId, _token, resumeId) =>
      Promise.resolve(analyses.get(resumeId)?.user_id === ownerId ? analyses.get(resumeId)! : null),
    upsertAnalysis: (ownerId, _token, analysis) => {
      const now = new Date().toISOString();
      const saved = {
        ...analysis,
        id: "33333333-3333-4333-8333-333333333333",
        user_id: ownerId,
        created_at: now,
        updated_at: now,
      };
      analyses.set(analysis.resume_id, saved);
      return Promise.resolve(saved);
    },
    removeStorageObject: () => Promise.resolve(),
    deleteForUser: () => Promise.resolve(),
  };

  return { repository, resumes, analyses, statusHistory };
}

function createAI(capturedInputs: string[]): AIClient {
  return {
    generateStructured(request) {
      capturedInputs.push(request.input);
      return Promise.resolve({
        data: request.schema.parse(analysisOutput),
        metadata: {
          provider: "test-provider",
          model: "test-model",
          promptVersion: request.promptVersion,
          schemaVersion: request.schemaVersion,
          latencyMs: 10,
        },
      });
    },
  };
}

function createApp(repository: ResumeRepository, pdfExtractor: PdfExtractor, aiClient: AIClient) {
  const app = buildApp({ authVerifier, resumeRepository: repository, pdfExtractor, aiClient });
  applications.add(app);
  return app;
}

async function createResume(app: ReturnType<typeof buildApp>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/resumes",
    headers: { authorization: "Bearer token" },
    payload: { file_name: "resume.pdf", mime_type: "application/pdf", file_size: 1_024 },
  });
  return response.json<{ data: { resume: Resume } }>().data.resume;
}

afterEach(async () => {
  await Promise.all([...applications].map((app) => app.close()));
  applications.clear();
});

describe("resume processing", () => {
  it("redacts direct identifiers before AI and persists versioned output", async () => {
    const state = createRepository();
    const inputs: string[] = [];
    const extractor: PdfExtractor = {
      extract: () => Promise.resolve({
        pageCount: 1,
        text: `${"Backend engineer building secure APIs. ".repeat(8)} Email me at candidate@example.com or +91 98765 43210.`,
      }),
    };
    const app = createApp(state.repository, extractor, createAI(inputs));
    const resume = await createResume(app);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/resumes/${resume.id}/process`,
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(200);
    expect(inputs[0]).not.toContain("candidate@example.com");
    expect(inputs[0]).not.toContain("98765 43210");
    expect(inputs[0]).toContain("[EMAIL REDACTED]");
    expect(inputs[0]).toContain("[PHONE REDACTED]");
    expect(state.statusHistory).toEqual([
      "processing:parsing",
      "processing:redacting",
      "processing:analyzing",
      "completed:analyzing",
    ]);
    expect([...state.analyses.values()][0]).toMatchObject({
      prompt_version: "resume-analysis-v1",
      schema_version: "resume-analysis-schema-v1",
    });
  });

  it("rejects a fake PDF before extraction or AI and leaves no analysis", async () => {
    const state = createRepository(new TextEncoder().encode("not a pdf"));
    let extracted = false;
    const inputs: string[] = [];
    const app = createApp(
      state.repository,
      { extract: () => { extracted = true; return Promise.resolve({ text: "unused", pageCount: 1 }); } },
      createAI(inputs),
    );
    const resume = await createResume(app);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/resumes/${resume.id}/process`,
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: "RESUME_FILE_INVALID" } });
    expect(extracted).toBe(false);
    expect(inputs).toHaveLength(0);
    expect(state.analyses.size).toBe(0);
    expect(state.resumes.get(resume.id)?.status).toBe("failed");
  });

  it("allows only failed records to retry and increments the attempt", async () => {
    const state = createRepository(new TextEncoder().encode("not a pdf"));
    const app = createApp(
      state.repository,
      { extract: () => Promise.resolve({ text: "valid ".repeat(50), pageCount: 1 }) },
      createAI([]),
    );
    const resume = await createResume(app);
    await app.inject({ method: "POST", url: `/api/v1/resumes/${resume.id}/process`, headers: { authorization: "Bearer token" } });
    const retry = await app.inject({ method: "POST", url: `/api/v1/resumes/${resume.id}/retry`, headers: { authorization: "Bearer token" } });

    expect(retry.statusCode).toBe(422);
    expect(state.resumes.get(resume.id)?.processing_attempt).toBe(2);
  });

  it("allows only one concurrent processing transition", async () => {
    const state = createRepository();
    const inputs: string[] = [];
    let markExtractionStarted!: () => void;
    let releaseExtraction!: () => void;
    const extractionStarted = new Promise<void>((resolve) => {
      markExtractionStarted = resolve;
    });
    const extraction = new Promise<{ text: string; pageCount: number }>(
      (resolve) => {
        releaseExtraction = () =>
          resolve({ text: "Backend engineering experience. ".repeat(12), pageCount: 1 });
      },
    );
    const app = createApp(
      state.repository,
      {
        extract: () => {
          markExtractionStarted();
          return extraction;
        },
      },
      createAI(inputs),
    );
    const resume = await createResume(app);
    const firstRequest = app.inject({
      method: "POST",
      url: `/api/v1/resumes/${resume.id}/process`,
      headers: { authorization: "Bearer token" },
    });
    await extractionStarted;
    const duplicateRequest = await app.inject({
      method: "POST",
      url: `/api/v1/resumes/${resume.id}/process`,
      headers: { authorization: "Bearer token" },
    });
    releaseExtraction();
    const firstResponse = await firstRequest;

    expect(firstResponse.statusCode).toBe(200);
    expect(duplicateRequest.statusCode).toBe(409);
    expect(inputs).toHaveLength(1);
    expect(state.resumes.get(resume.id)?.processing_attempt).toBe(1);
  });

  it("returns a clear gateway error when structured AI output is invalid", async () => {
    const state = createRepository();
    const app = createApp(
      state.repository,
      {
        extract: () =>
          Promise.resolve({
            text: "Backend engineering experience. ".repeat(12),
            pageCount: 1,
          }),
      },
      {
        generateStructured: () =>
          Promise.reject(
            new AIClientError(
              "AI_SCHEMA_INVALID",
              "The provider rejected the schema.",
            ),
          ),
      },
    );
    const resume = await createResume(app);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/resumes/${resume.id}/process`,
      headers: { authorization: "Bearer token" },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: {
        code: "AI_SCHEMA_INVALID",
        message: "Resume analysis returned an invalid response. Try again.",
      },
    });
    expect(state.resumes.get(resume.id)?.status).toBe("failed");
  });
});
