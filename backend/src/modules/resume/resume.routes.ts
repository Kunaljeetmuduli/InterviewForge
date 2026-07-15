import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import {
  ResumeNotFoundError,
  ResumeService,
} from "./resume.service.js";
import {
  resumeCreateInputSchema,
  resumeParamsSchema,
  type ResumeRepository,
} from "./resume.types.js";

interface ResumeRouteDependencies {
  authenticate: preHandlerAsyncHookHandler;
  resumeRepository: ResumeRepository;
}

function notFoundResponse() {
  return {
    error: {
      code: "RESUME_NOT_FOUND",
      message: "The requested resume was not found.",
    },
  };
}

function validationResponse(message: string, details: unknown) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
      details,
    },
  };
}

export function registerResumeRoutes(
  app: FastifyInstance,
  dependencies: ResumeRouteDependencies,
): void {
  const service = new ResumeService(dependencies.resumeRepository);

  app.post(
    "/api/v1/resumes",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const result = resumeCreateInputSchema.safeParse(request.body);

      if (!result.success) {
        return reply.status(400).send(
          validationResponse(
            "Resume metadata is invalid.",
            result.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          ),
        );
      }

      const resume = await service.createResume(
        request.authContext!,
        result.data,
      );

      return reply.status(201).send({
        data: { resume },
        meta: { requestId: request.id },
      });
    },
  );

  app.get(
    "/api/v1/resumes",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const resumes = await service.listResumes(request.authContext!);

      return reply.send({
        data: { resumes },
        meta: { requestId: request.id },
      });
    },
  );

  app.get(
    "/api/v1/resumes/:resumeId",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const result = resumeParamsSchema.safeParse(request.params);

      if (!result.success) {
        return reply
          .status(400)
          .send(validationResponse("The resume ID is invalid.", null));
      }

      try {
        const resume = await service.getResume(
          request.authContext!,
          result.data.resumeId,
        );

        return reply.send({
          data: { resume },
          meta: { requestId: request.id },
        });
      } catch (error) {
        if (error instanceof ResumeNotFoundError) {
          return reply.status(404).send(notFoundResponse());
        }

        throw error;
      }
    },
  );

  app.delete(
    "/api/v1/resumes/:resumeId",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const result = resumeParamsSchema.safeParse(request.params);

      if (!result.success) {
        return reply
          .status(400)
          .send(validationResponse("The resume ID is invalid.", null));
      }

      try {
        await service.deleteResume(
          request.authContext!,
          result.data.resumeId,
        );
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof ResumeNotFoundError) {
          return reply.status(404).send(notFoundResponse());
        }

        throw error;
      }
    },
  );
}
