import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import { DashboardService } from "../dashboard/dashboard.service.js";
import type { InterviewRepository } from "../interview/interview.types.js";
import { RoadmapService } from "./roadmap.service.js";
import { roadmapGenerateInputSchema, type RoadmapRepository } from "./roadmap.types.js";

export function registerRoadmapRoutes(
  app: FastifyInstance,
  dependencies: {
    authenticate: preHandlerAsyncHookHandler;
    repository: RoadmapRepository;
    interviewRepository: InterviewRepository;
  },
) {
  const service = new RoadmapService(
    dependencies.repository,
    dependencies.interviewRepository,
    new DashboardService(dependencies.interviewRepository),
  );
  app.get("/api/v1/roadmaps/latest", { preHandler: dependencies.authenticate }, async (request) => ({
    data: { result: await service.latest(request.authContext!) },
    meta: { requestId: request.id },
  }));
  app.post("/api/v1/roadmaps/generate", { preHandler: dependencies.authenticate }, async (request, reply) => {
    const parsed = roadmapGenerateInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Roadmap completion data is invalid.", requestId: request.id },
      });
    }
    return reply.status(201).send({
      data: { result: await service.generate(request.authContext!, parsed.data.completedResourceIds) },
      meta: { requestId: request.id },
    });
  });
}
