import type { z } from "zod";

export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIMetadata {
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  latencyMs: number;
  usage?: AIUsage;
}

export interface AIClient {
  generateStructured<T>(request: {
    task: string;
    systemPrompt: string;
    input: string;
    schema: z.ZodType<T>;
    promptVersion: string;
    schemaVersion: string;
    temperature?: number;
  }): Promise<{ data: T; metadata: AIMetadata }>;
}

export type AIClientErrorCode =
  | "AI_TIMEOUT"
  | "AI_UNAVAILABLE"
  | "AI_SCHEMA_INVALID";

export class AIClientError extends Error {
  constructor(
    readonly code: AIClientErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AIClientError";
  }
}
