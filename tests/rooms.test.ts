import { describe, expect, it } from "vitest";
import {
  buildRoomWhere,
  capacityBounds,
  createRoomSchema,
  decideJoin,
} from "@/lib/rooms";

describe("createRoomSchema", () => {
  const valid = {
    name: "Spanish – Beginner",
    languageCode: "es",
    level: "A1",
    isVoiceOnly: false,
    isModerated: false,
  };

  it("accepts a valid room and applies the video default capacity", () => {
    const room = createRoomSchema.parse(valid);
    expect(room.capacity).toBe(12);
  });

  it("applies the voice-only default capacity", () => {
    const room = createRoomSchema.parse({ ...valid, isVoiceOnly: true });
    expect(room.capacity).toBe(20);
  });

  it("rejects capacity above the video maximum", () => {
    expect(() => createRoomSchema.parse({ ...valid, capacity: 21 })).toThrow();
  });

  it("allows larger capacity for voice-only rooms", () => {
    const room = createRoomSchema.parse({ ...valid, isVoiceOnly: true, capacity: 50 });
    expect(room.capacity).toBe(50);
  });

  it("rejects capacity below 2, unknown language, bad level", () => {
    expect(() => createRoomSchema.parse({ ...valid, capacity: 1 })).toThrow();
    expect(() => createRoomSchema.parse({ ...valid, languageCode: "xx" })).toThrow();
    expect(() => createRoomSchema.parse({ ...valid, level: "Z9" })).toThrow();
  });

  it("treats missing level as all-levels (null)", () => {
    const room = createRoomSchema.parse({ ...valid, level: undefined });
    expect(room.level).toBeNull();
  });
});

describe("capacityBounds", () => {
  it("video rooms cap at 20, voice-only at 50", () => {
    expect(capacityBounds(false).max).toBe(20);
    expect(capacityBounds(true).max).toBe(50);
  });
});

describe("buildRoomWhere", () => {
  it("always excludes taken-down rooms", () => {
    expect(buildRoomWhere({})).toMatchObject({ isTakenDown: false });
  });

  it("matches all-levels rooms when filtering by level", () => {
    const where = buildRoomWhere({ level: "B1" });
    expect(where.OR).toEqual([{ level: "B1" }, { level: null }]);
  });

  it("searches name and topic case-insensitively", () => {
    const where = buildRoomWhere({ q: "conversation" });
    expect(JSON.stringify(where)).toContain("insensitive");
  });
});

describe("decideJoin", () => {
  const openRoom = { isTakenDown: false, isLocked: false, capacity: 12 };
  const base = {
    room: openRoom,
    activeParticipantCount: 3,
    alreadyInRoom: false,
    isHost: false,
    userConsented: true,
    isBlockedFromRoom: false,
    isBanned: false,
  };

  it("admits a normal join", () => {
    expect(decideJoin(base)).toBeNull();
  });

  it("refuses missing and taken-down rooms identically", () => {
    expect(decideJoin({ ...base, room: null })).toBe("ROOM_NOT_FOUND");
    expect(decideJoin({ ...base, room: { ...openRoom, isTakenDown: true } })).toBe(
      "ROOM_NOT_FOUND",
    );
  });

  it("requires conduct consent before any join", () => {
    expect(decideJoin({ ...base, userConsented: false })).toBe("CONSENT_REQUIRED");
  });

  it("refuses banned users before anything else leaks", () => {
    expect(decideJoin({ ...base, isBanned: true })).toBe("BANNED");
  });

  it("enforces blocks", () => {
    expect(decideJoin({ ...base, isBlockedFromRoom: true })).toBe("BLOCKED");
  });

  it("enforces the lock for non-hosts but lets the host in", () => {
    const locked = { ...base, room: { ...openRoom, isLocked: true } };
    expect(decideJoin(locked)).toBe("ROOM_LOCKED");
    expect(decideJoin({ ...locked, isHost: true })).toBeNull();
  });

  it("enforces capacity", () => {
    expect(decideJoin({ ...base, activeParticipantCount: 12 })).toBe("ROOM_FULL");
  });

  it("lets an already-present user reconnect even when full or locked", () => {
    expect(
      decideJoin({
        ...base,
        alreadyInRoom: true,
        activeParticipantCount: 12,
        room: { ...openRoom, isLocked: true },
      }),
    ).toBeNull();
  });
});
