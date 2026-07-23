import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AIClient } from "../src/infrastructure/ai/ai.types.js";
import { AIClientError } from "../src/infrastructure/ai/ai.types.js";
import type { AuthVerifier } from "../src/modules/auth/auth.types.js";
import type {
  Answer,
  Evaluation,
  Interview,
  InterviewRepository,
  Question,
} from "../src/modules/interview/interview.types.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const apps = new Set<ReturnType<typeof buildApp>>();

function responseBody<T>(response: { body: string }): T {
  return JSON.parse(response.body) as T;
}

const authVerifier: AuthVerifier = {
  verify: (token) =>
    Promise.resolve(
      token === "token"
        ? { id: userId }
        : token === "other"
          ? { id: otherUserId }
          : null,
    ),
};

function createRepository() {
  const interviews = new Map<string, Interview>();
  const questions = new Map<string, Question>();
  const answers = new Map<string, Answer>();
  const evaluations = new Map<string, Evaluation>();
  const now = () => new Date().toISOString();

  const repository: InterviewRepository = {
    createInterview(ownerId, _token, record) {
      const timestamp = now();
      const saved = {
        ...record,
        user_id: ownerId,
        created_at: timestamp,
        updated_at: timestamp,
      };
      interviews.set(saved.id, saved);
      return Promise.resolve(saved);
    },
    listInterviews: (ownerId) =>
      Promise.resolve(
        [...interviews.values()].filter((item) => item.user_id === ownerId),
      ),
    findInterview: (ownerId, _token, id) =>
      Promise.resolve(
        interviews.get(id)?.user_id === ownerId ? interviews.get(id)! : null,
      ),
    updateInterview(ownerId, _token, id, changes) {
      const existing = interviews.get(id);
      if (!existing || existing.user_id !== ownerId) {
        return Promise.reject(new Error("not found"));
      }
      const updated = { ...existing, ...changes, updated_at: now() };
      interviews.set(id, updated);
      return Promise.resolve(updated);
    },
    transitionInterview(ownerId, _token, id, expected, changes) {
      const existing = interviews.get(id);
      if (
        !existing ||
        existing.user_id !== ownerId ||
        existing.status !== expected
      ) {
        return Promise.resolve(null);
      }
      const updated = { ...existing, ...changes, updated_at: now() };
      interviews.set(id, updated);
      return Promise.resolve(updated);
    },
    insertQuestion(ownerId, _token, record) {
      const saved = { ...record, user_id: ownerId, created_at: now() };
      questions.set(saved.id, saved);
      return Promise.resolve(saved);
    },
    listQuestions: (ownerId, _token, interviewId) =>
      Promise.resolve(
        [...questions.values()]
          .filter(
            (item) =>
              item.user_id === ownerId && item.interview_id === interviewId,
          )
          .sort((left, right) => left.sequence_number - right.sequence_number),
      ),
    insertAnswer(ownerId, _token, record) {
      const duplicate = [...answers.values()].find(
        (item) =>
          item.interview_id === record.interview_id &&
          item.client_request_id === record.client_request_id,
      );
      if (duplicate) return Promise.reject(new Error("duplicate"));
      const timestamp = now();
      const saved = {
        ...record,
        user_id: ownerId,
        submitted_at: timestamp,
        updated_at: timestamp,
      };
      answers.set(saved.id, saved);
      return Promise.resolve(saved);
    },
    listAnswers: (ownerId, _token, interviewId) =>
      Promise.resolve(
        [...answers.values()].filter(
          (item) =>
            item.user_id === ownerId && item.interview_id === interviewId,
        ),
      ),
    findAnswerByRequestId: (ownerId, _token, interviewId, requestId) =>
      Promise.resolve(
        [...answers.values()].find(
          (item) =>
            item.user_id === ownerId &&
            item.interview_id === interviewId &&
            item.client_request_id === requestId,
        ) ?? null,
      ),
    findAnswer: (ownerId, _token, id) =>
      Promise.resolve(
        answers.get(id)?.user_id === ownerId ? answers.get(id)! : null,
      ),
    updateAnswer(ownerId, _token, id, changes) {
      const existing = answers.get(id);
      if (!existing || existing.user_id !== ownerId) {
        return Promise.reject(new Error("not found"));
      }
      const updated = { ...existing, ...changes, updated_at: now() };
      answers.set(id, updated);
      return Promise.resolve(updated);
    },
    listEvaluations: (ownerId, _token, interviewId) =>
      Promise.resolve(
        [...evaluations.values()].filter(
          (item) =>
            item.user_id === ownerId && item.interview_id === interviewId,
        ),
      ),
    findEvaluationByAnswer: (ownerId, _token, answerId) =>
      Promise.resolve(
        [...evaluations.values()].find(
          (item) => item.user_id === ownerId && item.answer_id === answerId,
        ) ?? null,
      ),
    upsertEvaluation(ownerId, _token, record) {
      const existing = [...evaluations.values()].find(
        (item) => item.answer_id === record.answer_id,
      );
      const saved = {
        ...record,
        id: existing?.id ?? record.id,
        user_id: ownerId,
        created_at: existing?.created_at ?? now(),
      };
      evaluations.set(saved.id, saved);
      return Promise.resolve(saved);
    },
    deleteInterview(ownerId, _token, id) {
      if (interviews.get(id)?.user_id === ownerId) interviews.delete(id);
      return Promise.resolve();
    },
  };
  return { repository, interviews, questions, answers, evaluations };
}

