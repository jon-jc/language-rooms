import pino from "pino";

/**
 * Structured JSON logger. Every log line carries a `module` binding so
 * production logs can be filtered per subsystem (auth, rooms, moderation…).
 */
const root = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "languagerooms" },
  redact: {
    // Never log credentials or raw tokens.
    paths: ["password", "*.password", "token", "*.token", "authorization"],
    censor: "[REDACTED]",
  },
});

export function logger(module: string) {
  return root.child({ module });
}

export default root;
