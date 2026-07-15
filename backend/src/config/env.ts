import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().max(65_535).default(4_000),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export interface AppEnvironment {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  corsOrigins: string[];
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export function loadEnvironment(source: NodeJS.ProcessEnv): AppEnvironment {
  const environment = environmentSchema.parse(source);

  return {
    nodeEnv: environment.NODE_ENV,
    host: environment.HOST,
    port: environment.PORT,
    corsOrigins: environment.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    supabaseUrl: environment.SUPABASE_URL,
    supabasePublishableKey: environment.SUPABASE_PUBLISHABLE_KEY,
  };
}
