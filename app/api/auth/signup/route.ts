import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, clientIp, jsonError, parseBody } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { runAgeGate } from "@/lib/age-gate";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("auth");

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(32),
  // ISO date string, e.g. "1990-04-23"
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getTime() < Date.now() &&
        d.getUTCFullYear() > 1900
      );
    }, "Invalid date of birth"),
  acceptedTerms: z.literal(true, {
    error: "You must accept the Terms of Service",
  }),
});

/**
 * Signup with mandatory age verification (18+ hard floor).
 * Neutral rejection: under-18 and locked-out attempts both return the same
 * generic response so the gate can't be probed; see docs/age-gating.md.
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const ip = clientIp(req);

  const rl = await checkRateLimit("signup", ip);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many attempts. Try again later.", {
      retryAfterSeconds: rl.retryAfterSeconds,
    });
  }

  const body = await parseBody(req, signupSchema);
  const email = body.email.trim().toLowerCase();
  const dateOfBirth = new Date(`${body.dateOfBirth}T00:00:00Z`);

  const decision = await runAgeGate({ email, ipAddress: ip, dateOfBirth });
  if (decision.outcome !== "pass") {
    // Deliberately neutral: no mention of age or of the lockout, and a
    // fixed message for both cases, so editing the DOB reveals nothing.
    return jsonError(
      403,
      "SIGNUP_UNAVAILABLE",
      "We are unable to create your account.",
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError(409, "EMAIL_TAKEN", "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(body.password);
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      displayName: body.displayName,
      ageVerification: {
        create: {
          dateOfBirth,
          ageAtVerification: decision.age,
          result: "PASSED",
          method: "dob-self-attestation",
        },
      },
    },
  });

  log.info({ userId: user.id }, "user registered (age verification passed)");
  await createSessionCookie({ sub: user.id, role: user.role });
  return NextResponse.json({ user: publicUser(user) }, { status: 201 });
});

function publicUser(u: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  conductConsentAt: Date | null;
}) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    conductConsentAt: u.conductConsentAt,
  };
}
