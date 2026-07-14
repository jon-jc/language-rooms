import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, jsonError, parseBody, requireSession } from "@/lib/api";
import { contentModerationProvider } from "@/lib/abuse/content-moderation";
import { parseFrameDataUrl } from "@/lib/abuse/evidence";
import { createReport } from "@/lib/abuse/reports";
import { logger } from "@/lib/logger";

const log = logger("frame-scan");

const frameSchema = z.object({
  roomId: z.string().min(1),
  frame: z.string().max(2_200_000),
});

/**
 * Automated content-moderation sampling hook.
 *
 * Dev topology: each publisher's client samples its *own* outgoing video
 * every ~60s and posts it here (disclosed in the consent flow). The frame is
 * scanned by the configured provider; flagged frames create an automated
 * report (with the frame as evidence) that lands in the moderation queue.
 *
 * Production topology (documented in docs/abuse-handling.md): server-side
 * sampling via LiveKit Egress feeding the same provider interface, so a
 * hostile client can't skip sampling. This endpoint stays as the ingestion
 * seam either way.
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireSession();
  const body = await parseBody(req, frameSchema);

  const participant = await db.roomParticipant.findUnique({
    where: { roomId_userId: { roomId: body.roomId, userId: session.sub } },
  });
  if (!participant || participant.leftAt !== null) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }

  const parsed = parseFrameDataUrl(body.frame);
  if (!parsed) return jsonError(400, "VALIDATION_ERROR", "Invalid frame.");

  const result = await contentModerationProvider().scanFrame(parsed.buffer);

  if (result.flagged) {
    log.warn(
      { roomId: body.roomId, userId: session.sub, categories: result.categories },
      "automated scan flagged a sampled frame",
    );
    await createReport({
      reporterId: null,
      targetUserId: session.sub,
      roomId: body.roomId,
      reason: "NUDITY_SEXUAL",
      comment: `Automated scan (${result.provider}): ${result.categories.join(", ")} score=${result.score}`,
      frames: [parsed],
      source: "automated",
    });
  }

  // The response never reveals the verdict — a probing client learns nothing.
  return NextResponse.json({ ok: true });
});
