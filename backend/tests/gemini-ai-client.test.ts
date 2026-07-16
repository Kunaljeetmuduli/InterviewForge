import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const generateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status = 500) {
      super("API error");
      this.status = status;
    }
  },
  GoogleGenAI: class GoogleGenAI {
    models = { generateContent };
  },
}));

import { GeminiAIClient } from "../src/infrastructure/ai/gemini-ai-client.js";

const schema = z.object({ summary: z.string().min(1) });

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
});
