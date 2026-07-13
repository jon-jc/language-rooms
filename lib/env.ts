import { z } from "zod";

/**
 * Environment configuration, validated once at first server-side access.
 * Fails fast with a readable error if required variables are missing,
 * instead of failing deep inside a request handler.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(16),
  LIVEKIT_HOST: z.string().url(),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1),
  CONTENT_MODERATION_PROVIDER: z.enum(["stub"]).default("stub"),
  EVIDENCE_STORAGE_DIR: z.string().default("./evidence"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
