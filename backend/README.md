# InterviewForge Backend

Independent Fastify TypeScript API for InterviewForge. It owns authentication validation, authorization, workflows, AI orchestration, interview rules, and dashboard aggregation. The frontend is not an alternative backend.

```powershell
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

The foundation endpoint is `GET http://localhost:4000/health`. Business APIs will use `/api/v1` in later milestones.

See the repository root architecture and security documentation before adding modules.
