# Local Development

## Runtime

InterviewForge pins Node.js 24 LTS. The frontend and backend have independent dependencies and lockfiles; always run npm commands from the relevant application directory.

## Environment

Frontend variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Backend variables:

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

Only variables used by the current milestone should be required at startup. `.env.example` files are committed; `.env` and `.env.local` are ignored.

## Commands

Frontend:

```powershell
Set-Location frontend
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

Backend:

```powershell
Set-Location backend
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Ports

- Frontend: 3000
- Backend: 4000

If a port changes, update environment examples, CORS allowlists, README instructions, and deployment configuration together.

## Troubleshooting

- A frontend build failing on fonts should still use locally bundled Geist rather than a remote runtime font request.
- A browser CORS error usually means `NEXT_PUBLIC_API_URL` and backend `CORS_ORIGINS` disagree.
- Render free services may sleep; a delayed first health response is expected in deployed development environments.
- Do not bypass RLS or use a service-role key in the browser to “fix” ownership errors.
- Do not add a Next.js Route Handler as a proxy for a Fastify business endpoint.
