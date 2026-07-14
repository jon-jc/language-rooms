import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { apiHandler, jsonError, requireSession } from "@/lib/api";

/** Serves whiteboard image bytes to room participants only. */
export const GET = apiHandler(async (_req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId, itemId } = await ctx.params;

  const participant = await db.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: session.sub } },
  });
  // Any past participant may load history they were shown; strangers may not.
  if (!participant) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }

  const item = await db.whiteboardItem.findUnique({ where: { id: itemId } });
  if (!item || item.roomId !== roomId || item.kind !== "IMAGE") {
    return jsonError(404, "NOT_FOUND", "Not found.");
  }

  const data = item.data as { storagePath?: string; contentType?: string };
  if (!data.storagePath) return jsonError(404, "NOT_FOUND", "Not found.");

  let bytes: Buffer;
  try {
    bytes = await readFile(data.storagePath);
  } catch {
    return jsonError(410, "GONE", "This image is no longer available.");
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": data.contentType ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
});
