import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import type { AIClient } from "../../infrastructure/ai/ai.types.js";
import type { ResumeRepository } from "../resume/resume.types.js";
import {
  JobDescriptionNotFoundError,
  JobDescriptionProcessingError,
  JobDescriptionService,
  JobDescriptionStateError,
} from "./job-description.service.js";
import {
  jobDescriptionCreateInputSchema,
  jobDescriptionParamsSchema,
  jobDescriptionRetryInputSchema,
  type JobDescriptionRepository,
} from "./job-description.types.js";

interface Dependencies {
  authenticate: preHandlerAsyncHookHandler;
  repository: JobDescriptionRepository;
  resumeRepository: ResumeRepository;
  aiClient: AIClient;
}

function errorBody(code: string, message: string, requestId: string) {
  return { error: { code, message, requestId } };
}

export function registerJobDescriptionRoutes(
  app: FastifyInstance,
  dependencies: Dependencies,
): void {
  const service = new JobDescriptionService(dependencies);

  function mapError(error: unknown, requestId: string) {
    if (error instanceof JobDescriptionNotFoundError) {
      return {
        statusCode: 404,
        body: errorBody("JOB_DESCRIPTION_NOT_FOUND", error.message, requestId),
      };
    }
    if (error instanceof JobDescriptionStateError) {
      return {
        statusCode: 409,
        body: errorBody("JOB_DESCRIPTION_STATE_CONFLICT", error.message, requestId),
      };
    }
    if (error instanceof JobDescriptionProcessingError) {
      return {
        statusCode: error.statusCode,
        body: errorBody(error.code, error.message, requestId),
      };
    }
    throw error;
  }

  app.post(
    "/api/v1/job-descriptions",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = jobDescriptionCreateInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(
          errorBody(
            "VALIDATION_ERROR",
            "Job-description input is invalid. Paste text and select a completed resume.",
            request.id,
          ),
        );
      }

      try {
        const result = await service.createAndAnalyze(
          request.authContext!,
          parsed.data,
        );
        return reply.status(201).send({
          data: result,
          meta: { requestId: request.id },
        });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.get(
    "/api/v1/job-descriptions",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const jobDescriptions = await service.list(request.authContext!);
      return reply.send({
        data: { job_descriptions: jobDescriptions },
        meta: { requestId: request.id },
      });
    },
  );

  app.get(
    "/api/v1/job-descriptions/:jobDescriptionId",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = jobDescriptionParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorBody("VALIDATION_ERROR", "The job-description ID is invalid.", request.id));
      }

      try {
        const result = await service.get(
          request.authContext!,
          parsed.data.jobDescriptionId,
        );
        return reply.send({ data: result, meta: { requestId: request.id } });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.post(
    "/api/v1/job-descriptions/:jobDescriptionId/retry",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const params = jobDescriptionParamsSchema.safeParse(request.params);
      const body = jobDescriptionRetryInputSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply
          .status(400)
          .send(errorBody("VALIDATION_ERROR", "Retry input is invalid.", request.id));
      }

      try {
        const result = await service.retry(
          request.authContext!,
          params.data.jobDescriptionId,
          body.data.resume_id,
        );
        return reply.send({ data: result, meta: { requestId: request.id } });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.delete(
    "/api/v1/job-descriptions/:jobDescriptionId",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = jobDescriptionParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorBody("VALIDATION_ERROR", "The job-description ID is invalid.", request.id));
      }

      try {
        await service.delete(
          request.authContext!,
          parsed.data.jobDescriptionId,
        );
        return reply.status(204).send();
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );
}
