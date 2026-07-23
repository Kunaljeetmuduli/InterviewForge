import type { MasteryClassification } from "../dashboard/dashboard-calculations.js";

export interface TopicMastery {
  topic: string;
  score: number;
  classification: MasteryClassification;
  answerCount: number;
}
