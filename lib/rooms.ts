import { z } from "zod";
import { Prisma } from "@prisma/client";
import { CEFR_LEVELS, LANGUAGE_CODES } from "@/lib/languages";

/**
 * Room domain rules. Pure functions and schemas live here so they are
 * unit-testable without a database (tests/rooms.test.ts).
 */

/** Capacity bounds per spec: video rooms 2–20, voice-only rooms up to 50. */
export const CAPACITY = {
  min: 2,
  maxVideo: 20,
  maxVoiceOnly: 50,
  defaultVideo: 12,
  defaultVoiceOnly: 20,
} as const;

export function capacityBounds(isVoiceOnly: boolean) {
  return {
    min: CAPACITY.min,
    max: isVoiceOnly ? CAPACITY.maxVoiceOnly : CAPACITY.maxVideo,
    default: isVoiceOnly ? CAPACITY.defaultVoiceOnly : CAPACITY.defaultVideo,
  };
}

export const createRoomSchema = z
  .object({
    name: z.string().trim().min(3).max(60),
    topic: z.string().trim().max(140).optional(),
    languageCode: z.enum(LANGUAGE_CODES as [string, ...string[]]),
    level: z.enum(CEFR_LEVELS).nullable().default(null),
    isVoiceOnly: z.boolean().default(false),
    isModerated: z.boolean().default(false),
    capacity: z.number().int().optional(),
  })
  .superRefine((room, ctx) => {
    const bounds = capacityBounds(room.isVoiceOnly);
    const cap = room.capacity ?? bounds.default;
    if (cap < bounds.min || cap > bounds.max) {
      ctx.addIssue({
        code: "custom",
        path: ["capacity"],
        message: `Capacity must be between ${bounds.min} and ${bounds.max} for ${
          room.isVoiceOnly ? "voice-only" : "video"
        } rooms`,
      });
    }
  })
  .transform((room) => ({
    ...room,
    capacity: room.capacity ?? capacityBounds(room.isVoiceOnly).default,
  }));

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const roomFilterSchema = z.object({
  language: z.enum(LANGUAGE_CODES as [string, ...string[]]).optional(),
  level: z.enum(CEFR_LEVELS).optional(),
  q: z.string().trim().max(80).optional(),
});

export type RoomFilter = z.infer<typeof roomFilterSchema>;

/** Builds the directory query; takedowns are never listed. */
export function buildRoomWhere(filter: RoomFilter): Prisma.RoomWhereInput {
  const where: Prisma.RoomWhereInput = { isTakenDown: false };
  if (filter.language) where.languageCode = filter.language;
  if (filter.level) {
    // A room with level=null welcomes all levels, so it matches any filter.
    where.OR = [{ level: filter.level }, { level: null }];
  }
  if (filter.q) {
    where.AND = [
      {
        OR: [
          { name: { contains: filter.q, mode: "insensitive" } },
          { topic: { contains: filter.q, mode: "insensitive" } },
        ],
      },
    ];
  }
  return where;
}

export type JoinRefusal =
  | "ROOM_NOT_FOUND"
  | "ROOM_TAKEN_DOWN"
  | "ROOM_LOCKED"
  | "ROOM_FULL"
  | "CONSENT_REQUIRED"
  | "BLOCKED"
  | "BANNED"
  | "KICK_COOLDOWN";

/**
 * Pure join-admission decision. `null` means admit. Order matters: the
 * checks that reveal least (not-found/taken-down) come first, and BLOCKED
 * is reported to the caller as room-full to stay neutral (docs/abuse-handling.md).
 */
export function decideJoin(input: {
  room: {
    isTakenDown: boolean;
    isLocked: boolean;
    capacity: number;
  } | null;
  activeParticipantCount: number;
  alreadyInRoom: boolean;
  isHost: boolean;
  userConsented: boolean;
  isBlockedFromRoom: boolean;
  isBanned: boolean;
  /** A host kicked this user recently (RoomParticipant.kickedUntil in the future). */
  kickCooldownActive?: boolean;
}): JoinRefusal | null {
  if (!input.room || input.room.isTakenDown) return "ROOM_NOT_FOUND";
  if (input.isBanned) return "BANNED";
  if (!input.userConsented) return "CONSENT_REQUIRED";
  if (input.isBlockedFromRoom) return "BLOCKED";
  if (input.kickCooldownActive) return "KICK_COOLDOWN";
  if (input.alreadyInRoom) return null; // rejoin/reconnect of a present user
  if (input.room.isLocked && !input.isHost) return "ROOM_LOCKED";
  if (input.activeParticipantCount >= input.room.capacity) return "ROOM_FULL";
  return null;
}
