# InterviewForge

**Focused, evidence-led interview preparation for software candidates.**

[![CI](https://github.com/Kunaljeetmuduli/InterviewForge/actions/workflows/ci.yml/badge.svg)](https://github.com/Kunaljeetmuduli/InterviewForge/actions/workflows/ci.yml)
[![Node.js 24](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-2563EB.svg)](LICENSE)

InterviewForge is an AI-assisted interview practice platform for students,
recent graduates, career switchers, and early-career software candidates. It is
designed to turn a candidate's experience, target role, and practice answers
into realistic interviews, structured feedback, and clear next steps.

The product is intentionally focused: it supports interview preparation without
pretending to predict hiring decisions or measure personality.

## What makes InterviewForge different

### Practice grounded in context

Interview sessions are designed around the candidate's resume, target role, and
a pasted job description rather than generic question lists.

### Explainable adaptation

The `adaptive-v1` engine is deterministic and versioned. AI evaluates
answers, but application rules decide the next topic, difficulty, and follow-up
strategy.

### Useful feedback without a hiring verdict

Evaluations focus on technical correctness, clarity, completeness, relevance,
and observable delivery signals. Every weak area should lead to a practical
next action.

### A text-first accessible experience

Core interviews work through text. Browser-native speech input and playback are
optional enhancements, never requirements.

## Product scope

The MVP is intentionally constrained:

- Interview modes: HR, Technical, Behavioral, and DSA verbal.
- Interview formats: exactly **Quick 5** or **Full 10**, with Quick 5 as default.
- Job descriptions: pasted text only; JD PDF upload is outside the MVP.
- Resumes: private, text-based PDF files up to 5 MB.
- Voice: browser Web Speech APIs with an editable text fallback.
- Adaptive logic: deterministic and stored as `adaptive-v1` per interview.
- AI provider: Gemini behind an application-owned, validated `AIClient`.

## Architecture

```mermaid
flowchart LR
    User[Candidate] --> Web[Next.js frontend]
    Web --> Auth[Supabase Auth]
    Web --> Storage[Private Supabase Storage]
    Web -->|Bearer token and JSON| API[Fastify API]
    API --> DB[Supabase PostgreSQL and RLS]
    API --> Engine[adaptive-v1]
    API --> AI[AIClient and Gemini]
    DB --> Realtime[Supabase Realtime]
    Realtime --> Web
```

InterviewForge uses two independent npm applications in one repository. There
is no root workspace, shared-package orchestrator, or Next.js business backend.

| Layer | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Backend | Node.js 24, Fastify, TypeScript, Zod |
| Data platform | Supabase PostgreSQL, Auth, Storage, Realtime |
| Testing | Vitest, TypeScript, ESLint, production builds |
| AI direction | Gemini through a validated `AIClient` abstraction |
| Deployment direction | Vercel, Render, and Supabase |

## Repository structure

```text
InterviewForge/
|-- frontend/               Next.js application
|-- backend/                Fastify API
|-- supabase/
|   |-- migrations/         Ordered database and Storage migrations
|   `-- verification/       Read-only catalog checks
|-- .github/workflows/      Continuous integration
|-- PRODUCT.md              Public product principles
|-- DESIGN.md               Forge Blue design system
|-- start.bat               Windows development launcher
`-- LICENSE                 MIT License
```

## Getting started

### Prerequisites

- Node.js 24 LTS
- npm 11 or later
- A Supabase project
- Git

Gemini credentials are used only for AI-powered analysis and evaluation.

### 1. Clone the repository

```powershell
git clone https://github.com/Kunaljeetmuduli/InterviewForge.git
Set-Location InterviewForge
```

### 2. Install dependencies

The frontend and backend are independent applications:

```powershell
Set-Location frontend
npm install

Set-Location ../backend
npm install

Set-Location ..
```

### 3. Configure environment variables

```powershell
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env
```

Frontend configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Backend configuration:

```env
NODE_ENV=development
PORT=4000
CORS_ORIGINS=http://localhost:3000
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=
MAX_PDF_SIZE_MB=5
MAX_INTERVIEW_QUESTIONS=10
AI_TIMEOUT_MS=30000
```

Use Supabase publishable keys in the current applications. Never expose a
service-role key, database password, or Gemini API key to the frontend.

### 4. Start the applications

On Windows, launch both development servers from the repository root:

```powershell
.\start.bat
```

Alternatively, run them separately:

```powershell
# Terminal 1
Set-Location backend
npm run dev

# Terminal 2
Set-Location frontend
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`

## Quality checks

Frontend:

```powershell
Set-Location frontend
npm run lint
npm run typecheck
npm run build
```

Backend:

```powershell
Set-Location backend
npm run lint
npm run typecheck
npm test
npm run build
```

The GitHub Actions workflow runs the same checks on every push to `main` and on
pull requests. It does not create branches or dependency-update pull requests.

## Design direction

InterviewForge uses a restrained **Forge Blue + Slate** visual system. The
interface is light-first, keyboard-friendly, reduced-motion aware, and designed
to meet WCAG 2.2 AA for primary flows.

The product avoids neon AI styling, gamification pressure, opaque scoring,
decorative motion, and dark-mode-first developer-tool conventions.

## Privacy and responsible AI

InterviewForge handles sensitive career information. The architecture follows
these rules:

- Resume files remain private and user-owned.
- Cross-user database and Storage access is blocked by ownership policies.
- Full resumes, job descriptions, answers, access tokens, and prompts must not
  appear in logs.
- Common direct identifiers are removed before AI processing.
- AI output is schema-validated and treated as coaching guidance.
- Expected concepts and evaluation rubrics are never exposed before submission.
- Text mode remains available when voice is unsupported or denied.
- Interview scores are not hiring probabilities or employment decisions.

Do not commit real candidate data or secrets. Local `.env` files are excluded
from Git.

## License

InterviewForge is available under the [MIT License](LICENSE).
