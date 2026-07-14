import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger("rate-limit");

export interface RateLimitRule {
  /** Max operations allowed per window. */
  limit: number;
  /** Window length in seconds (fixed window). */
  windowSeconds: number;
}

/** Central registry of server-side limits (see docs/abuse-handling.md). */
export const RATE_LIMITS = {
  signup: { limit: 5, windowSeconds: 60 * 60 },
  login: { limit: 10, windowSeconds: 15 * 60 },
  roomCreate: { limit: 4, windowSeconds: 60 * 60 },
  roomJoin: { limit: 30, windowSeconds: 10 * 60 },
  // Rejoining the *same* room repeatedly (kick-evasion / scanning).
  roomRejoin: { limit: 5, windowSeconds: 10 * 60 },
  report: { limit: 10, windowSeconds: 60 * 60 },
  whiteboardDraw: { limit: 240, windowSeconds: 10 * 60 },
  whiteboardImage: { limit: 12, windowSeconds: 10 * 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/** Pure fixed-window decision — unit-testable. */
export function decideFixedWindow(state: {
  now: Date;
  rule: RateLimitRule;
  existing: { windowStart: Date; count: number } | null;
}): { allowed: boolean; newWindow: boolean; retryAfterSeconds?: number } {
  const { now, rule, existing } = state;
  const windowMs = rule.windowSeconds * 1000;
  if (!existing || now.getTime() - existing.windowStart.getTime() >= windowMs) {
    return { allowed: true, newWindow: true };
  }
  if (existing.count < rule.limit) {
    return { allowed: true, newWindow: false };
  }
  const retryAfterSeconds = Math.ceil(
    (existing.windowStart.getTime() + windowMs - now.getTime()) / 1000,
  );
  return { allowed: false, newWindow: false, retryAfterSeconds };
}

/**
 * Postgres-backed fixed-window limiter.
 *
 * Trade-off (documented in README): a fixed window with an upsert race can
 * over-admit a handful of requests under concurrency — acceptable for
 * abuse-deterrence limits. The interface (name + subject key) allows a
 * Redis/atomic implementation to be swapped in for multi-node deployments.
 */
export async function checkRateLimit(
  name: RateLimitName,
  subject: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const rule = RATE_LIMITS[name];
  const key = `${name}:${subject}`;
  const now = new Date();

  const existing = await db.rateLimitCounter.findUnique({ where: { key } });
  const decision = decideFixedWindow({ now, rule, existing });

  if (!decision.allowed) {
    log.warn({ key }, "rate limit exceeded");
    return { allowed: false, retryAfterSeconds: decision.retryAfterSeconds };
  }

  if (decision.newWindow) {
    await db.rateLimitCounter.upsert({
      where: { key },
      create: { key, windowStart: now, count: 1 },
      update: { windowStart: now, count: 1 },
    });
  } else {
    await db.rateLimitCounter.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
  }
  return { allowed: true };
}
