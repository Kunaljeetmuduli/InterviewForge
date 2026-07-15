import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

const applications = new Set<ReturnType<typeof buildApp>>();

afterEach(async () => {
  await Promise.all([...applications].map(async (app) => app.close()));
  applications.clear();
});

describe("GET /health", () => {
  it("returns the stable unversioned health contract", async () => {
    const app = buildApp();
    applications.add(app);

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toEqual({
      status: "ok",
      service: "interviewforge-api",
      version: "0.1.0",
    });
  });

  it("does not expose a versioned health alias", async () => {
    const app = buildApp();
    applications.add(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(404);
  });
});