function aiClient(failures = 0): AIClient {
  let calls = 0;
  return {
    generateStructured(request) {
      calls += 1;
      if (calls <= failures) {
        return Promise.reject(new AIClientError("AI_UNAVAILABLE", "temporary"));
      }
      return Promise.resolve({
        data: request.schema.parse({
          scores: {
            technicalCorrectness: 80,
            communication: 70,
            completeness: 75,
            relevance: 85,
          },
          strengths: ["Clear explanation."],
          weaknesses: ["Could include a concrete example."],
          improvementTip: "Add one concise example.",
          exampleAnswer: "A concise improved answer.",
          detectedConcepts: ["resources"],
          missingConcepts: ["idempotency"],
        }),
        metadata: {
          provider: "test",
          model: "test",
          promptVersion: request.promptVersion,
          schemaVersion: request.schemaVersion,
          latencyMs: 1,
        },
      });
    },
  };
}

function createApp(repository: InterviewRepository, ai: AIClient) {
  const app = buildApp({
    authVerifier,
    interviewRepository: repository,
    aiClient: ai,
  });
  apps.add(app);
  return app;
}

async function createAndStart(
  app: ReturnType<typeof buildApp>,
  limit: number = 5,
) {
  const created = await app.inject({
    method: "POST",
    url: "/api/v1/interviews",
    headers: { authorization: "Bearer token" },
    payload: { type: "technical", question_limit: limit },
  });
  const interview = responseBody<{ data?: { interview?: Interview } }>(created)
    .data?.interview;
  if (!interview) return { created, interview: undefined, started: undefined };
  const started = await app.inject({
    method: "POST",
    url: `/api/v1/interviews/${interview.id}/start`,
    headers: { authorization: "Bearer token" },
  });
  return { created, interview, started };
}

afterEach(async () => {
  await Promise.all([...apps].map((app) => app.close()));
  apps.clear();
});

