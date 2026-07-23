import { describe, expect, it } from "vitest";

import {
  classifyMastery,
  weightedTopicScore,
} from "../src/modules/dashboard/dashboard-calculations.js";

describe("dashboard calculations", () => {
  it("uses a normal average until four topic evaluations exist", () => {
    expect(weightedTopicScore([90, 60, 30])).toBe(60);
  });

  it("weights recent topic evidence according to topic-mastery-v1", () => {
    expect(weightedTopicScore([90, 80, 70, 20, 40])).toBe(73);
  });

  it("classifies every score boundary", () => {
    expect([39, 40, 59, 60, 74, 75, 89, 90].map(classifyMastery)).toEqual([
      "Critical weakness",
      "Needs improvement",
      "Needs improvement",
      "Developing",
      "Developing",
      "Strong",
      "Strong",
      "Excellent",
    ]);
  });
});
