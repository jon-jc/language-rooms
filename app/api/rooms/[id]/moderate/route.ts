import { NextRequest, NextResponse } from "next/server";
import { TrackSource } from "livekit-server-sdk";
import { db } from "@/lib/db";
import { apiHandler, jsonError, parseBody, requireSession } from "@/lib/api";
import {
  canModerate,
  KICK_COOLDOWN_MINUTES,
  moderateActionSchema,
} from "@/lib/moderation";
import { grantsForParticipant, livekitRoomService } from "@/lib/livekit";
import { capacityBounds } from "@/lib/rooms";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";

const log = logger("moderate");

/**
 * In-room host/moderator powers: mute, kick (with rejoin cooldown), promote
 * to room moderator, lock/unlock, set capacity, grant/revoke speaking in
 * moderated rooms. Every action is authorized against the actor's *stored*
 * room role and written to the audit log.
 */
export const POST = apiHandler(async (req: NextRequest, ctx) => {
  const session = await requireSession();
  const { id: roomId } = await ctx.params;
  const body = await parseBody(req, moderateActionSchema);

  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room || room.isTakenDown) {
    return jsonError(404, "ROOM_NOT_FOUND", "Room not found.");
  }

  const actor = await db.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: session.sub } },
  });
  const actorRole = actor?.leftAt === null ? actor.role : null;
  if (!actorRole) {
    return jsonError(403, "NOT_IN_ROOM", "You are not in this room.");
  }

  const targetUserId = "targetUserId" in body ? body.targetUserId : undefined;
  const target = targetUserId
    ? await db.roomParticipant.findUnique({
        where: { roomId_userId: { roomId, userId: targetUserId } },
      })
    : null;
  if (targetUserId && (!target || target.leftAt !== null)) {
    return jsonError(404, "TARGET_NOT_IN_ROOM", "That participant is not in the room.");
  }

  if (
    !canModerate({
      actorRole,
      action: body.action,
      targetRole: target?.role,
      actorIsTarget: targetUserId === session.sub,
    })
  ) {
    return jsonError(403, "FORBIDDEN", "You cannot perform this action.");
  }

  const svc = livekitRoomService();

  switch (body.action) {
    case "mute": {
      // Server-side mute of every published audio track — not a client hint.
      const participant = await svc.getParticipant(roomId, body.targetUserId);
      const audioTracks = participant.tracks.filter(
        (t) => t.source === TrackSource.MICROPHONE,
      );
      await Promise.all(
        audioTracks.map((t) => svc.mutePublishedTrack(roomId, body.targetUserId, t.sid, true)),
      );
      break;
    }
    case "kick": {
      const kickedUntil = new Date(Date.now() + KICK_COOLDOWN_MINUTES * 60_000);
      await db.roomParticipant.update({
        where: { roomId_userId: { roomId, userId: body.targetUserId } },
        data: { leftAt: new Date(), kickedUntil },
      });
      await svc.removeParticipant(roomId, body.targetUserId).catch((err) => {
        // Row already updated; the SFU may have seen them disconnect first.
        log.warn({ err, roomId }, "removeParticipant race (already gone)");
      });
      break;
    }
    case "promote": {
      await db.roomParticipant.update({
        where: { roomId_userId: { roomId, userId: body.targetUserId } },
        data: { role: "MODERATOR" },
      });
      // Moderators keep full publish rights even in moderated rooms.
      await svc.updateParticipant(roomId, body.targetUserId, undefined, {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      break;
    }
    case "grantSpeak":
    case "revokeSpeak": {
      const speaking = body.action === "grantSpeak";
      const grants = grantsForParticipant({
        roomId,
        role: target!.role,
        isVoiceOnly: room.isVoiceOnly,
        isModerated: room.isModerated,
      });
      await svc.updateParticipant(roomId, body.targetUserId, undefined, {
        canPublish: speaking,
        canPublishSources: grants.canPublishSources,
        canSubscribe: true,
        canPublishData: true,
      });
      break;
    }
    case "lock":
    case "unlock": {
      await db.room.update({
        where: { id: roomId },
        data: { isLocked: body.action === "lock" },
      });
      break;
    }
    case "setCapacity": {
      const bounds = capacityBounds(room.isVoiceOnly);
      if (body.capacity < bounds.min || body.capacity > bounds.max) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          `Capacity must be between ${bounds.min} and ${bounds.max} for this room type.`,
        );
      }
      await db.room.update({
        where: { id: roomId },
        data: { capacity: body.capacity },
      });
      break;
    }
  }

  await audit({
    actorId: session.sub,
    action: `room.${body.action}`,
    roomId,
    targetUserId,
    detail: "capacity" in body ? { capacity: body.capacity } : undefined,
  });

  return NextResponse.json({ ok: true });
});
