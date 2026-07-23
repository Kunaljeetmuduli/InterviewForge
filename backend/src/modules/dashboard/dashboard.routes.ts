import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import type { InterviewRepository } from "../interview/interview.types.js";
import { DashboardService } from "./dashboard.service.js";

export function registerDashboardRoutes(
  app: FastifyInstance,
  dependencies: {
    authenticate: preHandlerAsyncHookHandler;
    repository: InterviewRepository;
  },
) {
  const service = new DashboardService(dependencies.repository);
  app.get("/api/v1/dashboard/summary", { preHandler: dependencies.authenticate }, async (request) => {
    const result = await service.all(request.authContext!);
    return { data: { summary: result.summary }, meta: { requestId: request.id } };
  });
  app.get("/api/v1/dashboard/topic-mastery", { preHandler: dependencies.authenticate }, async (request) => {
    const result = await service.all(request.authContext!);
    return {
      data: { topics: result.mastery, algorithmVersion: result.algorithmVersion },
      meta: { requestId: request.id },
    };
  });
  app.get("/api/v1/dashboard/progress", { preHandler: dependencies.authenticate }, async (request) => {
    const result = await service.all(request.authContext!);
    return { data: { points: result.progress }, meta: { requestId: request.id } };
  });
}
