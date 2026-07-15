import { loadEnvFile } from "node:process";

import { buildApp } from "./app.js";
import { loadEnvironment } from "./config/env.js";
import {
  createSupabaseAuthVerifier,
  createSupabaseProfileRepository,
} from "./infrastructure/supabase.js";

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
const app = buildApp({
  logger: true,
  corsOrigins: environment.corsOrigins,
  authVerifier: createSupabaseAuthVerifier(environment),
  profileRepository: createSupabaseProfileRepository(environment),
});

try {
  await app.listen({ port: environment.port, host: environment.host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
