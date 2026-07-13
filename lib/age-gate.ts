import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Age gate — see docs/age-gating.md.
 *
 * Hard platform floor: 18. This is not configurable; there is deliberately
 * no constant a deployer can lower.
 */
export const MINIMUM_AGE = 18;

/** A rejected DOB locks the email from re-attempting signup for this long. */
export const EMAIL_LOCK_DAYS = 30;
/** Failed attempts from one IP inside 24h before all signups from it are blocked. */
export const IP_MAX_FAILURES_PER_DAY = 3;

const log = logger("age-gate");

/**
 * Calendar-accurate age calculation (handles "birthday hasn't happened yet
 * this year" and Feb-29 birthdays, which count as Mar 1 in non-leap years).
 * Uses UTC date parts so the result doesn't depend on server timezone.
 */
export function calculateAge(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age--;
  }
  return age;
}

export type AgeGateDecision =
  | { outcome: "pass"; age: number }
  | { outcome: "underage"; age: number }
  | { outcome: "locked" };

/**
 * Pure decision function (unit-tested without a database).
 *
 * `locked` is returned when this email already has a rejected attempt in the
 * lock window, or the IP has exhausted its failure budget — regardless of the
 * DOB submitted now. This is what prevents "edit the DOB and retry".
 */
export function evaluateAgeGate(input: {
  dateOfBirth: Date;
  now: Date;
  emailHasRecentFailure: boolean;
  ipFailureCount: number;
}): AgeGateDecision {
  if (input.emailHasRecentFailure) return { outcome: "locked" };
  if (input.ipFailureCount >= IP_MAX_FAILURES_PER_DAY) {
    return { outcome: "locked" };
  }
  const age = calculateAge(input.dateOfBirth, input.now);
  if (age < MINIMUM_AGE) return { outcome: "underage", age };
  return { outcome: "pass", age };
}

/** Emails are stored hashed in attempt records (privacy: failed signups never become users). */
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * DB-backed gate check for a signup attempt. Records FAILED attempts so
 * subsequent attempts from the same email/IP are locked out.
 */
export async function runAgeGate(params: {
  email: string;
  ipAddress: string;
  dateOfBirth: Date;
  now?: Date;
}): Promise<AgeGateDecision> {
  const now = params.now ?? new Date();
  const emailHash = hashEmail(params.email);

  const emailLockCutoff = new Date(
    now.getTime() - EMAIL_LOCK_DAYS * 24 * 60 * 60 * 1000,
  );
  const ipCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [emailFailure, ipFailures] = await Promise.all([
    db.ageGateAttempt.findFirst({
      where: {
        emailHash,
        result: "FAILED",
        createdAt: { gte: emailLockCutoff },
      },
      select: { id: true },
    }),
    db.ageGateAttempt.count({
      where: {
        ipAddress: params.ipAddress,
        result: "FAILED",
        createdAt: { gte: ipCutoff },
      },
    }),
  ]);

  const decision = evaluateAgeGate({
    dateOfBirth: params.dateOfBirth,
    now,
    emailHasRecentFailure: emailFailure !== null,
    ipFailureCount: ipFailures,
  });

  if (decision.outcome === "underage") {
    await db.ageGateAttempt.create({
      data: { emailHash, ipAddress: params.ipAddress, result: "FAILED" },
    });
    log.warn(
      { emailHash, ip: params.ipAddress },
      "age gate rejected signup; attempt recorded",
    );
  } else if (decision.outcome === "pass") {
    await db.ageGateAttempt.create({
      data: { emailHash, ipAddress: params.ipAddress, result: "PASSED" },
    });
  } else {
    log.warn(
      { emailHash, ip: params.ipAddress },
      "age gate lockout hit (prior rejected attempt)",
    );
  }

  return decision;
}
