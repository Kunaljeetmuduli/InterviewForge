import { randomUUID } from "node:crypto";

import type { DashboardService } from "../dashboard/dashboard.service.js";
import type { InterviewRepository } from "../interview/interview.types.js";
import { buildRoadmap } from "./roadmap-priority.js";
import {
  ROADMAP_ALGORITHM_VERSION,
  type RoadmapAuthContext,
  type RoadmapRepository,
} from "./roadmap.types.js";

export class RoadmapService {
  constructor(
    private readonly repository: RoadmapRepository,
    private readonly interviewRepository: InterviewRepository,
    private readonly dashboardService: DashboardService,
  ) {}

  async latest(context: RoadmapAuthContext) {
    const roadmap = await this.repository.latest(context.user.id, context.accessToken);
    return roadmap ? this.present(roadmap) : null;
  }

  async generate(context: RoadmapAuthContext, completedResourceIds: string[]) {
    const dashboard = await this.dashboardService.all(context);
    const generated = buildRoadmap(dashboard.mastery, completedResourceIds);
    const interviews = await this.interviewRepository.listInterviews(
      context.user.id,
      context.accessToken,
    );
    const source = interviews.find((interview) => interview.status === "completed") ?? null;
    const roadmap = await this.repository.create(context.user.id, context.accessToken, {
      id: randomUUID(),
      user_id: context.user.id,
      source_interview_id: source?.id ?? null,
      focus_topics: generated.focus,
      plan: generated.plan,
      resource_ids: generated.resources.map((resource) => resource.id),
      algorithm_version: ROADMAP_ALGORITHM_VERSION,
      provider: null,
      model: null,
      prompt_version: null,
      schema_version: "roadmap-schema-v1",
    });
    return this.present(roadmap);
  }

  private present(roadmap: Awaited<ReturnType<RoadmapRepository["create"]>>) {
    const generated = buildRoadmap(
      roadmap.focus_topics.map((item) => ({
        topic: item.topic,
        score: item.score,
        classification: item.reason.split(" based on")[0] as never,
        answerCount: 1,
      })),
      roadmap.plan.filter((item) => item.completed).map((item) => item.resourceId),
    );
    return { roadmap, resources: generated.resources };
  }
}
