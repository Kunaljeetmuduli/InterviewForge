import { randomUUID } from "node:crypto";

import { AIClientError, type AIClient } from "../../infrastructure/ai/ai.types.js";
import {
  JD_PROMPT_VERSION,
  JD_SCHEMA_VERSION,
  jdAnalysisSystemPrompt,
  jdExtractionOutputSchema,
} from "../../prompts/jd-analysis/v1.js";
import { minimizeResumeText, redactDirectIdentifiers } from "../resume/resume-redaction.js";
import type {
  ResumeAnalysis,
  ResumeRepository,
} from "../resume/resume.types.js";
import {
  calculateJDAlignment,
  JD_ALIGNMENT_ALGORITHM_VERSION,
} from "./jd-alignment.js";
import type {
  JobDescription,
  JobDescriptionAnalysis,
  JobDescriptionAuthContext,
  JobDescriptionCreateInput,
  JobDescriptionRepository,
} from "./job-description.types.js";

export class JobDescriptionNotFoundError extends Error {
  constructor() {
    super("The requested job description was not found.");
    this.name = "JobDescriptionNotFoundError";
  }
}

export class JobDescriptionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobDescriptionStateError";
  }
}

export class JobDescriptionProcessingError extends Error {
  constructor(
    readonly code: "AI_TIMEOUT" | "AI_UNAVAILABLE" | "AI_SCHEMA_INVALID" | "JD_ANALYSIS_FAILED",
    message: string,
    readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "JobDescriptionProcessingError";
  }
}

interface JobDescriptionServiceDependencies {
  repository: JobDescriptionRepository;
  resumeRepository: ResumeRepository;
  aiClient: AIClient;
}

function safeProcessingError(error: unknown) {
  if (error instanceof JobDescriptionProcessingError) {
    return error;
  }

  if (error instanceof AIClientError) {
    return new JobDescriptionProcessingError(
      error.code,
      "Job-description analysis is temporarily unavailable. Try again.",
      error.code === "AI_TIMEOUT" ? 504 : 503,
      { cause: error },
    );
  }

  return new JobDescriptionProcessingError(
    "JD_ANALYSIS_FAILED",
    "We could not analyze this job description.",
    500,
    { cause: error },
  );
}

export class JobDescriptionService {
  constructor(private readonly dependencies: JobDescriptionServiceDependencies) {}

  list(context: JobDescriptionAuthContext) {
    return this.dependencies.repository.listForUser(
      context.user.id,
      context.accessToken,
    );
  }

  async get(context: JobDescriptionAuthContext, jobDescriptionId: string) {
    const jobDescription = await this.dependencies.repository.findByIdForUser(
      context.user.id,
      context.accessToken,
      jobDescriptionId,
    );

    if (!jobDescription) {
      throw new JobDescriptionNotFoundError();
    }

    const analysis =
      await this.dependencies.repository.findAnalysisForJobDescription(
        context.user.id,
        context.accessToken,
        jobDescriptionId,
      );
    return { jobDescription, analysis };
  }

  async createAndAnalyze(
    context: JobDescriptionAuthContext,
    input: JobDescriptionCreateInput,
  ) {
    const resumeAnalysis = await this.requireCompletedResume(
      context,
      input.resume_id,
    );

    const created = await this.dependencies.repository.createForUser(
      context.user.id,
      context.accessToken,
      {
        id: randomUUID(),
        title: input.title,
        company: input.company?.trim() || null,
        raw_text: input.raw_text,
        status: "pending",
        error_code: null,
        error_message: null,
      },
    );

    return this.analyze(context, created, resumeAnalysis, "pending");
  }

  private async requireCompletedResume(
    context: JobDescriptionAuthContext,
    resumeId: string,
  ) {
    const resume = await this.dependencies.resumeRepository.findByIdForUser(
      context.user.id,
      context.accessToken,
      resumeId,
    );
    const analysis =
      await this.dependencies.resumeRepository.findAnalysisForResume(
        context.user.id,
        context.accessToken,
        resumeId,
      );

    if (!resume || resume.status !== "completed" || !analysis) {
      throw new JobDescriptionStateError(
        "Select a completed resume analysis before analyzing a job description.",
      );
    }

    return analysis;
  }

