import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, clientIp, jsonError, parseBody } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("auth");

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await parseBody(req, loginSchema);
  const email = body.email.trim().toLowerCase();
  const ip = clientIp(req);

  // Keyed by IP + email so one address can't spray one account or many.
  const rl = await checkRateLimit("login", `${ip}:${email}`);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Try again later.", {
      retryAfterSeconds: rl.retryAfterSeconds,
    });
  }

  const user = await db.user.findUnique({ where: { email } });
  // Same response for unknown email and wrong password (no user enumeration).
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return jsonError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  await createSessionCookie({ sub: user.id, role: user.role });
  log.info({ userId: user.id }, "user logged in");
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      conductConsentAt: user.conductConsentAt,
    },
  });
});
