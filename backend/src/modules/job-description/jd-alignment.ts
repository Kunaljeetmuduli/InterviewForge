import type { ResumeAnalysis } from "../resume/resume.types.js";
import type { JDExtractionOutput } from "../../prompts/jd-analysis/v1.js";

export const JD_ALIGNMENT_ALGORITHM_VERSION = "jd-alignment-v1";

const WEIGHTS = {
  requiredSkills: 0.45,
  preferredSkills: 0.15,
  experience: 0.2,
  keywords: 0.2,
} as const;

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function ratio(matched: number, total: number) {
  return total === 0 ? 1 : matched / total;
}

export interface JDAlignmentResult {
  matchingSkills: string[];
  missingSkills: string[];
  score: number;
}

export function calculateJDAlignment(
  jd: JDExtractionOutput,
  resume: ResumeAnalysis,
): JDAlignmentResult {
  const resumeSkills = new Set(
    [...resume.skills, ...resume.technologies].map(normalize).filter(Boolean),
  );
  const required = unique(jd.required_skills);
  const preferred = unique(jd.preferred_skills);
  const allSkills = unique([...required, ...preferred]);
  const matchingSkills = allSkills.filter((skill) =>
    resumeSkills.has(normalize(skill)),
  );
  const missingSkills = allSkills.filter(
    (skill) => !resumeSkills.has(normalize(skill)),
  );
  const requiredMatched = required.filter((skill) =>
    resumeSkills.has(normalize(skill)),
  ).length;
  const preferredMatched = preferred.filter((skill) =>
    resumeSkills.has(normalize(skill)),
  ).length;
  const resumeYears = Math.max(
    0,
    ...resume.experience.map((item) => item.duration_years ?? 0),
  );
  const experienceRatio =
    jd.minimum_experience_years === null || jd.minimum_experience_years === 0
      ? 1
      : Math.min(1, resumeYears / jd.minimum_experience_years);
  const searchableResume = normalize(
    `${resume.summary} ${resume.skills.join(" ")} ${resume.technologies.join(" ")} ${resume.extracted_text}`,
  );
  const keywords = unique(jd.keywords);
  const keywordMatches = keywords.filter((keyword) =>
    ` ${searchableResume} `.includes(` ${normalize(keyword)} `),
  ).length;
  const score = Math.round(
    100 *
      (ratio(requiredMatched, required.length) * WEIGHTS.requiredSkills +
        ratio(preferredMatched, preferred.length) * WEIGHTS.preferredSkills +
        experienceRatio * WEIGHTS.experience +
        ratio(keywordMatches, keywords.length) * WEIGHTS.keywords),
  );

  return { matchingSkills, missingSkills, score };
}
