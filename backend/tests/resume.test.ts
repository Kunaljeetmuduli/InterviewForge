import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AuthVerifier } from "../src/modules/auth/auth.types.js";
import type {
  NewResumeRecord,
  Resume,
  ResumeRepository,
} from "../src/modules/resume/resume.types.js";

const firstUserId = "11111111-1111-4111-8111-111111111111";
const secondUserId = "22222222-2222-4222-8222-222222222222";
const applications = new Set<ReturnType<typeof buildApp>>();

const authVerifier: AuthVerifier = {
  verify: (accessToken) => {
    if (accessToken === "first-user-token") {
      return Promise.resolve({ id: firstUserId });
    }

    if (accessToken === "second-user-token") {
      return Promise.resolve({ id: secondUserId });
    }

    return Promise.resolve(null);
  },
};

function createResumeRepository() {
  const resumes = new Map<string, Resume>();
  const removedStoragePaths: string[] = [];

  const repository: ResumeRepository = {
    hasPrimaryForUser: (userId) =>
      Promise.resolve(
        [...resumes.values()].some(
          (resume) => resume.user_id === userId && resume.is_primary,
        ),
      ),
    createForUser: (
      userId,
      _accessToken,
      record: NewResumeRecord,
    ) => {
      const timestamp = new Date().toISOString();
      const resume: Resume = {
        ...record,
        user_id: userId,
        created_at: timestamp,
        updated_at: timestamp,
      };
      resumes.set(resume.id, resume);
      return Promise.resolve(resume);
    },
    listForUser: (userId) =>
      Promise.resolve(
        [...resumes.values()].filter((resume) => resume.user_id === userId),
      ),
    findByIdForUser: (userId, _accessToken, resumeId) =>
      Promise.resolve(
        resumes.get(resumeId)?.user_id === userId
          ? (resumes.get(resumeId) ?? null)
          : null,
      ),
    removeStorageObject: (_accessToken, storagePath) => {
      removedStoragePaths.push(storagePath);
      return Promise.resolve();
    },
    deleteForUser: (userId, _accessToken, resumeId) => {
      if (resumes.get(resumeId)?.user_id === userId) {
        resumes.delete(resumeId);
      }
      return Promise.resolve();
    },
  };

  return { repository, removedStoragePaths };
}

function createApp(resumeRepository: ResumeRepository) {
  const app = buildApp({ authVerifier, resumeRepository });
  applications.add(app);
  return app;
}

function validResumePayload(fileName = "resume.pdf") {
  return {
    file_name: fileName,
    mime_type: "application/pdf",
    file_size: 256_000,
  };
}

interface ResumeResponseBody {
  data: { resume: Resume };
}

interface ResumeListResponseBody {
  data: { resumes: Resume[] };
}

afterEach(async () => {
  await Promise.all([...applications].map(async (app) => app.close()));
  applications.clear();
});

describe("resume metadata API", () => {
  it("rejects anonymous resume requests", async () => {
    const { repository } = createResumeRepository();
    const response = await createApp(repository).inject({
      method: "GET",
      url: "/api/v1/resumes",
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid files and client-supplied ownership fields", async () => {
    const { repository } = createResumeRepository();
    const app = createApp(repository);

    const wrongTypeResponse = await app.inject({
      method: "POST",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer first-user-token" },
      payload: {
        file_name: "resume.txt",
        mime_type: "text/plain",
        file_size: 100,
      },
    });
    const identityResponse = await app.inject({
      method: "POST",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer first-user-token" },
      payload: {
        ...validResumePayload(),
        user_id: secondUserId,
        storage_path: `${secondUserId}/resume.pdf`,
      },
    });

    expect(wrongTypeResponse.statusCode).toBe(400);
    expect(identityResponse.statusCode).toBe(400);
  });

  it("creates server-owned paths and marks only the first resume primary", async () => {
    const { repository } = createResumeRepository();
    const app = createApp(repository);

    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer first-user-token" },
      payload: validResumePayload("first.pdf"),
    });
    const secondResponse = await app.inject({
      method: "POST",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer first-user-token" },
      payload: validResumePayload("second.pdf"),
    });

    expect(firstResponse.statusCode).toBe(201);
    expect(firstResponse.json()).toMatchObject({
      data: {
        resume: {
          user_id: firstUserId,
          file_name: "first.pdf",
          status: "pending",
          is_primary: true,
        },
      },
    });
    expect(firstResponse.json<ResumeResponseBody>().data.resume.storage_path).toMatch(
      new RegExp(`^${firstUserId}/[0-9a-f-]+\\.pdf$`),
    );
    expect(
      secondResponse.json<ResumeResponseBody>().data.resume.is_primary,
    ).toBe(false);
  });

  it("keeps resume reads isolated by authenticated owner", async () => {
    const { repository } = createResumeRepository();
    const app = createApp(repository);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer first-user-token" },
      payload: validResumePayload(),
    });
    const resumeId = createResponse.json<ResumeResponseBody>().data.resume.id;
    const firstUserList = await app.inject({
      method: "GET",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer first-user-token" },
    });
    const secondUserList = await app.inject({
      method: "GET",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer second-user-token" },
    });
    const crossUserRead = await app.inject({
      method: "GET",
      url: `/api/v1/resumes/${resumeId}`,
      headers: { authorization: "Bearer second-user-token" },
    });

    expect(
      firstUserList.json<ResumeListResponseBody>().data.resumes,
    ).toHaveLength(1);
    expect(
      secondUserList.json<ResumeListResponseBody>().data.resumes,
    ).toHaveLength(0);
    expect(crossUserRead.statusCode).toBe(404);
  });

  it("removes the private object before deleting owned metadata", async () => {
    const { repository, removedStoragePaths } = createResumeRepository();
    const app = createApp(repository);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer first-user-token" },
      payload: validResumePayload(),
    });
    const resume = createResponse.json<ResumeResponseBody>().data.resume;
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/resumes/${resume.id}`,
      headers: { authorization: "Bearer first-user-token" },
    });
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/resumes",
      headers: { authorization: "Bearer first-user-token" },
    });

    expect(deleteResponse.statusCode).toBe(204);
    expect(removedStoragePaths).toEqual([resume.storage_path]);
    expect(
      listResponse.json<ResumeListResponseBody>().data.resumes,
    ).toHaveLength(0);
  });
});
