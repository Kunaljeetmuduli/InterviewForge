import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

interface GenerateContentRequest {
  config: Record<string, unknown>;
}

const generateContent = vi.hoisted(() =>
  vi.fn<(request: GenerateContentRequest) => Promise<unknown>>(),
);

vi.mock("@google/genai", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(options: { message: string; status: number }) {
      super(options.message);
      this.status = options.status;
    }
  },
  GoogleGenAI: class GoogleGenAI {
    models = { generateContent };
  },
}));

import { ApiError } from "@google/genai";

import {
  GeminiAIClient,
  toGeminiResponseSchema,
} from "../src/infrastructure/ai/gemini-ai-client.js";
import { jdExtractionOutputSchema } from "../src/prompts/jd-analysis/v1.js";
import { resumeAnalysisOutputSchema } from "../src/prompts/resume-analysis/v1.js";

const schema = z.object({ summary: z.string().min(1) });
const removedProviderKeywords = [
  "$schema",
  "additionalProperties",
  "maximum",
  "maxItems",
  "maxLength",
  "minimum",
  "minItems",
  "minLength",
] as const;

function client() {
  return new GeminiAIClient({
    apiKey: "test-key",
    model: "test-model",
    timeoutMs: 1_000,
  });
}

beforeEach(() => {
  generateContent.mockReset();
});

describe("GeminiAIClient", () => {
  it("retries one malformed structured response and records metadata", async () => {
    generateContent
      .mockResolvedValueOnce({ text: '{"summary": 10}' })
      .mockResolvedValueOnce({
        text: '{"summary":"Backend engineer"}',
        modelVersion: "resolved-model",
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4 },
      });

    const result = await client().generateStructured({
      task: "test",
      systemPrompt: "Return structured data.",
      input: "source",
      schema,
      promptVersion: "prompt-v1",
      schemaVersion: "schema-v1",
    });

    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[0]?.[0].config).not.toHaveProperty(
      "temperature",
    );
    expect(result).toMatchObject({
      data: { summary: "Backend engineer" },
      metadata: {
        provider: "google-gemini",
        model: "resolved-model",
        promptVersion: "prompt-v1",
        schemaVersion: "schema-v1",
        usage: { inputTokens: 12, outputTokens: 4 },
      },
    });
  });

  it("returns a stable schema error after the validation retry fails", async () => {
    generateContent.mockResolvedValue({ text: "not-json" });

    await expect(
      client().generateStructured({
        task: "test",
        systemPrompt: "Return structured data.",
        input: "source",
        schema,
        promptVersion: "prompt-v1",
        schemaVersion: "schema-v1",
      }),
    ).rejects.toMatchObject({ code: "AI_SCHEMA_INVALID" });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("maps provider timeouts to a stable retryable error", async () => {
    generateContent.mockRejectedValue(new Error("request timed out"));

    await expect(
      client().generateStructured({
        task: "test",
        systemPrompt: "Return structured data.",
        input: "source",
        schema,
        promptVersion: "prompt-v1",
        schemaVersion: "schema-v1",
      }),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
  });

  it("maps a provider schema rejection to a stable schema error", async () => {
    generateContent.mockRejectedValue(
      new ApiError({ message: "Invalid schema.", status: 400 }),
    );

    await expect(
      client().generateStructured({
        task: "test",
        systemPrompt: "Return structured data.",
        input: "source",
        schema,
        promptVersion: "prompt-v1",
        schemaVersion: "schema-v1",
      }),
    ).rejects.toMatchObject({ code: "AI_SCHEMA_INVALID" });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["resume", resumeAnalysisOutputSchema],
    ["job-description", jdExtractionOutputSchema],
  ])(
    "creates a provider-safe structural schema for %s analysis",
    (_task, outputSchema) => {
      const providerSchema = toGeminiResponseSchema(
        z.toJSONSchema(outputSchema),
      );
      const serialized = JSON.stringify(providerSchema);

      expect(providerSchema.type).toBe("object");
      expect(providerSchema.properties).toBeTypeOf("object");
      expect(Array.isArray(providerSchema.required)).toBe(true);
      for (const keyword of removedProviderKeywords) {
        expect(serialized).not.toContain(`"${keyword}"`);
      }
    },
  );
});
