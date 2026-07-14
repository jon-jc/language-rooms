import type { ReportReason } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { escalateSevereReport } from "@/lib/abuse/escalation";
import {
  AUTO_THROTTLE,
  ROOM_TAKEDOWN,
  severityForReason,
  shouldAutoThrottleUser,
  shouldTakeDownRoom,
  strikePenalty,
} from "@/lib/abuse/thresholds";
import { ParsedFrame, storeFrame } from "@/lib/abuse/evidence";
import { logger } from "@/lib/logger";

const log = logger("reports");

/**
 * Creates a report (user-filed or automated), stores evidence frames,
 * escalates SEVERE reasons, and runs the automatic-enforcement evaluations
 * (repeat-target throttle, repeatedly-reported-room takedown).
 */
export async function createReport(input: {
  reporterId: string | null; // null = automated pipeline
  targetUserId: string;
  roomId?: string;
  reason: ReportReason;
  comment?: string;
  frames: ParsedFrame[];
  source: "user" | "automated";
}): Promise<{ reportId: string; severity: "NORMAL" | "SEVERE" }> {
  const severity = severityForReason(input.reason);

  const report = await db.report.create({
    data: {
      reporterId: input.reporterId,
      targetUserId: input.targetUserId,
      roomId: input.roomId,
      reason: input.reason,
      severity,
      comment: input.comment || null,
      source: input.source,
    },
  });

  for (const [index, frame] of input.frames.entries()) {
    const storagePath = await storeFrame(report.id, index, frame);
    await db.evidenceFrame.create({
      data: {
        reportId: report.id,
        storagePath,
        contentType: frame.contentType,
        sha256: frame.sha256,
      },
    });
  }

  await audit({
    actorId: input.reporterId,
    action: "report.created",
    roomId: input.roomId,
    targetUserId: input.targetUserId,
    detail: {
      reportId: report.id,
      reason: input.reason,
      severity,
      source: input.source,
      frames: input.frames.length,
    },
  });

  if (severity === "SEVERE") {
    await escalateSevereReport(report.id);
  }

  await evaluateAutoEnforcement(input.targetUserId, input.roomId);

  return { reportId: report.id, severity };
}

/** Automatic throttling of repeatedly-reported accounts and rooms. */
async function evaluateAutoEnforcement(
  targetUserId: string,
  roomId?: string,
): Promise<void> {
  const now = Date.now();

  // Repeatedly-reported account → 24h restriction pending review.
  const userWindow = new Date(now - AUTO_THROTTLE.windowHours * 3_600_000);
  const recent = await db.report.findMany({
    where: { targetUserId, createdAt: { gte: userWindow } },
    select: { reporterId: true },
  });
  const distinctReporters = new Set(
    recent.map((r) => r.reporterId ?? "automated"),
  ).size;

  if (
    shouldAutoThrottleUser({
      recentReportCount: recent.length,
      distinctReporters,
    })
  ) {
    const target = await db.user.findUnique({ where: { id: targetUserId } });
    if (target && target.status === "ACTIVE") {
      await db.user.update({
        where: { id: targetUserId },
        data: {
          status: "TEMP_BANNED",
          bannedUntil: new Date(now + AUTO_THROTTLE.restrictHours * 3_600_000),
        },
      });
      await audit({
        actorId: null,
        action: "user.auto_throttled",
        targetUserId,
        detail: { reports: recent.length, distinctReporters },
      });
      log.warn({ targetUserId }, "auto-throttled repeatedly-reported account");
    }
  }

  // Repeatedly-reported room → takedown + strike for its host.
  if (roomId) {
    const roomWindow = new Date(now - ROOM_TAKEDOWN.windowHours * 3_600_000);
    const roomReports = await db.report.findMany({
      where: { roomId, createdAt: { gte: roomWindow } },
      select: { reporterId: true },
    });
    const roomReporters = new Set(
      roomReports.map((r) => r.reporterId ?? "automated"),
    ).size;

    if (
      shouldTakeDownRoom({
        recentReportCount: roomReports.length,
        distinctReporters: roomReporters,
      })
    ) {
      const room = await db.room.findUnique({ where: { id: roomId } });
      if (room && !room.isTakenDown) {
        await db.room.update({
          where: { id: roomId },
          data: { isTakenDown: true },
        });
        await issueStrike({
          userId: room.createdById,
          reason: "host of repeatedly-reported room (automatic takedown)",
          issuedById: null,
        });
        await audit({
          actorId: null,
          action: "room.auto_takedown",
          roomId,
          targetUserId: room.createdById,
          detail: { reports: roomReports.length, distinctReporters: roomReporters },
        });
        log.warn({ roomId }, "auto-takedown of repeatedly-reported room");
      }
    }
  }
}

const STRIKE_TTL_DAYS = 90;

/**
 * Issues a strike and applies the resulting penalty from the strike ladder
 * (warn → 24h ban → 7d ban → permanent). Strikes expire after 90 days.
 */
export async function issueStrike(input: {
  userId: string;
  reason: string;
  reportId?: string;
  issuedById: string | null;
}): Promise<void> {
  const now = new Date();
  await db.strike.create({
    data: {
      userId: input.userId,
      reason: input.reason,
      reportId: input.reportId,
      issuedById: input.issuedById,
      expiresAt: new Date(now.getTime() + STRIKE_TTL_DAYS * 24 * 3_600_000),
    },
  });

  const activeStrikes = await db.strike.count({
    where: { userId: input.userId, expiresAt: { gt: now } },
  });

  const penalty = strikePenalty(activeStrikes);

  switch (penalty.kind) {
    case "warn":
      await db.userWarning.create({
        data: {
          userId: input.userId,
          message:
            "You have received a strike for violating the conduct rules. " +
            "Further violations lead to temporary and permanent bans.",
          issuedById: input.issuedById,
        },
      });
      break;
    case "temp_ban":
      await db.user.update({
        where: { id: input.userId },
        data: {
          status: "TEMP_BANNED",
          bannedUntil: new Date(now.getTime() + penalty.hours * 3_600_000),
        },
      });
      break;
    case "perm_ban":
      await db.user.update({
        where: { id: input.userId },
        data: { status: "PERM_BANNED", bannedUntil: null },
      });
      break;
    case "none":
      break;
  }

  await audit({
    actorId: input.issuedById,
    action: "user.strike_issued",
    targetUserId: input.userId,
    detail: { reason: input.reason, activeStrikes, penalty: penalty.kind },
  });
}
