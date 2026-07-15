import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { ProfileService } from "./profile.service.js";
import {
  profileInputSchema,
  type AuthContext,
  type AuthVerifier,
  type ProfileRepository,
} from "./profile.types.js";

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthContext | null;
  }
}

interface ProfileRouteDependencies {
  authVerifier: AuthVerifier;
  profileRepository: ProfileRepository;
}

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({
    error: {
      code: "UNAUTHORIZED",
      message: "A valid access token is required.",
    },
  });
}

export function registerProfileRoutes(
  app: FastifyInstance,
  dependencies: ProfileRouteDependencies,
): void {
  const service = new ProfileService(dependencies.profileRepository);

  app.decorateRequest("authContext", null);

  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization;
    const [scheme, accessToken] = authorization?.split(" ") ?? [];

    if (scheme?.toLowerCase() !== "bearer" || !accessToken) {
      return unauthorized(reply);
    }

    const user = await dependencies.authVerifier.verify(accessToken);

    if (!user) {
      return unauthorized(reply);
    }

    request.authContext = { accessToken, user };
  };

  app.get(
    "/api/v1/profile",
    { preHandler: authenticate },
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
    { preHandler: authenticate },
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
