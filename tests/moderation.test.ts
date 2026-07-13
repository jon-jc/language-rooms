import { describe, expect, it } from "vitest";
import { canModerate, moderateActionSchema } from "@/lib/moderation";
import { decideJoin } from "@/lib/rooms";

describe("canModerate", () => {
  it("participants can moderate nothing", () => {
    for (const action of ["mute", "kick", "lock", "promote", "setCapacity"] as const) {
      expect(canModerate({ actorRole: "PARTICIPANT", action })).toBe(false);
    }
  });

  it("hosts can do everything to others", () => {
    for (const action of ["mute", "kick", "promote", "lock", "unlock", "setCapacity", "grantSpeak", "revokeSpeak"] as const) {
      expect(
        canModerate({ actorRole: "HOST", action, targetRole: "PARTICIPANT" }),
      ).toBe(true);
    }
  });

  it("moderators can handle participants but not change room structure", () => {
    expect(canModerate({ actorRole: "MODERATOR", action: "mute", targetRole: "PARTICIPANT" })).toBe(true);
    expect(canModerate({ actorRole: "MODERATOR", action: "kick", targetRole: "PARTICIPANT" })).toBe(true);
    expect(canModerate({ actorRole: "MODERATOR", action: "lock" })).toBe(false);
    expect(canModerate({ actorRole: "MODERATOR", action: "setCapacity" })).toBe(false);
    expect(canModerate({ actorRole: "MODERATOR", action: "promote", targetRole: "PARTICIPANT" })).toBe(false);
  });

  it("moderators cannot act on the host or other moderators", () => {
    expect(canModerate({ actorRole: "MODERATOR", action: "kick", targetRole: "HOST" })).toBe(false);
    expect(canModerate({ actorRole: "MODERATOR", action: "mute", targetRole: "MODERATOR" })).toBe(false);
  });

  it("nobody can target themselves", () => {
    expect(
      canModerate({ actorRole: "HOST", action: "kick", targetRole: "HOST", actorIsTarget: true }),
    ).toBe(false);
  });
});

describe("moderateActionSchema", () => {
  it("requires a target for person actions", () => {
    expect(moderateActionSchema.safeParse({ action: "mute" }).success).toBe(false);
    expect(
      moderateActionSchema.safeParse({ action: "mute", targetUserId: "u1" }).success,
    ).toBe(true);
  });

  it("validates capacity range", () => {
    expect(moderateActionSchema.safeParse({ action: "setCapacity", capacity: 1 }).success).toBe(false);
    expect(moderateActionSchema.safeParse({ action: "setCapacity", capacity: 12 }).success).toBe(true);
    expect(moderateActionSchema.safeParse({ action: "setCapacity", capacity: 51 }).success).toBe(false);
  });

  it("rejects unknown actions", () => {
    expect(moderateActionSchema.safeParse({ action: "explode" }).success).toBe(false);
  });
});

describe("decideJoin kick cooldown", () => {
  const base = {
    room: { isTakenDown: false, isLocked: false, capacity: 12 },
    activeParticipantCount: 1,
    alreadyInRoom: false,
    isHost: false,
    userConsented: true,
    isBlockedFromRoom: false,
    isBanned: false,
  };

  it("refuses rejoin while the kick cooldown is active", () => {
    expect(decideJoin({ ...base, kickCooldownActive: true })).toBe("KICK_COOLDOWN");
  });

  it("admits again after the cooldown", () => {
    expect(decideJoin({ ...base, kickCooldownActive: false })).toBeNull();
  });
});
