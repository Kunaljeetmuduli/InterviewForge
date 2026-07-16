import { describe, expect, it } from "vitest";

import { calculateJDAlignment } from "../src/modules/job-description/jd-alignment.js";
import type { ResumeAnalysis } from "../src/modules/resume/resume.types.js";
import type { JDExtractionOutput } from "../src/prompts/jd-analysis/v1.js";

const timestamp = "2026-07-17T00:00:00.000Z";

function resume(overrides: Partial<ResumeAnalysis> = {}): ResumeAnalysis {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "22222222-2222-4222-8222-222222222222",
    resume_id: "33333333-3333-4333-8333-333333333333",
    extracted_text: "Built services at Google using TypeScript.",
    summary: "Backend engineer",
    skills: ["TypeScript"],
    projects: [],
    education: [],
    experience: [],
    certifications: [],
    technologies: [],
    strengths: [],
    provider: "test",
    model: "test",
    prompt_version: "resume-analysis-v1",
    schema_version: "resume-analysis-schema-v1",
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function jd(overrides: Partial<JDExtractionOutput> = {}): JDExtractionOutput {
  return {
    required_skills: [],
    preferred_skills: [],
    minimum_experience: "",
    minimum_experience_years: null,
    responsibilities: [],
    keywords: [],
    ...overrides,
  };
}

describe("jd-alignment-v1", () => {
  it("matches normalized skills exactly", () => {
    const result = calculateJDAlignment(
      jd({ required_skills: ["typescript", "Go"] }),
      resume(),
    );

    expect(result.matchingSkills).toEqual(["typescript"]);
    expect(result.missingSkills).toEqual(["Go"]);
  });

  it("does not treat a keyword as a substring of another word", () => {
    const result = calculateJDAlignment(jd({ keywords: ["Go"] }), resume());

    expect(result.score).toBe(80);
  });

  it("matches complete normalized keyword phrases", () => {
    const result = calculateJDAlignment(
      jd({ keywords: ["backend engineer"] }),
      resume(),
    );

    expect(result.score).toBe(100);
  });

  it("uses the longest evidenced role instead of summing overlapping roles", () => {
    const experience = [
      {
        role: "Engineer",
        organization: "One",
        duration: "2 years",
        duration_years: 2,
        highlights: [],
      },
      {
        role: "Consultant",
        organization: "Two",
        duration: "2 years",
        duration_years: 2,
        highlights: [],
      },
    ];
    const result = calculateJDAlignment(
      jd({ minimum_experience: "4 years", minimum_experience_years: 4 }),
      resume({ experience }),
    );

    expect(result.score).toBe(90);
  });
});
