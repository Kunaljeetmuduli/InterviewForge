import { loadEnvFile } from "node:process";

import { buildApp } from "./app.js";
import { loadEnvironment } from "./config/env.js";
import { GeminiAIClient } from "./infrastructure/ai/gemini-ai-client.js";
import {
  createSupabaseAuthVerifier,
  createSupabaseJobDescriptionRepository,
  createSupabaseInterviewRepository,
  createSupabaseProfileRepository,
  createSupabaseRoadmapRepository,
  createSupabaseResumeRepository,
} from "./infrastructure/supabase.js";
import { PdfParseExtractor } from "./modules/resume/pdf-extractor.js";

try {
  loadEnvFile();
} catch (error) {
  if (
    !(error instanceof Error) ||
    !("code" in error) ||
    error.code !== "ENOENT"
  ) {
    throw error;
  }
}

const environment = loadEnvironment(process.env);
const aiClient = new GeminiAIClient({
  apiKey: environment.geminiApiKey,
  model: environment.geminiModel,
  timeoutMs: environment.aiTimeoutMs,
});
const app = buildApp({
  logger: true,
  corsOrigins: environment.corsOrigins,
  authVerifier: createSupabaseAuthVerifier(environment),
  profileRepository: createSupabaseProfileRepository(environment),
  resumeRepository: createSupabaseResumeRepository(environment),
  jobDescriptionRepository:
    createSupabaseJobDescriptionRepository(environment),
  interviewRepository: createSupabaseInterviewRepository(environment),
  roadmapRepository: createSupabaseRoadmapRepository(environment),
  pdfExtractor: new PdfParseExtractor(),
  aiClient,
  maxPdfSizeBytes: environment.maxPdfSizeMb * 1024 * 1024,
  pdfTimeoutMs: environment.aiTimeoutMs,
});

try {
  await app.listen({ port: environment.port, host: environment.host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
