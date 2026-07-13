import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, requireSession } from "@/lib/api";
import { logger } from "@/lib/logger";

const log = logger("rooms");

/**
 * Instant leave. The client also disconnects from the SFU; this endpoint
 * makes the departure authoritative immediately instead of waiting for the
 * participant_left webhook.
 */
export const POST = apiHandler(async (_req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;

  await db.roomParticipant.updateMany({
    where: { roomId, userId: session.sub, leftAt: null },
    data: { leftAt: new Date() },
  });

  log.info({ roomId, userId: session.sub }, "participant left room");
  return NextResponse.json({ ok: true });
});
