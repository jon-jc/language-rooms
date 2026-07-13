import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger("audit");

/**
 * Immutable audit trail (AuditLog table) for every moderation-relevant
 * action: in-room host actions, admin decisions, automated enforcement.
 * Writes are also mirrored to structured logs for shipping to a SIEM.
 */
export async function audit(entry: {
  actorId: string | null; // null = automated system action
  action: string;
  roomId?: string;
  targetUserId?: string;
  detail?: Prisma.InputJsonValue;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      roomId: entry.roomId,
      targetUserId: entry.targetUserId,
      detail: entry.detail,
    },
  });
  log.info(
    {
      actorId: entry.actorId,
      action: entry.action,
      roomId: entry.roomId,
      targetUserId: entry.targetUserId,
    },
    "audit event",
  );
}
