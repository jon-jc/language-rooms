import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, jsonError, requireSession } from "@/lib/api";
import { decideJoin, type JoinRefusal } from "@/lib/rooms";
import { mintRoomToken } from "@/lib/livekit";
import { checkRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger("rooms");

/** Refusal → HTTP response. BLOCKED is intentionally presented as full. */
const REFUSALS: Record<JoinRefusal, { status: number; code: string; message: string }> = {
  ROOM_NOT_FOUND: { status: 404, code: "ROOM_NOT_FOUND", message: "Room not found." },
  ROOM_TAKEN_DOWN: { status: 404, code: "ROOM_NOT_FOUND", message: "Room not found." },
  BANNED: { status: 403, code: "ACCOUNT_RESTRICTED", message: "Your account cannot join rooms right now." },
  CONSENT_REQUIRED: { status: 403, code: "CONSENT_REQUIRED", message: "Accept the video conduct rules first." },
  BLOCKED: { status: 409, code: "ROOM_FULL", message: "This room is currently full." },
  ROOM_LOCKED: { status: 423, code: "ROOM_LOCKED", message: "This room is locked." },
  ROOM_FULL: { status: 409, code: "ROOM_FULL", message: "This room is currently full." },
  KICK_COOLDOWN: { status: 403, code: "KICK_COOLDOWN", message: "You can't rejoin this room right now." },
};

/**
 * All admission policy runs here, server-side, before an SFU token exists.
 * Returns a short-lived LiveKit token + connection URL on success.
 */
export const POST = apiHandler(async (req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;

  const [joinLimit, rejoinLimit] = await Promise.all([
    checkRateLimit("roomJoin", session.sub),
    checkRateLimit("roomRejoin", `${session.sub}:${roomId}`),
  ]);
  if (!joinLimit.allowed || !rejoinLimit.allowed) {
    return jsonError(429, "RATE_LIMITED", "You are joining rooms too quickly.", {
      retryAfterSeconds: joinLimit.retryAfterSeconds ?? rejoinLimit.retryAfterSeconds,
    });
  }

  const [user, room] = await Promise.all([
    db.user.findUnique({ where: { id: session.sub } }),
    db.room.findUnique({
      where: { id: roomId },
      include: {
        _count: { select: { participants: { where: { leftAt: null } } } },
      },
    }),
  ]);
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Sign in required");

  const existing = room
    ? await db.roomParticipant.findUnique({
        where: { roomId_userId: { roomId: room.id, userId: user.id } },
      })
    : null;

  const refusal = decideJoin({
    room,
    activeParticipantCount: room?._count.participants ?? 0,
    alreadyInRoom: existing?.leftAt === null,
    isHost: room?.createdById === user.id,
    userConsented: user.conductConsentAt !== null,
    // Block + ban enforcement is wired in M6 (see docs/abuse-handling.md).
    isBlockedFromRoom: false,
    isBanned: false,
    kickCooldownActive:
      existing?.kickedUntil != null && existing.kickedUntil > new Date(),
  });
  if (refusal) {
    const r = REFUSALS[refusal];
    log.info({ roomId, userId: user.id, refusal }, "join refused");
    return jsonError(r.status, r.code, r.message);
  }

  const role =
    room!.createdById === user.id ? "HOST" : (existing?.role ?? "PARTICIPANT");

  await db.roomParticipant.upsert({
    where: { roomId_userId: { roomId: room!.id, userId: user.id } },
    create: { roomId: room!.id, userId: user.id, role },
    update: { leftAt: null, joinedAt: new Date(), role },
  });

  const token = await mintRoomToken({
    userId: user.id,
    displayName: user.displayName,
    roomId: room!.id,
    role,
    isVoiceOnly: room!.isVoiceOnly,
    isModerated: room!.isModerated,
  });

  log.info({ roomId, userId: user.id, role }, "join admitted; token minted");
  return NextResponse.json({
    token,
    url: env().NEXT_PUBLIC_LIVEKIT_URL,
    role,
    room: {
      id: room!.id,
      name: room!.name,
      isVoiceOnly: room!.isVoiceOnly,
      isModerated: room!.isModerated,
      isLocked: room!.isLocked,
      capacity: room!.capacity,
    },
  });
});
