# HTTP API Contract

Business API base path: `/api/v1`. The system health endpoint is intentionally unversioned.

## Authentication

Except for `/health` and future explicitly documented auth-adjacent endpoints, requests require:

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

Controllers never accept a client-provided `user_id` as authority. The authenticated identity controls repository ownership filters.

## Response envelope

Success:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "RESUME_PARSE_FAILED",
    "message": "We could not extract text from this PDF.",
    "details": null,
    "requestId": "request-id"
  }
}
```

Never return internal stacks, provider payloads, prompts, access tokens, or secrets.

## System

```http
GET /health
```

Foundation response:

```json
{
  "status": "ok",
  "service": "interviewforge-api",
  "version": "0.1.0"
}
```

## Profile

```http
GET /api/v1/profile
PUT /api/v1/profile
```

## Resumes

```http
POST   /api/v1/resumes
GET    /api/v1/resumes
GET    /api/v1/resumes/:resumeId
POST   /api/v1/resumes/:resumeId/process
POST   /api/v1/resumes/:resumeId/retry
DELETE /api/v1/resumes/:resumeId
```

The create call registers a permitted private Storage object. Processing is explicit and retryable.

## Job descriptions

```http
POST   /api/v1/job-descriptions
GET    /api/v1/job-descriptions
GET    /api/v1/job-descriptions/:jobDescriptionId
POST   /api/v1/job-descriptions/:jobDescriptionId/retry
DELETE /api/v1/job-descriptions/:jobDescriptionId
```

The create schema accepts text and metadata only. Multipart data, PDF files, file names, storage paths, and a JD upload endpoint are not part of the MVP.

## Interviews

```http
POST   /api/v1/interviews
GET    /api/v1/interviews
GET    /api/v1/interviews/:interviewId
POST   /api/v1/interviews/:interviewId/start
POST   /api/v1/interviews/:interviewId/answers
POST   /api/v1/interviews/:interviewId/answers/:answerId/retry-evaluation
POST   /api/v1/interviews/:interviewId/complete
POST   /api/v1/interviews/:interviewId/abandon
GET    /api/v1/interviews/:interviewId/report
DELETE /api/v1/interviews/:interviewId
```

Interview creation accepts `questionLimit: 5 | 10` and stores `adaptiveEngineVersion: "adaptive-v1"`. Answer requests include a caller-generated `clientRequestId`. Candidate-facing question responses exclude `expectedConcepts` and private evaluation rubric content.

## Dashboard and roadmap

```http
GET  /api/v1/dashboard/summary
GET  /api/v1/dashboard/topic-mastery
GET  /api/v1/dashboard/progress
GET  /api/v1/roadmaps/latest
POST /api/v1/roadmaps/generate
```

## Status guidance

| Status | Meaning |
| --- | --- |
| 200 | Successful read, update, transition, or idempotent replay |
| 201 | Resource created |
| 202 | Tracked processing accepted when the contract explicitly permits it |
| 400 | Invalid request shape or state transition |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but forbidden operation |
| 404 | Resource absent or not visible to the user |
| 409 | Conflict such as an invalid lifecycle state |
| 413 | Request or PDF exceeds configured limits |
| 422 | Valid JSON with domain validation failure |
| 429 | Rate limit exceeded |
| 500 | Unexpected safe server error |
| 502/503/504 | Provider failure, unavailability, or timeout with retry guidance |
