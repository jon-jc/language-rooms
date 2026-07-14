import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, jsonError, parseBody, requireSession } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { contentModerationProvider } from "@/lib/abuse/content-moderation";
import { createReport } from "@/lib/abuse/reports";
import { parseImageDataUrl, storeUpload } from "@/lib/uploads";
import { imageUploadSchema, MAX_ITEMS_PER_BOARD } from "@/lib/whiteboard";
import { logger } from "@/lib/logger";

const log = logger("whiteboard");

/**
 * Photo upload onto the shared whiteboard (textbook pages, menus, signs…).
 * Every upload is scanned by the content-moderation provider *before* it is
 * stored or shown; flagged uploads are refused and feed an automated report
 * into the moderation queue — same pipeline as sampled video frames.
 */
export const POST = apiHandler(async (req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;

  const participant = await db.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: session.sub } },
  });
  if (participant?.leftAt !== null) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }

  const rl = await checkRateLimit("whiteboardImage", session.sub);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many uploads. Try again shortly.", {
      retryAfterSeconds: rl.retryAfterSeconds,
    });
  }

  const count = await db.whiteboardItem.count({ where: { roomId } });
  if (count >= MAX_ITEMS_PER_BOARD) {
    return jsonError(409, "BOARD_FULL", "The whiteboard is full — clear it first.");
  }

  const body = await parseBody(req, imageUploadSchema);
  const parsed = parseImageDataUrl(body.image);
  if (!parsed) {
    return jsonError(400, "VALIDATION_ERROR", "Use a JPEG, PNG, or WebP up to 4 MB.");
  }

  const scan = await contentModerationProvider().scanFrame(parsed.buffer);
  if (scan.flagged) {
    log.warn(
      { roomId, userId: session.sub, categories: scan.categories },
      "whiteboard upload flagged by content moderation",
    );
    await createReport({
      reporterId: null,
      targetUserId: session.sub,
      roomId,
      reason: "NUDITY_SEXUAL",
      comment: `Automated scan of whiteboard upload (${scan.provider}): ${scan.categories.join(", ")} score=${scan.score}`,
      frames: [
        { buffer: parsed.buffer, contentType: "image/jpeg", sha256: parsed.sha256 },
      ],
      source: "automated",
    });
    // Deliberately vague — don't teach probing uploads what the scanner saw.
    return jsonError(422, "UPLOAD_REJECTED", "This image can't be added to the board.");
  }

  const storagePath = await storeUpload(roomId, parsed);
  const item = await db.whiteboardItem.create({
    data: {
      roomId,
      authorId: session.sub,
      kind: "IMAGE",
      data: { ...body.placement, storagePath, contentType: parsed.contentType },
    },
    include: { author: { select: { displayName: true } } },
  });

  return NextResponse.json(
    {
      item: {
        id: item.id,
        kind: "IMAGE" as const,
        author: item.author.displayName,
        data: {
          ...body.placement,
          url: `/api/rooms/${roomId}/whiteboard/file/${item.id}`,
        },
      },
    },
    { status: 201 },
  );
});
