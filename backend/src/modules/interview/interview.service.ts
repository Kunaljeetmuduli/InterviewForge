import { randomUUID } from "node:crypto";

import { AIClientError, type AIClient } from "../../infrastructure/ai/ai.types.js";
import {
  answerEvaluationSystemPrompt,
  EVALUATION_PROMPT_VERSION,
  EVALUATION_SCHEMA_VERSION,
  evaluationOutputSchema,
} from "../../prompts/answer-evaluation/v1.js";
import type { JobDescriptionRepository } from "../job-description/job-description.types.js";
import type { ResumeRepository } from "../resume/resume.types.js";
import {
  ADAPTIVE_ENGINE_VERSION,
  runAdaptiveEngine,
  type AdaptiveResult,
} from "./adaptive-engine.js";
import {
  selectQuestion,
  topicsForInterviewType,
  type BankQuestion,
} from "./question-bank.js";
import { calculateVoiceMetrics } from "./voice-metrics.js";
import type {
  Answer,
  AnswerInput,
  Evaluation,
  Interview,
  InterviewAuthContext,
  InterviewCreateInput,
  InterviewRepository,
  PublicQuestion,
  Question,
} from "./interview.types.js";

export class InterviewNotFoundError extends Error {
  constructor() {
    super("The requested interview was not found.");
    this.name = "InterviewNotFoundError";
  }
}

export class InterviewStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterviewStateError";
  }
}

export class InterviewProcessingError extends Error {
  constructor(
    readonly code: "AI_TIMEOUT" | "AI_UNAVAILABLE" | "AI_SCHEMA_INVALID" | "EVALUATION_FAILED",
    message: string,
    readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "InterviewProcessingError";
  }
}

interface Dependencies {
  repository: InterviewRepository;
  resumeRepository: ResumeRepository;
  jobDescriptionRepository: JobDescriptionRepository;
  aiClient: AIClient;
}

function publicQuestion(question: Question): PublicQuestion {
  return {
    id: question.id,
    interview_id: question.interview_id,
    sequence_number: question.sequence_number,
    text: question.text,
    type: question.type,
    topic: question.topic,
    difficulty: question.difficulty,
    estimated_seconds: question.estimated_seconds,
    source: question.source,
    adaptation_strategy: question.adaptation_strategy,
    adaptation_reason: question.adaptation_reason,
  };
}

function processingError(error: unknown) {
  if (error instanceof InterviewProcessingError) {
    return error;
  }
  if (error instanceof AIClientError) {
    return new InterviewProcessingError(
      error.code,
      error.code === "AI_SCHEMA_INVALID"
        ? "The answer evaluation returned an invalid response. Try again."
        : "Answer evaluation is temporarily unavailable. Try again.",
      error.code === "AI_TIMEOUT"
        ? 504
        : error.code === "AI_SCHEMA_INVALID"
          ? 502
          : 503,
      { cause: error },
    );
  }
  return new InterviewProcessingError(
    "EVALUATION_FAILED",
    "We could not evaluate this answer. Try again.",
    500,
    { cause: error },
  );
}

function overallScore(
  type: Interview["type"],
  scores: {
    technicalCorrectness: number | null;
    communication: number;
    completeness: number;
    relevance: number;
    delivery: number | null;
  },
) {
  if (type === "technical" || type === "dsa") {
    if (scores.technicalCorrectness === null) {
      throw new InterviewProcessingError(
        "AI_SCHEMA_INVALID",
        "The technical evaluation did not include a correctness score.",
        502,
      );
    }
    return Math.round(
      scores.technicalCorrectness * 0.4 +
        scores.completeness * 0.2 +
        scores.relevance * 0.15 +
        scores.communication * 0.25,
    );
  }

  return scores.delivery === null
    ? Math.round(
        scores.communication * (6 / 17) +
          scores.relevance * (6 / 17) +
          scores.completeness * (5 / 17),
      )
    : Math.round(
        scores.communication * 0.3 +
          scores.relevance * 0.3 +
          scores.completeness * 0.25 +
          scores.delivery * 0.15,
      );
}

function averageScore(evaluations: Evaluation[]) {
  if (evaluations.length === 0) {
    return null;
  }
  return Math.round(
    evaluations.reduce((sum, evaluation) => sum + evaluation.overall_score, 0) /
      evaluations.length,
  );
}

