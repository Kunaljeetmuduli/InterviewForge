import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";

import type { AuthContext, AuthVerifier } from "./auth.types.js";

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthContext | null;
  }
}

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({
    error: {
      code: "UNAUTHORIZED",
      message: "A valid access token is required.",
    },
  });
}

export function createAuthenticateHook(
  app: FastifyInstance,
  authVerifier: AuthVerifier,
): preHandlerAsyncHookHandler {
  app.decorateRequest("authContext", null);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization;
    const [scheme, accessToken] = authorization?.split(" ") ?? [];

    if (scheme?.toLowerCase() !== "bearer" || !accessToken) {
      return unauthorized(reply);
    }

    const user = await authVerifier.verify(accessToken);

    if (!user) {
      return unauthorized(reply);
    }

    request.authContext = { accessToken, user };
  };
}