  async retry(
    context: JobDescriptionAuthContext,
    jobDescriptionId: string,
    resumeId: string,
  ) {
    const existing = await this.dependencies.repository.findByIdForUser(
      context.user.id,
      context.accessToken,
      jobDescriptionId,
    );

    if (!existing) {
      throw new JobDescriptionNotFoundError();
    }

    if (existing.status !== "failed") {
      throw new JobDescriptionStateError(
        "Only a failed job description can be retried.",
      );
    }

    const resumeAnalysis = await this.requireCompletedResume(context, resumeId);
    return this.analyze(context, existing, resumeAnalysis, "failed");
  }

  private async analyze(
    context: JobDescriptionAuthContext,
    jobDescription: JobDescription,
    resumeAnalysis: ResumeAnalysis,
    expectedStatus: JobDescription["status"],
  ): Promise<{
    jobDescription: JobDescription;
    analysis: JobDescriptionAnalysis;
  }> {
    try {
      const started = await this.dependencies.repository.transitionForUser(
        context.user.id,
        context.accessToken,
        jobDescription.id,
        expectedStatus,
        { status: "analyzing", error_code: null, error_message: null },
      );

      if (!started) {
        throw new JobDescriptionStateError(
          "Job-description analysis has already started or its status changed.",
        );
      }

      const redacted = redactDirectIdentifiers(jobDescription.raw_text);
      const input = minimizeResumeText(redacted.text, 30_000);
      const generated = await this.dependencies.aiClient.generateStructured({
        task: "jd-analysis",
        systemPrompt: jdAnalysisSystemPrompt,
        input: `Analyze the job description between the markers.\n<job_description>\n${input}\n</job_description>`,
        schema: jdExtractionOutputSchema,
        promptVersion: JD_PROMPT_VERSION,
        schemaVersion: JD_SCHEMA_VERSION,
        temperature: 0.1,
      });
      const alignment = calculateJDAlignment(generated.data, resumeAnalysis);
      const analysis = await this.dependencies.repository.upsertAnalysis(
        context.user.id,
        context.accessToken,
        {
          user_id: context.user.id,
          job_description_id: jobDescription.id,
          required_skills: generated.data.required_skills,
          preferred_skills: generated.data.preferred_skills,
          minimum_experience: generated.data.minimum_experience,
          responsibilities: generated.data.responsibilities,
          keywords: generated.data.keywords,
          matching_skills: alignment.matchingSkills,
          missing_skills: alignment.missingSkills,
          alignment_score: alignment.score,
          alignment_algorithm_version: JD_ALIGNMENT_ALGORITHM_VERSION,
          provider: generated.metadata.provider,
          model: generated.metadata.model,
          prompt_version: generated.metadata.promptVersion,
          schema_version: generated.metadata.schemaVersion,
        },
      );
      const completed = await this.dependencies.repository.updateForUser(
        context.user.id,
        context.accessToken,
        jobDescription.id,
        { status: "completed", error_code: null, error_message: null },
      );

      return { jobDescription: completed, analysis };
    } catch (error) {
      if (error instanceof JobDescriptionStateError) {
        throw error;
      }

      const safeError = safeProcessingError(error);
      await this.dependencies.repository.updateForUser(
        context.user.id,
        context.accessToken,
        jobDescription.id,
        {
          status: "failed",
          error_code: safeError.code,
          error_message: safeError.message,
        },
      );
      throw safeError;
    }
  }

  async delete(context: JobDescriptionAuthContext, jobDescriptionId: string) {
    await this.get(context, jobDescriptionId);
    await this.dependencies.repository.deleteForUser(
      context.user.id,
      context.accessToken,
      jobDescriptionId,
    );
  }
}
