# Security Policy

## Supported version

InterviewForge is pre-release. Security fixes apply to the current main branch and latest deployed MVP only.

## Reporting a vulnerability

Do not open a public issue containing an exploit, credential, access token, personal resume, job description, interview answer, or cross-user data. Contact the repository owner privately with:

- A concise description and affected component.
- Reproduction steps using synthetic data.
- Expected and observed behavior.
- Potential impact and any suggested mitigation.

Do not retain, download, modify, or publish another user's data while investigating.

## Security boundaries

- Supabase Auth establishes identity.
- Fastify validates the bearer token, request, resource ownership, and business rules.
- PostgreSQL RLS independently enforces row ownership.
- Private Supabase Storage policies restrict resume objects by the authenticated user's path.
- The frontend and navigation protection are not authorization boundaries.
- Gemini never controls authorization, database queries, adaptive rules, or resource URLs.

## Sensitive data rules

- Never expose service-role keys, secret keys, Gemini keys, or database passwords to the frontend.
- Never prefix secrets with `NEXT_PUBLIC_`.
- Never log access tokens, full resumes, full job descriptions, complete answers, or raw prompts containing personal data.
- Keep resumes private and use short-lived signed access only when required.
- Use synthetic fixtures and screenshots in tests and documentation.

## Baseline controls

- Runtime schema validation on requests and AI output.
- Row-level security on all user-owned tables.
- Ownership checks in Fastify even when RLS exists.
- Body, file, processing, and AI timeout limits.
- CORS allowlist and authenticated per-user rate limits.
- Stable safe error codes without internal stacks.
- Dependency lockfiles and security-patched package versions.
- Idempotent answer submission and safe retry semantics.