describe("interview core", () => {
  it("accepts only 5 or 10 and keeps started_at null until start", async () => {
    const state = createRepository();
    const app = createApp(state.repository, aiClient());
    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: "Bearer token" },
      payload: { type: "technical", question_limit: 6 },
    });
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: "Bearer token" },
      payload: { type: "technical", question_limit: 10 },
    });

    expect(invalid.statusCode).toBe(400);
    expect(created.statusCode).toBe(201);
    expect(responseBody<{ data: { interview: Interview } }>(created).data.interview).toMatchObject({
      question_limit: 10,
      adaptive_engine_version: "adaptive-v1",
      started_at: null,
    });
  });

  it("hides expected concepts and returns duplicate submissions idempotently", async () => {
    const state = createRepository();
    const app = createApp(state.repository, aiClient());
    const { interview, started } = await createAndStart(app);
    const question = responseBody<{ data: { currentQuestion: Question } }>(
      started!,
    ).data.currentQuestion;
    const requestId = "33333333-3333-4333-8333-333333333333";
    const payload = {
      questionId: question.id,
      transcript: "Resources represent entities and HTTP methods express operations with clear status codes.",
      inputMode: "text",
      clientRequestId: requestId,
    };
    const first = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/answers`,
      headers: { authorization: "Bearer token" },
      payload,
    });
    const duplicate = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/answers`,
      headers: { authorization: "Bearer token" },
      payload,
    });

    expect(JSON.stringify(started!.json())).not.toContain("expected_concepts");
    expect(first.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(
      responseBody<{ data: { answer: Answer } }>(duplicate).data.answer.id,
    ).toBe(responseBody<{ data: { answer: Answer } }>(first).data.answer.id);
    expect(state.answers.size).toBe(1);
    expect(state.evaluations.size).toBe(1);
  });

  it("requires voice duration and stores deterministic delivery metrics", async () => {
    const state = createRepository();
    const app = createApp(state.repository, aiClient());
    const { interview, started } = await createAndStart(app);
    const question = responseBody<{ data: { currentQuestion: Question } }>(
      started!,
    ).data.currentQuestion;
    const withoutDuration = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/answers`,
      headers: { authorization: "Bearer token" },
      payload: {
        questionId: question.id,
        transcript: "Um, I would use a map and explain the tradeoff.",
        inputMode: "voice",
        clientRequestId: "23232323-2323-4232-8232-232323232323",
      },
    });
    const voice = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/answers`,
      headers: { authorization: "Bearer token" },
      payload: {
        questionId: question.id,
        transcript: "Um, I would use a map and explain the tradeoff.",
        inputMode: "voice",
        speakingDurationSeconds: 12,
        clientRequestId: "24242424-2424-4242-8242-242424242424",
      },
    });
    const result = responseBody<{
      data: { answer: Answer; evaluation: Evaluation };
    }>(voice).data;

    expect(withoutDuration.statusCode).toBe(400);
    expect(voice.statusCode).toBe(200);
    expect(result.answer).toMatchObject({
      input_mode: "voice",
      speaking_duration_seconds: 12,
      words_per_minute: 50,
    });
    expect(result.answer.filler_words).toContainEqual({ word: "um", count: 1 });
    expect(result.evaluation.delivery_score).not.toBeNull();
  });

  it("preserves failed answers, retries once, and blocks cross-owner reads", async () => {
    const state = createRepository();
    const app = createApp(state.repository, aiClient(1));
    const { interview, started } = await createAndStart(app);
    const question = responseBody<{ data: { currentQuestion: Question } }>(
      started!,
    ).data.currentQuestion;
    const failed = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/answers`,
      headers: { authorization: "Bearer token" },
      payload: {
        questionId: question.id,
        transcript: "An answer that is saved before evaluation.",
        inputMode: "text",
        clientRequestId: "44444444-4444-4444-8444-444444444444",
      },
    });
    const answer = [...state.answers.values()][0]!;
    const retry = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/answers/${answer.id}/retry-evaluation`,
      headers: { authorization: "Bearer token" },
    });
    const crossOwner = await app.inject({
      method: "GET",
      url: `/api/v1/interviews/${interview!.id}`,
      headers: { authorization: "Bearer other" },
    });

    expect(failed.statusCode).toBe(503);
    expect(answer.processing_status).toBe("failed");
    expect(retry.statusCode).toBe(200);
    expect(state.answers.size).toBe(1);
    expect(state.evaluations.size).toBe(1);
    expect(crossOwner.statusCode).toBe(404);
  });

  it("stores exactly five questions for a Quick interview", async () => {
    const state = createRepository();
    const app = createApp(state.repository, aiClient());
    const { interview, started } = await createAndStart(app, 5);
    let question = responseBody<{ data: { currentQuestion: Question } }>(
      started!,
    ).data.currentQuestion;
    let complete = false;

    for (let index = 0; index < 5; index += 1) {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/interviews/${interview!.id}/answers`,
        headers: { authorization: "Bearer token" },
        payload: {
          questionId: question.id,
          transcript:
            "A structured answer that explains the idea and includes a concise example.",
          inputMode: "text",
          clientRequestId: `66666666-6666-4666-8666-66666666666${index}`,
        },
      });
      const result = responseBody<{
        data: {
          nextQuestion: Question | null;
          interviewComplete: boolean;
        };
      }>(response).data;
      complete = result.interviewComplete;
      if (result.nextQuestion) question = result.nextQuestion;
    }

    expect(complete).toBe(true);
    expect(state.questions.size).toBe(5);
    expect([...state.interviews.values()][0]).toMatchObject({
      status: "completed",
      overall_score: 77,
    });
  });

  it("abandons zero-answer sessions instead of completing them", async () => {
    const state = createRepository();
    const app = createApp(state.repository, aiClient());
    const { interview } = await createAndStart(app);
    const completed = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/complete`,
      headers: { authorization: "Bearer token" },
    });
    const abandoned = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/abandon`,
      headers: { authorization: "Bearer token" },
    });

    expect(completed.statusCode).toBe(409);
    expect(abandoned.statusCode).toBe(200);
    expect([...state.interviews.values()][0]?.status).toBe("abandoned");
  });

  it("rejects new answers after an early completion", async () => {
    const state = createRepository();
    const app = createApp(state.repository, aiClient());
    const { interview, started } = await createAndStart(app);
    const question = responseBody<{ data: { currentQuestion: Question } }>(
      started!,
    ).data.currentQuestion;
    const answered = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/answers`,
      headers: { authorization: "Bearer token" },
      payload: {
        questionId: question.id,
        transcript: "A complete first answer before ending the interview early.",
        inputMode: "text",
        clientRequestId: "55555555-5555-4555-8555-555555555555",
      },
    });
    const nextQuestion = responseBody<{
      data: { nextQuestion: Question };
    }>(answered).data.nextQuestion;
    const completed = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/complete`,
      headers: { authorization: "Bearer token" },
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interview!.id}/answers`,
      headers: { authorization: "Bearer token" },
      payload: {
        questionId: nextQuestion.id,
        transcript: "This should be rejected because the interview is complete.",
        inputMode: "text",
        clientRequestId: "77777777-7777-4777-8777-777777777777",
      },
    });
    expect(completed.statusCode).toBe(200);
    expect(response.statusCode).toBe(409);
    expect(state.answers.size).toBe(1);
  });
});
