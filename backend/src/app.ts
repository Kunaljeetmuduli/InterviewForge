import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";

import { createAuthenticateHook } from "./modules/auth/auth.hook.js";
import type { AuthVerifier } from "./modules/auth/auth.types.js";
import { registerProfileRoutes } from "./modules/profile/profile.routes.js";
import type { ProfileRepository } from "./modules/profile/profile.types.js";
import { registerResumeRoutes } from "./modules/resume/resume.routes.js";
import type { ResumeRepository } from "./modules/resume/resume.types.js";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("interviewforge-api"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

const rejectingAuthVerifier: AuthVerifier = {
  verify: () => Promise.resolve(null),
};

const unavailableProfileRepository: ProfileRepository = {
  findByUserId: () =>
    Promise.reject(new Error("Profile repository is not configured.")),
  upsertForUser: () =>
    Promise.reject(new Error("Profile repository is not configured.")),
};

const unavailableResumeRepository: ResumeRepository = {
  hasPrimaryForUser: () =>
    Promise.reject(new Error("Resume repository is not configured.")),
  createForUser: () =>
    Promise.reject(new Error("Resume repository is not configured.")),
  listForUser: () =>
    Promise.reject(new Error("Resume repository is not configured.")),
  findByIdForUser: () =>
    Promise.reject(new Error("Resume repository is not configured.")),
  removeStorageObject: () =>
    Promise.reject(new Error("Resume repository is not configured.")),
  deleteForUser: () =>
    Promise.reject(new Error("Resume repository is not configured.")),
};

interface BuildAppOptions {
  logger?: boolean;
  corsOrigins?: string[];
  authVerifier?: AuthVerifier;
  profileRepository?: ProfileRepository;
  resumeRepository?: ResumeRepository;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    requestIdHeader: "x-request-id",
  });

  if (options.corsOrigins) {
    void app.register(cors, {
      origin: options.corsOrigins,
      methods: ["DELETE", "GET", "HEAD", "POST", "PUT"],
    });
  }

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, "Request failed");
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
        requestId: request.id,
      },
    });
  });

  app.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["status", "service", "version"],
            properties: {
              status: { const: "ok" },
              service: { const: "interviewforge-api" },
              version: { type: "string" },
            },
          },
        },
      },
    },
    (): HealthResponse =>
      healthResponseSchema.parse({
        status: "ok",
        service: "interviewforge-api",
        version: "0.1.0",
      }),
  );

  const authenticate = createAuthenticateHook(
    app,
    options.authVerifier ?? rejectingAuthVerifier,
  );

  registerProfileRoutes(app, {
    authenticate,
    profileRepository:
      options.profileRepository ?? unavailableProfileRepository,
  });
  registerResumeRoutes(app, {
    authenticate,
    resumeRepository: options.resumeRepository ?? unavailableResumeRepository,
  });

  return app;
}
