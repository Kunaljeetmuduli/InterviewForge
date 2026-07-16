import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

import {
  AIClientError,
  type AIClient,
  type AIMetadata,
} from "./ai.types.js";

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [250, 750] as const;

interface GeminiAIClientOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (error instanceof Error && /timed?\s*out|timeout/i.test(error.message));
}

function withoutSchemaDeclaration(schema: z.core.JSONSchema.JSONSchema) {
  const jsonSchema = { ...schema } as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

export class GeminiAIClient implements AIClient {
  private readonly client: GoogleGenAI;

  constructor(private readonly options: GeminiAIClientOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
  }

  async generateStructured<T>(request: {
    task: string;
    systemPrompt: string;
    input: string;
    schema: z.ZodType<T>;
    promptVersion: string;
    schemaVersion: string;
    temperature?: number;
  }): Promise<{ data: T; metadata: AIMetadata }> {
    const startedAt = performance.now();
    let schemaRetryUsed = false;
    let transientAttempt = 0;

    while (true) {
      try {
        const response = await this.client.models.generateContent({
          model: this.options.model,
          contents: request.input,
          config: {
            systemInstruction: schemaRetryUsed
              ? `${request.systemPrompt}\nReturn JSON that exactly matches the supplied schema. Do not add fields.`
              : request.systemPrompt,
            temperature: request.temperature ?? 0.1,
            maxOutputTokens: 4_096,
            responseMimeType: "application/json",
            responseJsonSchema: withoutSchemaDeclaration(
              z.toJSONSchema(request.schema),
            ),
            httpOptions: {
              timeout: this.options.timeoutMs,
              retryOptions: { attempts: 1 },
            },
          },
        });

        if (!response.text) {
          throw new AIClientError(
            "AI_SCHEMA_INVALID",
            "The AI provider returned an empty response.",
          );
        }

        try {
          const data = request.schema.parse(JSON.parse(response.text));
          const usage = response.usageMetadata;

          return {
            data,
            metadata: {
              provider: "google-gemini",
              model: response.modelVersion ?? this.options.model,
              promptVersion: request.promptVersion,
              schemaVersion: request.schemaVersion,
              latencyMs: Math.round(performance.now() - startedAt),
              ...(usage
                ? {
                    usage: {
                      ...(usage.promptTokenCount === undefined
                        ? {}
                        : { inputTokens: usage.promptTokenCount }),
                      ...(usage.candidatesTokenCount === undefined
                        ? {}
                        : { outputTokens: usage.candidatesTokenCount }),
                    },
                  }
                : {}),
            },
          };
        } catch (error) {
          if (!schemaRetryUsed) {
            schemaRetryUsed = true;
            continue;
          }

          throw new AIClientError(
            "AI_SCHEMA_INVALID",
            "The AI provider response did not match the required schema.",
            { cause: error },
          );
        }
      } catch (error) {
        if (error instanceof AIClientError) {
          throw error;
        }

        if (
          error instanceof ApiError &&
          TRANSIENT_STATUSES.has(error.status) &&
          transientAttempt < RETRY_DELAYS_MS.length
        ) {
          await wait(RETRY_DELAYS_MS[transientAttempt] ?? 750);
          transientAttempt += 1;
          continue;
        }

        if (isTimeout(error)) {
          throw new AIClientError(
            "AI_TIMEOUT",
            "The AI provider request timed out.",
            { cause: error },
          );
        }

        throw new AIClientError(
          "AI_UNAVAILABLE",
          "The AI provider request failed.",
          { cause: error },
        );
      }
    }
  }
}
