import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type {
  AuthVerifier,
  Profile,
  ProfileInput,
  ProfileRepository,
} from "../src/modules/profile/profile.types.js";

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

function createProfileRepository(): ProfileRepository {
  const profiles = new Map<string, Profile>();

  return {
    findByUserId: (userId) => Promise.resolve(profiles.get(userId) ?? null),
    upsertForUser: (userId, _accessToken, input: ProfileInput) => {
      const existing = profiles.get(userId);
      const timestamp = new Date().toISOString();
      const profile: Profile = {
        id: userId,
        ...input,
        created_at: existing?.created_at ?? timestamp,
        updated_at: timestamp,
      };
      profiles.set(userId, profile);
      return Promise.resolve(profile);
    },
  };
}

function createApp() {
  const app = buildApp({
    authVerifier,
    profileRepository: createProfileRepository(),
  });
  applications.add(app);
  return app;
}

afterEach(async () => {
  await Promise.all([...applications].map(async (app) => app.close()));
  applications.clear();
});

describe("profile API authorization", () => {
  it("allows profile PUT requests from the configured frontend origin", async () => {
    const app = buildApp({
      corsOrigins: ["http://localhost:3000"],
    });
    applications.add(app);

    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/profile",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "authorization,content-type",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(response.headers["access-control-allow-methods"]).toContain("PUT");
  });

  it("rejects requests without a bearer token", async () => {
    const response = await createApp().inject({
      method: "GET",
      url: "/api/v1/profile",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "A valid access token is required.",
      },
    });
  });

  it("rejects an invalid bearer token", async () => {
    const response = await createApp().inject({
      method: "GET",
      url: "/api/v1/profile",
      headers: { authorization: "Bearer invalid-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects identity fields supplied by the client", async () => {
    const response = await createApp().inject({
      method: "PUT",
      url: "/api/v1/profile",
      headers: { authorization: "Bearer first-user-token" },
      payload: {
        id: secondUserId,
        full_name: "First User",
        target_role: "Frontend Developer",
        experience_level: "Entry level",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("keeps each authenticated user's profile isolated", async () => {
    const app = createApp();
    const input = {
      full_name: "First User",
      target_role: "Frontend Developer",
      experience_level: "Entry level",
    };

    const updateResponse = await app.inject({
      method: "PUT",
      url: "/api/v1/profile",
      headers: { authorization: "Bearer first-user-token" },
      payload: input,
    });
    const firstUserResponse = await app.inject({
      method: "GET",
      url: "/api/v1/profile",
      headers: { authorization: "Bearer first-user-token" },
    });
    const secondUserResponse = await app.inject({
      method: "GET",
      url: "/api/v1/profile",
      headers: { authorization: "Bearer second-user-token" },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(firstUserResponse.json()).toMatchObject({
      data: { profile: { id: firstUserId, ...input } },
    });
    expect(secondUserResponse.json()).toMatchObject({
      data: { profile: null },
    });
  });
});
