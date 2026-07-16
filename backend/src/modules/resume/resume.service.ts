import { randomUUID } from "node:crypto";

import { AIClientError, type AIClient } from "../../infrastructure/ai/ai.types.js";
import {
  RESUME_PROMPT_VERSION,
  RESUME_SCHEMA_VERSION,
  resumeAnalysisOutputSchema,
  resumeAnalysisSystemPrompt,
} from "../../prompts/resume-analysis/v1.js";
import type {
  Resume,
  ResumeAnalysis,
  ResumeAuthContext,
  ResumeCreateInput,
  ResumeRepository,
} from "./resume.types.js";
import {
  MAX_AI_RESUME_TEXT_LENGTH,
  MAX_RESUME_PAGES,
  MIN_RESUME_TEXT_LENGTH,
  PdfExtractionError,
  type PdfExtractor,
} from "./pdf-extractor.js";
import {
  minimizeResumeText,
  redactDirectIdentifiers,
} from "./resume-redaction.js";

export class ResumeNotFoundError extends Error {
  constructor() {
    super("The requested resume was not found.");
    this.name = "ResumeNotFoundError";
  }
}

export class ResumeStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeStateError";
  }
}

export type ResumeProcessingErrorCode =
  | "RESUME_FILE_INVALID"
  | "RESUME_PAGE_LIMIT"
  | "RESUME_PARSE_FAILED"
  | "RESUME_PARSE_TIMEOUT"
  | "RESUME_TEXT_TOO_SHORT"
  | "AI_TIMEOUT"
  | "AI_UNAVAILABLE"
  | "AI_SCHEMA_INVALID";

export class ResumeProcessingError extends Error {
  constructor(
    readonly code: ResumeProcessingErrorCode,
    message: string,
    readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResumeProcessingError";
  }
}

interface ResumeServiceDependencies {
  repository: ResumeRepository;
  pdfExtractor: PdfExtractor;
  aiClient: AIClient;
  maxPdfSizeBytes: number;
  pdfTimeoutMs: number;
}

function hasPdfSignature(data: Uint8Array): boolean {
  return Buffer.from(data.subarray(0, Math.min(data.length, 1_024))).includes(
    "%PDF-",
  );
}

function processingError(error: unknown): ResumeProcessingError {
  if (error instanceof ResumeProcessingError) {
    return error;
  }

  if (error instanceof PdfExtractionError) {
    if (error.code === "PDF_PAGE_LIMIT") {
      return new ResumeProcessingError(
        "RESUME_PAGE_LIMIT",
        `The PDF exceeds the ${MAX_RESUME_PAGES}-page limit.`,
        422,
        { cause: error },
      );
    }

    if (error.code === "PDF_TIMEOUT") {
      return new ResumeProcessingError(
        "RESUME_PARSE_TIMEOUT",
        "The PDF took too long to read. Try a simpler text-based PDF.",
        504,
        { cause: error },
      );
    }

    return new ResumeProcessingError(
      "RESUME_PARSE_FAILED",
      "We could not extract text from this PDF.",
      422,
      { cause: error },
    );
  }

  if (error instanceof AIClientError) {
    const statusCode = error.code === "AI_TIMEOUT" ? 504 : 503;
    return new ResumeProcessingError(
      error.code,
      "Resume analysis is temporarily unavailable. Try again.",
      statusCode,
      { cause: error },
    );
  }

  return new ResumeProcessingError(
    "RESUME_PARSE_FAILED",
    "We could not process this resume.",
    500,
    { cause: error },
  );
}

export class ResumeService {
  constructor(private readonly dependencies: ResumeServiceDependencies) {}

  async createResume(
    context: ResumeAuthContext,
    input: ResumeCreateInput,
  ): Promise<Resume> {
    const resumeId = randomUUID();
    const hasPrimaryResume = await this.dependencies.repository.hasPrimaryForUser(
      context.user.id,
      context.accessToken,
    );

    return this.dependencies.repository.createForUser(
      context.user.id,
      context.accessToken,
      {
        id: resumeId,
        ...input,
        storage_path: `${context.user.id}/${resumeId}.pdf`,
        status: "pending",
        processing_stage: null,
        processing_attempt: 0,
        error_code: null,
        error_message: null,
        is_primary: !hasPrimaryResume,
      },
    );
  }

  listResumes(context: ResumeAuthContext): Promise<Resume[]> {
    return this.dependencies.repository.listForUser(
      context.user.id,
      context.accessToken,
    );
  }

  async getResume(
    context: ResumeAuthContext,
    resumeId: string,
  ): Promise<Resume> {
    const resume = await this.dependencies.repository.findByIdForUser(
      context.user.id,
      context.accessToken,
      resumeId,
    );

    if (!resume) {
      throw new ResumeNotFoundError();
    }

    return resume;
  }

