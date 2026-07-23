import resources from "../../data/roadmap_resources.json" with { type: "json" };
import type { TopicMastery } from "./roadmap-local.types.js";

export interface RoadmapResource {
  id: string;
  title: string;
  url: string;
  topics: string[];
  kind: string;
}

export function suggestedHours(score: number) {
  if (score < 40) return 5;
  if (score < 60) return 3;
  if (score < 75) return 1.5;
  return 1;
}

function resourceForTopic(topic: string) {
  const normalized = topic.toLocaleLowerCase("en");
  return (
    (resources as RoadmapResource[]).find((resource) =>
      resource.topics.some(
        (candidate) =>
          normalized.includes(candidate) || candidate.includes(normalized),
      ),
    ) ?? (resources as RoadmapResource[]).find((resource) => resource.id === "visualgo")!
  );
}

export function buildRoadmap(
  mastery: TopicMastery[],
  completedResourceIds: string[],
) {
  const focus = mastery.slice(0, 3).map((topic) => ({
    topic: topic.topic,
    score: topic.score,
    reason: `${topic.classification} based on ${topic.answerCount} evaluated answer${topic.answerCount === 1 ? "" : "s"}.`,
    suggestedHours: suggestedHours(topic.score),
  }));
  const plan = focus.map((item) => {
    const resource = resourceForTopic(item.topic);
    return {
      topic: item.topic,
      action:
        item.score >= 75
          ? `Maintain ${item.topic} with one focused review.`
          : `Review ${item.topic}, then complete one targeted practice interview.`,
      resourceId: resource.id,
      completed: completedResourceIds.includes(resource.id),
    };
  });
  return {
    focus,
    plan,
    resources: [...new Map(plan.map((item) => {
      const resource = (resources as RoadmapResource[]).find(
        (candidate) => candidate.id === item.resourceId,
      )!;
      return [resource.id, resource] as const;
    })).values()],
  };
}
