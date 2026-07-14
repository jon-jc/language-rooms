import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, jsonError, parseBody, requireSession } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { createReport } from "@/lib/abuse/reports";
import {
  MAX_FRAMES_PER_REPORT,
  parseFrameDataUrl,
  ParsedFrame,
} from "@/lib/abuse/evidence";

const reportSchema = z.object({
  targetUserId: z.string().min(1),
  roomId: z.string().min(1),
  reason: z.enum([
    "NUDITY_SEXUAL",
    "HARASSMENT",
    "HATE_SPEECH",
    "VIOLENCE_SELF_HARM",
    "SUSPECTED_UNDERAGE",
    "CHILD_SAFETY",
    "SPAM",
    "OTHER",
  ]),
  comment: z.string().trim().max(500).optional(),
  /** Client-captured frames of the target's stream (data URLs). The UI
   *  discloses this capture before submission. */
  frames: z.array(z.string().max(2_200_000)).max(MAX_FRAMES_PER_REPORT).default([]),
});

/**
 * In-room report targeting a specific participant. Captures frame(s) of the
 * target's stream plus metadata (reporter, target, room, timestamp).
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireSession();

  const rl = await checkRateLimit("report", session.sub);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many reports. Try again later.", {
      retryAfterSeconds: rl.retryAfterSeconds,
    });
  }

  const body = await parseBody(req, reportSchema);
  if (body.targetUserId === session.sub) {
    return jsonError(400, "VALIDATION_ERROR", "You cannot report yourself.");
  }

  // Both reporter and target must actually be in the room being reported.
  const [reporter, target] = await Promise.all([
    db.roomParticipant.findUnique({
      where: { roomId_userId: { roomId: body.roomId, userId: session.sub } },
    }),
    db.roomParticipant.findUnique({
      where: { roomId_userId: { roomId: body.roomId, userId: body.targetUserId } },
    }),
  ]);
  if (!reporter || reporter.leftAt !== null) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }
  if (!target) {
    return jsonError(404, "TARGET_NOT_IN_ROOM", "That participant is not in this room.");
  }

  const frames: ParsedFrame[] = [];
  for (const dataUrl of body.frames) {
    const parsed = parseFrameDataUrl(dataUrl);
    if (!parsed) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid evidence frame.");
    }
    frames.push(parsed);
  }

  const result = await createReport({
    reporterId: session.sub,
    targetUserId: body.targetUserId,
    roomId: body.roomId,
    reason: body.reason,
    comment: body.comment,
    frames,
    source: "user",
  });

  return NextResponse.json(
    { reportId: result.reportId, status: "received" },
    { status: 201 },
  );
});