function newQuestion(
  userId: string,
  interview: Interview,
  bankQuestion: BankQuestion,
  sequenceNumber: number,
  adaptation?: AdaptiveResult,
) {
  return {
    id: randomUUID(),
    user_id: userId,
    interview_id: interview.id,
    sequence_number: sequenceNumber,
    text: bankQuestion.text,
    type: interview.type,
    topic: bankQuestion.topic,
    difficulty: bankQuestion.difficulty,
    expected_concepts: bankQuestion.expectedConcepts,
    follow_up_topics: bankQuestion.followUpTopics,
    estimated_seconds: bankQuestion.estimatedSeconds,
    source: "question_bank" as const,
    question_bank_id: bankQuestion.id,
    adaptation_strategy: adaptation?.strategy ?? null,
    adaptation_reason: adaptation?.reason ?? null,
    provider: null,
    model: null,
    prompt_version: null,
    schema_version: "question-schema-v1",
  };
}

export class InterviewService {
  constructor(private readonly dependencies: Dependencies) {}

  async create(
    context: InterviewAuthContext,
    input: InterviewCreateInput,
  ) {
    if (input.resume_id) {
      const resume = await this.dependencies.resumeRepository.findByIdForUser(
        context.user.id,
        context.accessToken,
        input.resume_id,
      );
      if (!resume || resume.status !== "completed") {
        throw new InterviewStateError(
          "The selected resume must have a completed analysis.",
        );
      }
    }

    if (input.job_description_id) {
      const job =
        await this.dependencies.jobDescriptionRepository.findByIdForUser(
          context.user.id,
          context.accessToken,
          input.job_description_id,
        );
      if (!job || job.status !== "completed") {
        throw new InterviewStateError(
          "The selected job description must have a completed analysis.",
        );
      }
    }

    return this.dependencies.repository.createInterview(
      context.user.id,
      context.accessToken,
      {
        id: randomUUID(),
        resume_id: input.resume_id ?? null,
        job_description_id: input.job_description_id ?? null,
        type: input.type,
        status: "created",
        current_difficulty: "easy",
        question_limit: input.question_limit,
        target_topics: topicsForInterviewType(input.type),
        adaptive_engine_version: ADAPTIVE_ENGINE_VERSION,
        overall_score: null,
        started_at: null,
        completed_at: null,
      },
    );
  }

  list(context: InterviewAuthContext) {
    return this.dependencies.repository.listInterviews(
      context.user.id,
      context.accessToken,
    );
  }

  async get(context: InterviewAuthContext, interviewId: string) {
    const interview = await this.requireInterview(context, interviewId);
    const [questions, answers, evaluations] = await Promise.all([
      this.dependencies.repository.listQuestions(
        context.user.id,
        context.accessToken,
        interviewId,
      ),
      this.dependencies.repository.listAnswers(
        context.user.id,
        context.accessToken,
        interviewId,
      ),
      this.dependencies.repository.listEvaluations(
        context.user.id,
        context.accessToken,
        interviewId,
      ),
    ]);
    const answered = new Set(answers.map((answer) => answer.question_id));
    const currentQuestion = questions.find(
      (question) => !answered.has(question.id),
    );
    return {
      interview,
      questions: questions.map(publicQuestion),
      answers,
      evaluations,
      currentQuestion: currentQuestion ? publicQuestion(currentQuestion) : null,
    };
  }

  async start(context: InterviewAuthContext, interviewId: string) {
    const interview = await this.requireInterview(context, interviewId);
    if (interview.status !== "created") {
      throw new InterviewStateError("Only a draft interview can be started.");
    }

    const selected = selectQuestion({
      type: interview.type,
      difficulty: interview.current_difficulty,
      usedQuestionBankIds: [],
    });
    const question = await this.dependencies.repository.insertQuestion(
      context.user.id,
      context.accessToken,
      newQuestion(context.user.id, interview, selected, 1),
    );
    const started = await this.dependencies.repository.transitionInterview(
      context.user.id,
      context.accessToken,
      interviewId,
      "created",
      { status: "in_progress", started_at: new Date().toISOString() },
    );
    if (!started) {
      throw new InterviewStateError(
        "The interview has already started or its status changed.",
      );
    }
    return { interview: started, currentQuestion: publicQuestion(question) };
  }

