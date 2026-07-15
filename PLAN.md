# InterviewForge Implementation Plan

Status: Active  
Plan version: `1.0.0`  
Architecture version: `1.0.0`  
MVP target: August 1, 2026  
Current adaptive engine version: `adaptive-v1`

## 1. Delivery Rules

- Build one verified vertical capability at a time.
- Keep `frontend/` and `backend/` as independent npm applications.
- Keep business APIs in Fastify; Next.js is the frontend only.
- Treat Fastify authorization and Supabase RLS as the security boundaries.
- Validate every external boundary with runtime schemas.
- Preserve exact asked questions, submitted answers, evaluation versions, and AI generation metadata.
- Use latest stable, security-patched packages at installation time and commit lockfiles.
- Do not add postponed infrastructure unless a recorded architecture decision changes the MVP.

## 2. Scope Locks

- Job descriptions are paste-only. JD PDF upload is not part of the MVP.
- Interview format is exactly 5 or 10 questions; default is 5.
- Each interview stores one immutable adaptive engine version, beginning with `adaptive-v1`.
- Voice uses browser Web Speech APIs with an editable text fallback.
- Resume PDFs are private and limited to text-based parsing in the MVP.
- No Python, vectors, RAG, Redis, queues, webcam analysis, paid voice API, dark mode, or recruiter portal.

## 3. Milestone 0 — Foundation

Goal: establish an executable, documented repository without beginning product integrations.

### Deliverables

- [x] Authoritative architecture and approved amendments.
- [x] `PRODUCT.md`, `DESIGN.md`, `PLAN.md`, README, contribution, security, API, and database documentation.
- [x] Valid Git repository and root editor/ignore configuration.
- [x] Independent Next.js frontend with Forge Blue design tokens and initial public app shell.
- [x] Independent Fastify backend with an unversioned `GET /health` endpoint.
- [x] Frontend and backend environment examples.
- [x] Initial GitHub Actions workflow for lint, type checking, tests, and builds.
- [x] Local verification of both applications and visual browser verification.

### Exit gate

- Fresh installs succeed in both folders.
- Frontend lint, type check, and production build pass.
- Backend lint, type check, unit test, and production build pass.
- `GET /health` returns HTTP 200 with a stable JSON contract.
- The root page loads without an error overlay, contains meaningful content, and matches Forge Blue + Slate direction.
- Work stops before Auth, Supabase migrations, Gemini, resume processing, or interview logic.

## 4. Milestone 1 — Identity and Data Security

Goal: establish authenticated ownership before any sensitive career data is stored.

### Deliverables

- Supabase project environments and documented local setup.
- Email/password Auth flows: sign up, sign in, sign out, password reset, session restoration.
- `profiles` migration and profile creation/update flow.
- Request-scoped Supabase client in Fastify using the bearer access token.
- Fastify authentication hook and typed authenticated request context.
- Initial domain tables, constraints, indexes, timestamps, and RLS policies.
- Private resume Storage bucket and ownership policies.
- Frontend navigation protection as a user-experience layer only.

### Exit gate

- Anonymous business requests return 401.
- Users can read and mutate only their own rows and private resume objects.
- Update policies use both `USING` and `WITH CHECK`.
- No service-role or secret key is exposed to the browser.
- Cross-user integration tests pass.

## 5. Milestone 2 — Resume and Pasted Job Description

Goal: turn user-provided context into validated structured analysis.

### Resume slice

- PDF selection, client-side type/size guidance, private upload, and database record.
- Fastify processing request that remains tracked until completion.
- `pdf-parse` extraction for text-based PDFs with page and size limits.
- Validated Gemini resume analysis through `AIClient`.
- Realtime status subscription established before the process request.
- Failure state, safe retry, delete, and Storage cleanup behavior.

### Job-description slice

- Labeled paste-only text area; no file input or upload endpoint.
- Title/company metadata and raw text persistence.
- Validated skill, responsibility, keyword, and experience analysis.
- Resume-to-JD comparison with evidence and missing-skill suggestions.
- Retry and deletion flows.

### Exit gate

- Invalid/non-text PDFs fail safely without partial analysis records.
- Status transitions are observable and recoverable.
- JD API schemas reject multipart/file input.
- AI output is schema-validated, versioned, and associated with provider/model metadata.
- Sensitive source text is absent from logs.

## 6. Milestone 3 — Interview Core

Goal: complete the text-first adaptive practice loop.

### Deliverables

