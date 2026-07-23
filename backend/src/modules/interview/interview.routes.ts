import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import type { AIClient } from "../../infrastructure/ai/ai.types.js";
import type { JobDescriptionRepository } from "../job-description/job-description.types.js";
import type { ResumeRepository } from "../resume/resume.types.js";
import {
  InterviewNotFoundError,
  InterviewProcessingError,
  InterviewService,
  InterviewStateError,
} from "./interview.service.js";
import {
  answerInputSchema,
  answerParamsSchema,
  interviewCreateInputSchema,
  interviewParamsSchema,
  type InterviewRepository,
} from "./interview.types.js";

interface Dependencies {
  authenticate: preHandlerAsyncHookHandler;
  repository: InterviewRepository;
  resumeRepository: ResumeRepository;
  jobDescriptionRepository: JobDescriptionRepository;
  aiClient: AIClient;
}

function errorBody(code: string, message: string, requestId: string) {
  return { error: { code, message, requestId } };
}

export function registerInterviewRoutes(
  app: FastifyInstance,
  dependencies: Dependencies,
): void {
  const service = new InterviewService(dependencies);

  function mapError(error: unknown, requestId: string) {
    if (error instanceof InterviewNotFoundError) {
      return {
        statusCode: 404,
        body: errorBody("INTERVIEW_NOT_FOUND", error.message, requestId),
      };
    }
    if (error instanceof InterviewStateError) {
      return {
        statusCode: 409,
        body: errorBody("INTERVIEW_STATE_CONFLICT", error.message, requestId),
      };
    }
    if (error instanceof InterviewProcessingError) {
      return {
        statusCode: error.statusCode,
        body: errorBody(error.code, error.message, requestId),
      };
    }
    throw error;
  }

  app.post(
    "/api/v1/interviews",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = interviewCreateInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(
          errorBody(
            "VALIDATION_ERROR",
            "Choose an interview type and either 5 or 10 questions.",
            request.id,
          ),
        );
      }
      try {
        const interview = await service.create(
          request.authContext!,
          parsed.data,
        );
        return reply
          .status(201)
          .send({ data: { interview }, meta: { requestId: request.id } });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.get(
    "/api/v1/interviews",
    { preHandler: dependencies.authenticate },
    async (request) => ({
      data: { interviews: await service.list(request.authContext!) },
      meta: { requestId: request.id },
    }),
  );

  app.get(
    "/api/v1/interviews/:interviewId",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = interviewParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(
            errorBody(
              "VALIDATION_ERROR",
              "The interview ID is invalid.",
              request.id,
            ),
          );
      }
      try {
        const result = await service.get(
          request.authContext!,
          parsed.data.interviewId,
        );
        return reply.send({ data: result, meta: { requestId: request.id } });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.post(
    "/api/v1/interviews/:interviewId/start",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = interviewParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorBody("VALIDATION_ERROR", "Invalid interview ID.", request.id));
      }
      try {
        const result = await service.start(
          request.authContext!,
          parsed.data.interviewId,
        );
        return reply.send({ data: result, meta: { requestId: request.id } });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.post(
    "/api/v1/interviews/:interviewId/answers",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const params = interviewParamsSchema.safeParse(request.params);
      const body = answerInputSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.status(400).send(
          errorBody(
            "VALIDATION_ERROR",
            "The text answer or request identifier is invalid.",
            request.id,
          ),
        );
      }
      try {
        const result = await service.submitAnswer(
          request.authContext!,
          params.data.interviewId,
          body.data,
        );
        return reply.send({ data: result, meta: { requestId: request.id } });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.post(
    "/api/v1/interviews/:interviewId/answers/:answerId/retry-evaluation",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = answerParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send(
          errorBody("VALIDATION_ERROR", "Invalid answer identifier.", request.id),
        );
      }
      try {
        const result = await service.retryEvaluation(
          request.authContext!,
          parsed.data.interviewId,
          parsed.data.answerId,
        );
        return reply.send({ data: result, meta: { requestId: request.id } });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  for (const [action, method] of [
    ["complete", service.complete.bind(service)],
    ["abandon", service.abandon.bind(service)],
  ] as const) {
    app.post(
      `/api/v1/interviews/:interviewId/${action}`,
      { preHandler: dependencies.authenticate },
      async (request, reply) => {
        const parsed = interviewParamsSchema.safeParse(request.params);
        if (!parsed.success) {
          return reply
            .status(400)
            .send(errorBody("VALIDATION_ERROR", "Invalid interview ID.", request.id));
        }
        try {
          const interview = await method(
            request.authContext!,
            parsed.data.interviewId,
          );
          return reply.send({
            data: { interview },
            meta: { requestId: request.id },
          });
        } catch (error) {
          const mapped = mapError(error, request.id);
          return reply.status(mapped.statusCode).send(mapped.body);
        }
      },
    );
  }

  app.get(
    "/api/v1/interviews/:interviewId/report",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = interviewParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorBody("VALIDATION_ERROR", "Invalid interview ID.", request.id));
      }
      try {
        const report = await service.report(
          request.authContext!,
          parsed.data.interviewId,
        );
        return reply.send({
          data: { report },
          meta: { requestId: request.id },
        });
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.delete(
    "/api/v1/interviews/:interviewId",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const parsed = interviewParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorBody("VALIDATION_ERROR", "Invalid interview ID.", request.id));
      }
      try {
        await service.delete(request.authContext!, parsed.data.interviewId);
        return reply.status(204).send();
      } catch (error) {
        const mapped = mapError(error, request.id);
        return reply.status(mapped.statusCode).send(mapped.body);
      }
    },
  );
}
