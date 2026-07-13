import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, jsonError, parseBody, requireSession } from "@/lib/api";

const noteSchema = z.object({
  kind: z.enum(["CORRECTION", "VOCAB", "LINK", "NOTE"]).default("NOTE"),
  text: z.string().trim().min(1).max(500),
});

/** Only active room participants can read or post support-panel notes. */
async function requireActiveParticipant(roomId: string, userId: string) {
  const participant = await db.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  return participant?.leftAt === null ? participant : null;
}

export const GET = apiHandler(async (_req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;
  if (!(await requireActiveParticipant(roomId, session.sub))) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }

  const notes = await db.roomNote.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { author: { select: { displayName: true } } },
  });

  return NextResponse.json({
    notes: notes.reverse().map((n) => ({
      id: n.id,
      kind: n.kind,
      text: n.text,
      author: n.author.displayName,
      createdAt: n.createdAt,
    })),
  });
});

export const POST = apiHandler(async (req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;
  if (!(await requireActiveParticipant(roomId, session.sub))) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }

  const body = await parseBody(req, noteSchema);
  const note = await db.roomNote.create({
    data: { roomId, authorId: session.sub, kind: body.kind, text: body.text },
    include: { author: { select: { displayName: true } } },
  });

  return NextResponse.json(
    {
      note: {
        id: note.id,
        kind: note.kind,
        text: note.text,
        author: note.author.displayName,
        createdAt: note.createdAt,
      },
    },
    { status: 201 },
  );
});