  async submitAnswer(
    context: InterviewAuthContext,
    interviewId: string,
    input: AnswerInput,
  ) {
    const interview = await this.requireInterview(context, interviewId);
    const duplicate =
      await this.dependencies.repository.findAnswerByRequestId(
        context.user.id,
        context.accessToken,
        interviewId,
        input.clientRequestId,
      );
    if (duplicate) {
      return this.resultForExistingAnswer(context, interview, duplicate);
    }
    if (interview.status !== "in_progress") {
      throw new InterviewStateError(
        "Answers can only be submitted to an interview in progress.",
      );
    }

    const [questions, answers] = await Promise.all([
      this.dependencies.repository.listQuestions(
        context.user.id,
        context.accessToken,
        interviewId,
      ),
      this.dependencies.repository.listAnswers(
        context.user.id,
        context.accessToken,
        interviewId,
      ),
    ]);
    const answered = new Set(answers.map((answer) => answer.question_id));
    const question = questions.find((candidate) => !answered.has(candidate.id));
    if (!question || question.id !== input.questionId) {
      throw new InterviewStateError(
        "Submit an answer for the current unanswered question.",
      );
    }

    const voiceMetrics =
      input.inputMode === "voice"
        ? calculateVoiceMetrics(
            input.transcript,
            input.speakingDurationSeconds!,
          )
        : null;
    let answer: Answer;
    try {
      answer = await this.dependencies.repository.insertAnswer(
        context.user.id,
        context.accessToken,
        {
          id: randomUUID(),
          user_id: context.user.id,
          interview_id: interviewId,
          question_id: question.id,
          client_request_id: input.clientRequestId,
          transcript: input.transcript,
          input_mode: input.inputMode,
          processing_status: "pending",
          speaking_duration_seconds: input.speakingDurationSeconds ?? null,
          word_count:
            voiceMetrics?.wordCount ??
            input.transcript.split(/\s+/u).filter(Boolean).length,
          filler_words: voiceMetrics?.fillerWords ?? [],
          filler_rate: voiceMetrics?.fillerRate ?? null,
          words_per_minute: voiceMetrics?.wordsPerMinute ?? null,
        },
      );
    } catch (error) {
      const raced =
        await this.dependencies.repository.findAnswerByRequestId(
          context.user.id,
          context.accessToken,
          interviewId,
          input.clientRequestId,
        );
      if (raced) {
        return this.resultForExistingAnswer(context, interview, raced);
      }
      throw error;
    }

    return this.evaluateAndAdvance(context, interview, question, answer);
  }

  async retryEvaluation(
    context: InterviewAuthContext,
    interviewId: string,
    answerId: string,
  ) {
    const interview = await this.requireInterview(context, interviewId);
    if (interview.status !== "in_progress") {
      throw new InterviewStateError(
        "Evaluations can only be retried while the interview is in progress.",
      );
    }
    const answer = await this.dependencies.repository.findAnswer(
      context.user.id,
      context.accessToken,
      answerId,
    );
    if (!answer || answer.interview_id !== interviewId) {
      throw new InterviewNotFoundError();
    }
    const existing =
      await this.dependencies.repository.findEvaluationByAnswer(
        context.user.id,
        context.accessToken,
        answer.id,
      );
    const question = (
      await this.dependencies.repository.listQuestions(
        context.user.id,
        context.accessToken,
        interviewId,
      )
    ).find((candidate) => candidate.id === answer.question_id);
    if (!question) {
      throw new InterviewNotFoundError();
    }
    if (existing) {
      const updatedAnswer =
        await this.dependencies.repository.updateAnswer(
          context.user.id,
          context.accessToken,
          answer.id,
          { processing_status: "evaluated" },
        );
      const alreadyAdvanced = (
        await this.dependencies.repository.listQuestions(
          context.user.id,
          context.accessToken,
          interviewId,
        )
      ).some(
        (candidate) =>
          candidate.sequence_number > question.sequence_number,
      );
      if (alreadyAdvanced) {
        return this.resultForExistingAnswer(
          context,
          interview,
          updatedAnswer,
        );
      }
      return this.advance(
        context,
        interview,
        question,
        updatedAnswer,
        existing,
      );
    }
    if (answer.processing_status !== "failed") {
      throw new InterviewStateError("Only a failed evaluation can be retried.");
    }
    await this.dependencies.repository.updateAnswer(
      context.user.id,
      context.accessToken,
      answer.id,
      { processing_status: "pending" },
    );
    return this.evaluateAndAdvance(context, interview, question, answer);
  }