  findAnalysis(
    context: ResumeAuthContext,
    resumeId: string,
  ): Promise<ResumeAnalysis | null> {
    return this.dependencies.repository.findAnalysisForResume(
      context.user.id,
      context.accessToken,
      resumeId,
    );
  }

  async processResume(
    context: ResumeAuthContext,
    resumeId: string,
    operation: "process" | "retry",
  ): Promise<{ resume: Resume; analysis: ResumeAnalysis }> {
    const existing = await this.getResume(context, resumeId);

    if (operation === "process" && existing.status !== "pending") {
      throw new ResumeStateError(
        "Only a pending resume can begin processing.",
      );
    }

    if (operation === "retry" && existing.status !== "failed") {
      throw new ResumeStateError("Only a failed resume can be retried.");
    }

    const started = await this.dependencies.repository.transitionForUser(
      context.user.id,
      context.accessToken,
      resumeId,
      existing.status,
      {
        status: "processing",
        processing_stage: "parsing",
        processing_attempt: existing.processing_attempt + 1,
        error_code: null,
        error_message: null,
      },
    );

    if (!started) {
      throw new ResumeStateError(
        "Resume processing has already started or its status changed.",
      );
    }

    let current = started;

    try {
      const file = await this.dependencies.repository.downloadStorageObject(
        context.accessToken,
        existing.storage_path,
      );

      if (
        file.byteLength === 0 ||
        file.byteLength > this.dependencies.maxPdfSizeBytes ||
        !hasPdfSignature(file)
      ) {
        throw new ResumeProcessingError(
          "RESUME_FILE_INVALID",
          "The uploaded file is not a valid PDF.",
          422,
        );
      }

      const extracted = await this.dependencies.pdfExtractor.extract(file, {
        maxPages: MAX_RESUME_PAGES,
        timeoutMs: this.dependencies.pdfTimeoutMs,
      });
      const extractedText = minimizeResumeText(extracted.text, 100_000);

      if (extractedText.length < MIN_RESUME_TEXT_LENGTH) {
        throw new ResumeProcessingError(
          "RESUME_TEXT_TOO_SHORT",
          "This PDF does not contain enough selectable text. Use a text-based PDF instead of a scanned document.",
          422,
        );
      }

      current = await this.dependencies.repository.updateForUser(
        context.user.id,
        context.accessToken,
        resumeId,
        {
          status: "processing",
          processing_stage: "redacting",
          processing_attempt: current.processing_attempt,
          error_code: null,
          error_message: null,
        },
      );

      const redacted = redactDirectIdentifiers(extractedText);
      const minimizedForAI = minimizeResumeText(
        redacted.text,
        MAX_AI_RESUME_TEXT_LENGTH,
      );

      current = await this.dependencies.repository.updateForUser(
        context.user.id,
        context.accessToken,
        resumeId,
        {
          status: "processing",
          processing_stage: "analyzing",
          processing_attempt: current.processing_attempt,
          error_code: null,
          error_message: null,
        },
      );

      const generated = await this.dependencies.aiClient.generateStructured({
        task: "resume-analysis",
        systemPrompt: resumeAnalysisSystemPrompt,
        input: `Analyze the resume content between the markers.\n<resume>\n${minimizedForAI}\n</resume>`,
        schema: resumeAnalysisOutputSchema,
        promptVersion: RESUME_PROMPT_VERSION,
        schemaVersion: RESUME_SCHEMA_VERSION,
        temperature: 0.1,
      });
      const analysis = await this.dependencies.repository.upsertAnalysis(
        context.user.id,
        context.accessToken,
        {
          user_id: context.user.id,
          resume_id: resumeId,
          extracted_text: extractedText,
          ...generated.data,
          provider: generated.metadata.provider,
          model: generated.metadata.model,
          prompt_version: generated.metadata.promptVersion,
          schema_version: generated.metadata.schemaVersion,
        },
      );
      const completed = await this.dependencies.repository.updateForUser(
        context.user.id,
        context.accessToken,
        resumeId,
        {
          status: "completed",
          processing_stage: "analyzing",
          processing_attempt: current.processing_attempt,
          error_code: null,
          error_message: null,
        },
      );

      return { resume: completed, analysis };
    } catch (error) {
      const safeError = processingError(error);
      await this.dependencies.repository.updateForUser(
        context.user.id,
        context.accessToken,
        resumeId,
        {
          status: "failed",
          processing_stage: current.processing_stage,
          processing_attempt: current.processing_attempt,
          error_code: safeError.code,
          error_message: safeError.message,
        },
      );
      throw safeError;
    }
  }

  async deleteResume(
    context: ResumeAuthContext,
    resumeId: string,
  ): Promise<void> {
    const resume = await this.getResume(context, resumeId);

    await this.dependencies.repository.removeStorageObject(
      context.accessToken,
      resume.storage_path,
    );
    await this.dependencies.repository.deleteForUser(
      context.user.id,
      context.accessToken,
      resume.id,
    );
  }
}
