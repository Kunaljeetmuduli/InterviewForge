# Privacy and AI Safety

InterviewForge processes resumes, pasted job descriptions, and interview answers. These can contain personal and commercially sensitive information. The MVP must communicate provider limitations and minimize unnecessary data exposure.

## User-facing commitments

- Explain what information is sent to an AI provider before the first analysis/evaluation.
- Advise users not to submit secrets, government identifiers, confidential employer information, or information they are not permitted to share.
- Make resume, job-description, interview, and history deletion available for owned data.
- Describe scores as coaching signals, not hiring probabilities or guarantees.
- Keep voice optional and disclose that browser recognition availability and processing behavior vary by browser.

## Data minimization

- Send only fields needed for the current AI task.
- Apply length limits and structured prompts.
- Do not send access tokens, Storage paths, internal IDs unless required, or private authorization context.
- Do not log raw prompts containing candidate text.
- Prefer curated question and roadmap resources before generating new material.

## Evaluation safety

- Evaluate relevance, completeness, technical concepts, communication structure, and explicitly limited delivery metrics.
- Do not infer protected traits, accent quality, personality, emotion, honesty, mental state, or employability.
- Never use webcam emotion detection or psychological confidence detection.
- Preserve the submitted answer even when evaluation fails; retry evaluation without duplicate answer creation.
- Withhold expected concepts and private rubrics until after answer submission.

## AI boundary

Every task goes through an application-owned `AIClient`, requests structured JSON, validates the result with Zod, uses a versioned prompt/schema/rubric, and records safe provider/model metadata. Gemini never controls authorization, database access, final `AdaptiveEngine` decisions, or arbitrary learning-resource URLs.
