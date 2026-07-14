import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, jsonError, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";

/** Block a user: never share a room again; streams mutually hidden. */
export const POST = apiHandler(async (_req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: blockedId } = await ctx.params;

  if (blockedId === session.sub) {
    return jsonError(400, "VALIDATION_ERROR", "You cannot block yourself.");
  }
  const target = await db.user.findUnique({ where: { id: blockedId } });
  if (!target) return jsonError(404, "USER_NOT_FOUND", "User not found.");

  await db.block.upsert({
    where: { blockerId_blockedId: { blockerId: session.sub, blockedId } },
    create: { blockerId: session.sub, blockedId },
    update: {},
  });

  await audit({
    actorId: session.sub,
    action: "user.blocked",
    targetUserId: blockedId,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});

export const DELETE = apiHandler(async (_req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: blockedId } = await ctx.params;

  await db.block.deleteMany({
    where: { blockerId: session.sub, blockedId },
  });

  await audit({
    actorId: session.sub,
    action: "user.unblocked",
    targetUserId: blockedId,
  });

  return NextResponse.json({ ok: true });
});
