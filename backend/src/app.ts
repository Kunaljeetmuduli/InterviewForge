import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("interviewforge-api"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export function buildApp(options: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    requestIdHeader: "x-request-id",
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

  return app;
}
