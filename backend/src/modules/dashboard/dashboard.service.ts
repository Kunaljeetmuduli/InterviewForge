import type { InterviewAuthContext, InterviewRepository } from "../interview/interview.types.js";
import { calculateDashboard, type InterviewEvidence } from "./dashboard-calculations.js";

export class DashboardService {
  constructor(private readonly repository: InterviewRepository) {}

  async all(context: InterviewAuthContext) {
    const interviews = await this.repository.listInterviews(
      context.user.id,
      context.accessToken,
    );
    const evidence = await Promise.all(
      interviews
        .filter((interview) => interview.status === "completed")
        .map(async (interview): Promise<InterviewEvidence> => {
          const [questions, evaluations] = await Promise.all([
            this.repository.listQuestions(context.user.id, context.accessToken, interview.id),
            this.repository.listEvaluations(context.user.id, context.accessToken, interview.id),
          ]);
          return { interview, questions, evaluations };
        }),
    );
    return calculateDashboard(evidence);
  }
}
