import { describe, expect, it } from "vitest";

import { calculateVoiceMetrics } from "../src/modules/interview/voice-metrics.js";

describe("voice metrics", () => {
  it("counts configured filler terms and normalizes them by word count", () => {
    const metrics = calculateVoiceMetrics(
      "Um I would basically use a queue, you know, so the work stays ordered.",
      30,
    );

    expect(metrics.wordCount).toBe(14);
    expect(metrics.fillerWords).toEqual([
      { word: "um", count: 1 },
      { word: "basically", count: 1 },
      { word: "you know", count: 1 },
      { word: "so", count: 1 },
    ]);
    expect(metrics.fillerRate).toBeCloseTo(28.6);
    expect(metrics.wordsPerMinute).toBe(28);
  });

  it("does not penalize a clear answer delivered within the target pace", () => {
    const transcript = Array.from({ length: 120 }, (_, index) => `word${index}`).join(" ");
    expect(calculateVoiceMetrics(transcript, 60).deliveryScore).toBe(100);
  });
});
