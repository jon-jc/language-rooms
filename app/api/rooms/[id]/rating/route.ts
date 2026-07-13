import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, jsonError, parseBody, requireSession } from "@/lib/api";

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(500).optional(),
});

/** Post-session rating; only users who were actually in the room may rate. */
export const POST = apiHandler(async (req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;
  const body = await parseBody(req, ratingSchema);

  const participant = await db.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: session.sub } },
  });
  if (!participant) {
    return jsonError(403, "NOT_A_PARTICIPANT", "You haven't been in this room.");
  }

  await db.roomRating.create({
    data: {
      roomId,
      userId: session.sub,
      rating: body.rating,
      feedback: body.feedback || null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});
