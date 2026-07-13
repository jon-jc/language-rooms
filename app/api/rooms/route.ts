import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, clientIp, jsonError, parseBody, requireSession } from "@/lib/api";
import { buildRoomWhere, createRoomSchema, roomFilterSchema } from "@/lib/rooms";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("rooms");

/** Directory listing with active participant counts. */
export const GET = apiHandler(async (req: NextRequest) => {
  await requireSession();
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = roomFilterSchema.safeParse(params);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid filters");
  }

  const rooms = await db.room.findMany({
    where: buildRoomWhere(parsed.data),
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      createdBy: { select: { displayName: true } },
      _count: { select: { participants: { where: { leftAt: null } } } },
    },
  });

  return NextResponse.json({
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      topic: r.topic,
      languageCode: r.languageCode,
      level: r.level,
      isVoiceOnly: r.isVoiceOnly,
      isLocked: r.isLocked,
      isModerated: r.isModerated,
      capacity: r.capacity,
      participantCount: r._count.participants,
      host: r.createdBy.displayName,
      createdAt: r.createdAt,
    })),
  });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireSession();

  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Sign in required");
  if (!user.conductConsentAt) {
    return jsonError(403, "CONSENT_REQUIRED", "Accept the video conduct rules first.");
  }

  // Limit by user id *and* IP so neither account-cycling nor a single
  // address can spam room creation.
  const [byUser, byIp] = await Promise.all([
    checkRateLimit("roomCreate", session.sub),
    checkRateLimit("roomCreate", clientIp(req)),
  ]);
  if (!byUser.allowed || !byIp.allowed) {
    return jsonError(429, "RATE_LIMITED", "You are creating rooms too quickly.", {
      retryAfterSeconds: byUser.retryAfterSeconds ?? byIp.retryAfterSeconds,
    });
  }

  const body = await parseBody(req, createRoomSchema);
  const room = await db.room.create({
    data: {
      name: body.name,
      topic: body.topic || null,
      languageCode: body.languageCode,
      level: body.level,
      isVoiceOnly: body.isVoiceOnly,
      isModerated: body.isModerated,
      capacity: body.capacity,
      createdById: session.sub,
    },
  });

  log.info({ roomId: room.id, userId: session.sub }, "room created");
  return NextResponse.json({ room: { id: room.id } }, { status: 201 });
});
