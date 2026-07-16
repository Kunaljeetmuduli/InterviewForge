import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import {
  ResumeNotFoundError,
  ResumeProcessingError,
  ResumeService,
  ResumeStateError,
} from "./resume.service.js";
import type { AIClient } from "../../infrastructure/ai/ai.types.js";
import type { PdfExtractor } from "./pdf-extractor.js";
import {
  resumeCreateInputSchema,
  resumeParamsSchema,
  type ResumeRepository,
} from "./resume.types.js";

interface ResumeRouteDependencies {
  authenticate: preHandlerAsyncHookHandler;
  resumeRepository: ResumeRepository;
  pdfExtractor: PdfExtractor;
  aiClient: AIClient;
  maxPdfSizeBytes: number;
  pdfTimeoutMs: number;
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
  const service = new ResumeService({
    repository: dependencies.resumeRepository,
    pdfExtractor: dependencies.pdfExtractor,
    aiClient: dependencies.aiClient,
    maxPdfSizeBytes: dependencies.maxPdfSizeBytes,
    pdfTimeoutMs: dependencies.pdfTimeoutMs,
  });

  function processError(error: unknown, requestId: string) {
    if (error instanceof ResumeNotFoundError) {
      return { statusCode: 404, body: notFoundResponse() };
    }

    if (error instanceof ResumeStateError) {
      return {
        statusCode: 409,
        body: {
          error: {
            code: "RESUME_STATE_CONFLICT",
            message: error.message,
            requestId,
          },
        },
      };
    }

    if (error instanceof ResumeProcessingError) {
      return {
        statusCode: error.statusCode,
        body: {
          error: {
            code: error.code,
            message: error.message,
            requestId,
          },
        },
      };
    }

    throw error;
  }

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

        const analysis = await service.findAnalysis(
          request.authContext!,
          result.data.resumeId,
        );

        return reply.send({
          data: { resume, analysis },
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

  for (const operation of ["process", "retry"] as const) {
    app.post(
      `/api/v1/resumes/:resumeId/${operation}`,
      { preHandler: dependencies.authenticate },
      async (request, reply) => {
        const result = resumeParamsSchema.safeParse(request.params);

        if (!result.success) {
          return reply
            .status(400)
            .send(validationResponse("The resume ID is invalid.", null));
        }

        try {
          const processed = await service.processResume(
            request.authContext!,
            result.data.resumeId,
            operation,
          );
          return reply.send({
            data: processed,
            meta: { requestId: request.id },
          });
        } catch (error) {
          const mapped = processError(error, request.id);
          return reply.status(mapped.statusCode).send(mapped.body);
        }
      },
    );
  }

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
