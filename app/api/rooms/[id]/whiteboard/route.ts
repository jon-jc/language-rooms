import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiHandler, jsonError, parseBody, requireSession } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import {
  ImagePlacement,
  MAX_ITEMS_PER_BOARD,
  StrokeData,
  strokeDataSchema,
  WhiteboardItemView,
} from "@/lib/whiteboard";
import { z } from "zod";

async function activeParticipant(roomId: string, userId: string) {
  const p = await db.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  return p?.leftAt === null ? p : null;
}

function toView(
  item: { id: string; kind: "STROKE" | "IMAGE"; data: Prisma.JsonValue; roomId: string },
  author: string,
): WhiteboardItemView {
  if (item.kind === "STROKE") {
    return { id: item.id, kind: "STROKE", author, data: item.data as unknown as StrokeData };
  }
  const d = item.data as unknown as ImagePlacement;
  return {
    id: item.id,
    kind: "IMAGE",
    author,
    data: {
      x: d.x,
      y: d.y,
      w: d.w,
      h: d.h,
      // Bytes are served through the authz'd file route; storagePath never leaves the server.
      url: `/api/rooms/${item.roomId}/whiteboard/file/${item.id}`,
    },
  };
}

/** Current board state (late joiners load this, then follow the data channel). */
export const GET = apiHandler(async (_req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;
  if (!(await activeParticipant(roomId, session.sub))) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }

  const items = await db.whiteboardItem.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
    take: MAX_ITEMS_PER_BOARD,
    include: { author: { select: { displayName: true } } },
  });

  return NextResponse.json({
    items: items.map((i) => toView(i, i.author.displayName)),
  });
});

const strokeBodySchema = z.object({ stroke: strokeDataSchema });

/** Commit a drawn stroke. */
export const POST = apiHandler(async (req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;
  if (!(await activeParticipant(roomId, session.sub))) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }

  const rl = await checkRateLimit("whiteboardDraw", session.sub);
  if (!rl.allowed) {
    return jsonError(429, "RATE_LIMITED", "Slow down a little.", {
      retryAfterSeconds: rl.retryAfterSeconds,
    });
  }

  const count = await db.whiteboardItem.count({ where: { roomId } });
  if (count >= MAX_ITEMS_PER_BOARD) {
    return jsonError(409, "BOARD_FULL", "The whiteboard is full — clear it to keep drawing.");
  }

  const body = await parseBody(req, strokeBodySchema);
  const item = await db.whiteboardItem.create({
    data: {
      roomId,
      authorId: session.sub,
      kind: "STROKE",
      data: body.stroke,
    },
    include: { author: { select: { displayName: true } } },
  });

  return NextResponse.json(
    { item: toView(item, item.author.displayName) },
    { status: 201 },
  );
});

/** Clear the board — host/moderator only, audit-logged. */
export const DELETE = apiHandler(async (_req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;
  const participant = await activeParticipant(roomId, session.sub);
  if (!participant) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }
  if (participant.role === "PARTICIPANT") {
    return jsonError(403, "FORBIDDEN", "Only the host or a moderator can clear the board.");
  }

  await db.whiteboardItem.deleteMany({ where: { roomId } });
  await audit({
    actorId: session.sub,
    action: "room.whiteboard_cleared",
    roomId,
  });

  return NextResponse.json({ ok: true });
});
