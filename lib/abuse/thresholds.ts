import type { ReportReason, ReportSeverity } from "@prisma/client";

/**
 * Pure enforcement math for the abuse pipeline (docs/abuse-handling.md).
 * Kept side-effect-free and unit-tested (tests/abuse.test.ts).
 */

/** CSAM-class and suspected-minor reports are always SEVERE. */
export function severityForReason(reason: ReportReason): ReportSeverity {
  return reason === "CHILD_SAFETY" || reason === "SUSPECTED_UNDERAGE"
    ? "SEVERE"
    : "NORMAL";
}

/** Strike ladder: escalating automatic penalties as active strikes accrue. */
export type StrikePenalty =
  | { kind: "none" }
  | { kind: "warn" }
  | { kind: "temp_ban"; hours: number }
  | { kind: "perm_ban" };

export function strikePenalty(activeStrikes: number): StrikePenalty {
  if (activeStrikes <= 0) return { kind: "none" };
  if (activeStrikes === 1) return { kind: "warn" };
  if (activeStrikes === 2) return { kind: "temp_ban", hours: 24 };
  if (activeStrikes === 3) return { kind: "temp_ban", hours: 7 * 24 };
  return { kind: "perm_ban" };
}

export const AUTO_THROTTLE = {
  /** Reports within this window count toward auto-throttle. */
  windowHours: 24,
  /** Distinct reporters required (one angry user can't throttle someone). */
  minDistinctReporters: 3,
  /** Restriction applied while the queue catches up. */
  restrictHours: 24,
} as const;

/**
 * Repeatedly-reported account → automatic 24 h room-join restriction
 * pending human review. Requires distinct reporters to resist brigading
 * by a single account and weaponization.
 */
export function shouldAutoThrottleUser(input: {
  recentReportCount: number;
  distinctReporters: number;
}): boolean {
  return (
    input.recentReportCount >= AUTO_THROTTLE.minDistinctReporters &&
    input.distinctReporters >= AUTO_THROTTLE.minDistinctReporters
  );
}

export const ROOM_TAKEDOWN = {
  windowHours: 24,
  minReports: 5,
  minDistinctReporters: 3,
} as const;

/**
 * Repeatedly-reported room → automatic takedown + a strike for its host.
 * (An admin can reinstate from the moderation queue.)
 */
export function shouldTakeDownRoom(input: {
  recentReportCount: number;
  distinctReporters: number;
}): boolean {
  return (
    input.recentReportCount >= ROOM_TAKEDOWN.minReports &&
    input.distinctReporters >= ROOM_TAKEDOWN.minDistinctReporters
  );
}

/** Whether a user's stored status currently bars them from joining rooms. */
export function isBannedNow(
  user: { status: "ACTIVE" | "TEMP_BANNED" | "PERM_BANNED"; bannedUntil: Date | null },
  now: Date = new Date(),
): boolean {
  if (user.status === "PERM_BANNED") return true;
  if (user.status === "TEMP_BANNED") {
    // A temp ban with no expiry (or a future one) still binds.
    return user.bannedUntil === null || user.bannedUntil > now;
  }
  return false;
}