  private async evaluateAndAdvance(
    context: InterviewAuthContext,
    interview: Interview,
    question: Question,
    answer: Answer,
  ) {
    try {
      const generated = await this.dependencies.aiClient.generateStructured({
        task: "answer-evaluation",
        systemPrompt: answerEvaluationSystemPrompt,
        input: [
          `Interview type: ${interview.type}`,
          `Question: ${question.text}`,
          `Expected concepts: ${question.expected_concepts.join(", ")}`,
          `Candidate answer: ${answer.transcript}`,
        ].join("\n"),
        schema: evaluationOutputSchema,
        promptVersion: EVALUATION_PROMPT_VERSION,
        schemaVersion: EVALUATION_SCHEMA_VERSION,
      });
      const delivery =
        answer.input_mode === "voice" && answer.speaking_duration_seconds
          ? calculateVoiceMetrics(
              answer.transcript,
              answer.speaking_duration_seconds,
            ).deliveryScore
          : null;
      const score = overallScore(interview.type, {
        ...generated.data.scores,
        delivery,
      });
      const evaluation = await this.dependencies.repository.upsertEvaluation(
        context.user.id,
        context.accessToken,
        {
          id: randomUUID(),
          user_id: context.user.id,
          interview_id: interview.id,
          question_id: question.id,
          answer_id: answer.id,
          overall_score: score,
          technical_score: generated.data.scores.technicalCorrectness,
          communication_score: generated.data.scores.communication,
          completeness_score: generated.data.scores.completeness,
          relevance_score: generated.data.scores.relevance,
          delivery_score: delivery,
          strengths: generated.data.strengths,
          weaknesses: generated.data.weaknesses,
          detected_concepts: generated.data.detectedConcepts,
          missing_concepts: generated.data.missingConcepts,
          improvement_tip: generated.data.improvementTip,
          example_answer: generated.data.exampleAnswer,
          provider: generated.metadata.provider,
          model: generated.metadata.model,
          prompt_version: generated.metadata.promptVersion,
          schema_version: generated.metadata.schemaVersion,
          rubric_version:
            interview.type === "technical" || interview.type === "dsa"
              ? "technical-rubric-v1"
              : "behavioral-rubric-v1",
        },
      );
      const updatedAnswer = await this.dependencies.repository.updateAnswer(
        context.user.id,
        context.accessToken,
        answer.id,
        { processing_status: "evaluated" },
      );
      return this.advance(
        context,
        interview,
        question,
        updatedAnswer,
        evaluation,
      );
    } catch (error) {
      await this.dependencies.repository.updateAnswer(
        context.user.id,
        context.accessToken,
        answer.id,
        { processing_status: "failed" },
      );
      throw processingError(error);
    }
  }

  private async advance(
    context: InterviewAuthContext,
    interview: Interview,
    question: Question,
    answer: Answer,
    evaluation: Evaluation,
  ) {
    const [questions, evaluations] = await Promise.all([
      this.dependencies.repository.listQuestions(
        context.user.id,
        context.accessToken,
        interview.id,
      ),
      this.dependencies.repository.listEvaluations(
        context.user.id,
        context.accessToken,
        interview.id,
      ),
    ]);
    const questionById = new Map(questions.map((item) => [item.id, item]));
    const adaptation = runAdaptiveEngine({
      currentDifficulty: question.difficulty,
      currentTopic: question.topic,
      latestEvaluation: {
        topic: question.topic,
        overallScore: evaluation.overall_score,
        missingConcepts: evaluation.missing_concepts,
      },
      recentEvaluations: evaluations
        .filter((item) => item.id !== evaluation.id)
        .map((item) => ({
          topic: questionById.get(item.question_id)?.topic ?? "Unknown",
          overallScore: item.overall_score,
          missingConcepts: item.missing_concepts,
        })),
      topicsAlreadyCovered: questions.map((item) => item.topic),
      targetTopics: interview.target_topics,
      questionCount: questions.length,
      questionLimit: interview.question_limit,
    });

    if (adaptation.complete) {
      const completed = await this.dependencies.repository.updateInterview(
        context.user.id,
        context.accessToken,
        interview.id,
        {
          status: "completed",
          current_difficulty: adaptation.difficulty,
          overall_score: averageScore(evaluations),
          completed_at: new Date().toISOString(),
        },
      );
      return {
        answer,
        evaluation,
        adaptation,
        nextQuestion: null,
        interview: completed,
        interviewComplete: true,
      };
    }

    const selected = selectQuestion({
      type: interview.type,
      preferredTopic: adaptation.topic,
      difficulty: adaptation.difficulty,
      usedQuestionBankIds: questions.flatMap((item) =>
        item.question_bank_id ? [item.question_bank_id] : [],
      ),
    });
    const nextQuestion = await this.dependencies.repository.insertQuestion(
      context.user.id,
      context.accessToken,
      newQuestion(
        context.user.id,
        interview,
        selected,
        questions.length + 1,
        adaptation,
      ),
    );
    const updatedInterview =
      await this.dependencies.repository.updateInterview(
        context.user.id,
        context.accessToken,
        interview.id,
        { current_difficulty: adaptation.difficulty },
      );
    return {
      answer,
      evaluation,
      adaptation,
      nextQuestion: publicQuestion(nextQuestion),
      interview: updatedInterview,
      interviewComplete: false,
    };
  }

