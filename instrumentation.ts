/**
 * Next.js instrumentation hook — runs once at server boot.
 * Validates the environment eagerly so a misconfigured deployment fails at
 * startup with a readable error instead of on the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/lib/env");
    const { logger } = await import("@/lib/logger");
    const config = env(); // throws with per-field detail on invalid config
    logger("boot").info(
      {
        nodeEnv: config.NODE_ENV,
        livekitHost: config.LIVEKIT_HOST,
        moderationProvider: config.CONTENT_MODERATION_PROVIDER,
      },
      "environment validated; server starting",
    );
  }
}
