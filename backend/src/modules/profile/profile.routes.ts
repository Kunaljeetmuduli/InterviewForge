import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import { ProfileService } from "./profile.service.js";
import {
  profileInputSchema,
  type ProfileRepository,
} from "./profile.types.js";

interface ProfileRouteDependencies {
  authenticate: preHandlerAsyncHookHandler;
  profileRepository: ProfileRepository;
}

export function registerProfileRoutes(
  app: FastifyInstance,
  dependencies: ProfileRouteDependencies,
): void {
  const service = new ProfileService(dependencies.profileRepository);

  app.get(
    "/api/v1/profile",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const profile = await service.getProfile(request.authContext!);

      return reply.send({
        data: { profile },
        meta: { requestId: request.id },
      });
    },
  );

  app.put(
    "/api/v1/profile",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const result = profileInputSchema.safeParse(request.body);

      if (!result.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Profile data is invalid.",
            details: result.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
        });
      }

      const profile = await service.updateProfile(
        request.authContext!,
        result.data,
      );

      return reply.send({
        data: { profile },
        meta: { requestId: request.id },
      });
    },
  );
}
