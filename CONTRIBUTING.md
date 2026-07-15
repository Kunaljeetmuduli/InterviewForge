# Contributing to InterviewForge

## Before you change code

1. Read `PRODUCT.md`, `DESIGN.md`, `PLAN.md`, and the relevant part of `INTERVIEWFORGE_ARCHITECTURE.md`.
2. Confirm the change belongs to the active milestone.
3. Keep frontend and backend dependencies independent.
4. Create an ADR in `docs/decisions/` before changing a locked architecture decision.

## Branch and commit guidance

- Use a short branch name such as `feature/interview-setup` or `fix/answer-idempotency`.
- Keep commits focused and explain the reason for behavior changes.
- Do not mix unrelated formatting or generated-file changes into a feature commit.
- Never commit `.env` files, credentials, private resumes, job descriptions, or real answer content.

## Implementation expectations

- Deliver one vertical capability with its UI, API, persistence, authorization, errors, tests, and documentation.
- Validate client input and third-party output at runtime with Zod.
- Keep authorization in Fastify and Supabase RLS; never trust a client-supplied `user_id`.
- Preserve idempotency for answer submission and safe retry behavior for processing/evaluation.
- Keep `AdaptiveEngine` pure and deterministic. New behavior requires a new version if compatibility changes.
- Use the DESIGN.md token vocabulary and complete component states.
- Provide a text path for every voice function and a non-color status signal.

## Required local checks

```powershell
Set-Location frontend
npm run lint
npm run typecheck
npm run build

Set-Location ../backend
npm run lint
npm run typecheck
npm test
npm run build
```

For UI work, verify affected routes in a browser at desktop and narrow widths, check the error overlay/console, and exercise keyboard focus. For API work, add or update injection-based Fastify tests.

## Pull request checklist

- [ ] The change belongs to the active milestone.
- [ ] Product and architecture locks remain intact or an ADR is included.
- [ ] Public API/schema changes are documented.
- [ ] Loading, empty, success, failure, retry, and disabled states are handled where relevant.
- [ ] Ownership and RLS impact were reviewed.
- [ ] Accessibility and reduced-motion behavior were reviewed.
- [ ] No sensitive content or secret was added to code, fixtures, logs, or screenshots.
- [ ] Lint, type check, tests, and builds pass.