  private async resultForExistingAnswer(
    context: InterviewAuthContext,
    interview: Interview,
    answer: Answer,
  ) {
    const evaluation =
      await this.dependencies.repository.findEvaluationByAnswer(
        context.user.id,
        context.accessToken,
        answer.id,
      );
    const questions = await this.dependencies.repository.listQuestions(
      context.user.id,
      context.accessToken,
      interview.id,
    );
    const next = questions.find(
      (question) =>
        question.sequence_number >
        (questions.find((item) => item.id === answer.question_id)
          ?.sequence_number ?? 0),
    );
    return {
      answer,
      evaluation,
      adaptation: next
        ? {
            engineVersion: interview.adaptive_engine_version,
            difficulty: next.difficulty,
            topic: next.topic,
            strategy: next.adaptation_strategy,
            focusConcepts: [],
            reason: next.adaptation_reason,
            complete: false,
          }
        : null,
      nextQuestion: next ? publicQuestion(next) : null,
      interview,
      interviewComplete: interview.status === "completed",
    };
  }

  async complete(context: InterviewAuthContext, interviewId: string) {
    const interview = await this.requireInterview(context, interviewId);
    if (interview.status !== "in_progress") {
      throw new InterviewStateError(
        "Only an interview in progress can be ended.",
      );
    }
    const evaluations = await this.dependencies.repository.listEvaluations(
      context.user.id,
      context.accessToken,
      interviewId,
    );
    if (evaluations.length === 0) {
      throw new InterviewStateError(
        "Submit at least one answer before completing the interview.",
      );
    }
    return this.dependencies.repository.updateInterview(
      context.user.id,
      context.accessToken,
      interviewId,
      {
        status: "completed",
        overall_score: averageScore(evaluations),
        completed_at: new Date().toISOString(),
      },
    );
  }

  async abandon(context: InterviewAuthContext, interviewId: string) {
    const interview = await this.requireInterview(context, interviewId);
    if (interview.status === "completed" || interview.status === "abandoned") {
      throw new InterviewStateError("This interview is already closed.");
    }
    return this.dependencies.repository.updateInterview(
      context.user.id,
      context.accessToken,
      interviewId,
      { status: "abandoned", completed_at: new Date().toISOString() },
    );
  }

  async report(context: InterviewAuthContext, interviewId: string) {
    const result = await this.get(context, interviewId);
    if (result.interview.status !== "completed") {
      throw new InterviewStateError(
        "The report is available after the interview is completed.",
      );
    }
    return result;
  }

  async delete(context: InterviewAuthContext, interviewId: string) {
    await this.requireInterview(context, interviewId);
    await this.dependencies.repository.deleteInterview(
      context.user.id,
      context.accessToken,
      interviewId,
    );
  }

  private async requireInterview(
    context: InterviewAuthContext,
    interviewId: string,
  ) {
    const interview = await this.dependencies.repository.findInterview(
      context.user.id,
      context.accessToken,
      interviewId,
    );
    if (!interview) {
      throw new InterviewNotFoundError();
    }
    return interview;
  }
}
