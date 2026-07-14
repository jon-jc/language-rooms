import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, jsonError, parseBody, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
import { issueStrike } from "@/lib/abuse/reports";
import { livekitRoomService } from "@/lib/livekit";
import { logger } from "@/lib/logger";

const log = logger("admin");

const actionSchema = z.object({
  action: z.enum([
    "dismiss", // no violation found
    "warn", // strike + warning message
    "temp_ban_24h",
    "temp_ban_7d",
    "perm_ban",
    "room_takedown",
  ]),
  note: z.string().trim().max(500).optional(),
});

/**
 * Moderation-queue resolution. ADMIN or MODERATOR; permanent bans and
 * takedowns are ADMIN-only. Every resolution is audit-logged.
 *
 * Evidence handling: resolving a report never deletes evidence; ESCALATED
 * reports cannot be dismissed from the queue (legal preservation — see
 * docs/abuse-handling.md#escalation).
 */
export const POST = apiHandler(async (req: NextRequest, ctx) => {
  const session = await requireSession();
  if (session.role !== "ADMIN" && session.role !== "MODERATOR") {
    return jsonError(403, "FORBIDDEN", "Staff only.");
  }

  const { id: reportId } = await ctx.params;
  const body = await parseBody(req, actionSchema);

  if (
    (body.action === "perm_ban" || body.action === "room_takedown") &&
    session.role !== "ADMIN"
  ) {
    return jsonError(403, "FORBIDDEN", "Only admins can take that action.");
  }

  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) return jsonError(404, "NOT_FOUND", "Report not found.");
  if (report.status === "RESOLVED_ACTIONED" || report.status === "RESOLVED_DISMISSED") {
    return jsonError(409, "ALREADY_RESOLVED", "This report is already resolved.");
  }
  if (report.status === "ESCALATED" && body.action === "dismiss") {
    return jsonError(
      409,
      "ESCALATED_LOCKED",
      "Escalated reports are preservation-locked and cannot be dismissed here.",
    );
  }

  const now = new Date();

  switch (body.action) {
    case "dismiss":
      break;
    case "warn":
      await issueStrike({
        userId: report.targetUserId,
        reason: `report ${report.id} actioned: warn`,
        reportId: report.id,
        issuedById: session.sub,
      });
      break;
    case "temp_ban_24h":
    case "temp_ban_7d": {
      const hours = body.action === "temp_ban_24h" ? 24 : 7 * 24;
      await issueStrike({
        userId: report.targetUserId,
        reason: `report ${report.id} actioned: temp ban ${hours}h`,
        reportId: report.id,
        issuedById: session.sub,
      });
      await db.user.update({
        where: { id: report.targetUserId },
        data: {
          status: "TEMP_BANNED",
          bannedUntil: new Date(now.getTime() + hours * 3_600_000),
        },
      });
      break;
    }
    case "perm_ban":
      await issueStrike({
        userId: report.targetUserId,
        reason: `report ${report.id} actioned: permanent ban`,
        reportId: report.id,
        issuedById: session.sub,
      });
      await db.user.update({
        where: { id: report.targetUserId },
        data: { status: "PERM_BANNED", bannedUntil: null },
      });
      break;
    case "room_takedown": {
      if (!report.roomId) {
        return jsonError(400, "VALIDATION_ERROR", "This report has no room.");
      }
      await db.room.update({
        where: { id: report.roomId },
        data: { isTakenDown: true },
      });
      // Disconnect everyone still inside.
      await livekitRoomService()
        .deleteRoom(report.roomId)
        .catch((err) => log.warn({ err }, "SFU room already gone"));
      await db.roomParticipant.updateMany({
        where: { roomId: report.roomId, leftAt: null },
        data: { leftAt: now },
      });
      break;
    }
  }

  await db.report.update({
    where: { id: reportId },
    data: {
      status: body.action === "dismiss" ? "RESOLVED_DISMISSED" : "RESOLVED_ACTIONED",
      resolvedAt: now,
      resolvedById: session.sub,
      resolution: body.note ? `${body.action}: ${body.note}` : body.action,
    },
  });

  await audit({
    actorId: session.sub,
    action: `admin.report.${body.action}`,
    roomId: report.roomId ?? undefined,
    targetUserId: report.targetUserId,
    detail: { reportId, note: body.note },
  });

  return NextResponse.json({ ok: true });
});
