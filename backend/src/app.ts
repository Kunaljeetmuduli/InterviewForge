import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";

import { registerProfileRoutes } from "./modules/profile/profile.routes.js";
import type {
  AuthVerifier,
  ProfileRepository,
} from "./modules/profile/profile.types.js";

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

interface BuildAppOptions {
  logger?: boolean;
  corsOrigins?: string[];
  authVerifier?: AuthVerifier;
  profileRepository?: ProfileRepository;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    requestIdHeader: "x-request-id",
  });

  if (options.corsOrigins) {
    void app.register(cors, {
      origin: options.corsOrigins,
      methods: ["GET", "HEAD", "POST", "PUT"],
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

  registerProfileRoutes(app, {
    authVerifier: options.authVerifier ?? rejectingAuthVerifier,
    profileRepository:
      options.profileRepository ?? unavailableProfileRepository,
  });

  return app;
}