- Interview setup for HR, Technical, Behavioral, and DSA verbal modes.
- Explicit Quick 5 / Full 10 selection with Quick 5 as the default.
- Optional resume and pasted-JD context selection.
- Curated question bank with topic, difficulty, type, source, expected concepts, and rubric.
- Interview lifecycle: draft/start/in-progress/completed/abandoned.
- One-question-at-a-time workspace and immutable question sequence.
- Idempotent answer submission using `client_request_id`.
- Structured evaluation with strengths, improvements, score dimensions, and safe feedback.
- Evaluation retry without duplicate answers or evaluations.
- Pure deterministic `AdaptiveEngine` exported as `adaptive-v1`.
- Completion report and early-end behavior.

### Exit gate

- Only 5 or 10 is accepted by storage and API validation.
- `started_at` remains null until the start transition.
- The adaptive engine never calls AI, HTTP, or the database.
- Expected concepts and rubrics never reach the candidate before submission.
- Duplicate answer requests return the original result safely.
- Completed interviews reject new answers.
- Engine tests cover boundaries, topic repetition, weak-answer escape, and question-limit termination.

## 7. Milestone 4 — Voice, Progress, and Roadmap

Goal: add accessible voice convenience and make repeated practice useful over time.

### Voice

- Feature detection for `SpeechRecognition` / `webkitSpeechRecognition`.
- Speech-to-text controls beside an editable transcript.
- `speechSynthesis` question playback with stop/pause behavior.
- Permission denial, unsupported-browser, timeout, and microphone error states.
- Timing and filler-word metrics labeled as limited signals, not personality judgments.

### Dashboard and history

- Progress summary, interview trend, topic mastery, strong/weak topic labels, and recent interviews.
- Recharts visualizations with textual alternatives and non-color differentiation.
- Interview history, report revisit, and owned-history deletion.

### Roadmap

- Deterministic prioritization from recent weakness and trend signals.
- Curated, verified learning resource catalog.
- Actionable plan with focus topic, reason, suggested practice, and completion tracking.

### Exit gate

- Text mode completes the entire interview when voice is unavailable or denied.
- Reduced-motion and keyboard-only flows pass manual checks.
- Dashboard calculations are covered by unit tests.
- Charts remain understandable without color or pointer hover.
- Roadmap links come from a curated catalog rather than arbitrary AI URLs.

## 8. Milestone 5 — Hardening and Deployment

Goal: prove the complete portfolio flow in production-like environments.

### Deliverables

- Rate limits, body/file limits, AI/PDF timeouts, CORS allowlist, and safe structured logging.
- Loading skeletons, empty states, retryable failures, and destructive confirmations.
- Responsive review at phone, tablet, laptop, and wide desktop breakpoints.
- Frontend deployment to Vercel, backend deployment to Render, and Supabase production configuration.
- Production environment variables, Auth URLs, Storage policies, Realtime publication, and CORS verification.
- CI required checks and deployment smoke tests.
- Candidate-ready README, screenshots, architecture explanation, and demo script.

### Exit gate

- The complete Definition of Done in `INTERVIEWFORGE_ARCHITECTURE.md` passes.
- No secrets or sensitive source content appear in Git history, bundles, or logs.
- Frontend and backend production builds pass from clean installs.
- A new production user can complete the full text-first happy path.
- Free-tier sleep, timeout, and quota behavior is documented honestly.

## 9. Required Test Matrix

| Layer | Required coverage |
| --- | --- |
| Pure domain | `adaptive-v1`, score aggregation, topic mastery, roadmap priority |
| Backend unit | Zod schemas, service decisions, error mapping, redaction helpers |
| Backend integration | Auth 401, ownership, 5/10 constraint, answer idempotency, retry behavior, deletion |
| Frontend component | Setup selection, voice fallback, evaluation disclosure, empty/error states |
| End-to-end | Signup through report, both question limits, resume/JD context, deletion, text fallback |
| Accessibility | Keyboard flow, focus, zoom, reduced motion, dialog/sheet behavior, chart alternatives |
| Security | Cross-user requests, leaked rubric checks, file validation, secret/log scanning |

## 10. Decision and Change Control

Changes to locked architecture require an Architecture Decision Record in `docs/decisions/`. Each ADR states context, decision, alternatives, consequences, migration impact, and status.

The following changes always require an ADR:

- Replacing Fastify, Next.js, Supabase, or Gemini.
- Adding a new runtime, service, queue, vector store, or paid provider.
- Changing the 5/10 interview formats or default.
- Replacing or revising `adaptive-v1` behavior in a non-backward-compatible way.
- Adding JD file upload or dark mode to the MVP.
- Moving authorization responsibility away from Fastify plus RLS.

## 11. Current Next Action

Complete Milestone 0 only. After its verification report, begin Milestone 1 with a new implementation pass and current Supabase documentation review.
