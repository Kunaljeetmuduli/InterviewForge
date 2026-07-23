import { describe, expect, it } from "vitest";

import {
  buildRoadmap,
  suggestedHours,
} from "../src/modules/roadmap/roadmap-priority.js";

describe("roadmap priority", () => {
  it("uses the locked effort bands", () => {
    expect([20, 40, 60, 75].map(suggestedHours)).toEqual([5, 3, 1.5, 1]);
  });

  it("selects no more than three weakest topics and preserves completion", () => {
    const result = buildRoadmap(
      [
        { topic: "SQL", score: 35, classification: "Critical weakness", answerCount: 2 },
        { topic: "Arrays", score: 52, classification: "Needs improvement", answerCount: 3 },
        { topic: "HTTP", score: 68, classification: "Developing", answerCount: 1 },
        { topic: "Java", score: 80, classification: "Strong", answerCount: 2 },
      ],
      ["postgresql-tutorial"],
    );

    expect(result.focus.map((item) => item.topic)).toEqual(["SQL", "Arrays", "HTTP"]);
    expect(result.plan[0]?.completed).toBe(true);
    expect(result.resources.every((resource) => resource.url.startsWith("https://"))).toBe(true);
  });
});
