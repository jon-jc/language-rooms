import { describe, expect, it } from "vitest";
import { jwtVerify } from "jose";
import { TrackSource } from "livekit-server-sdk";
import { grantsForParticipant } from "@/lib/livekit";

describe("grantsForParticipant", () => {
  const base = {
    roomId: "room_1",
    isVoiceOnly: false,
    isModerated: false,
  } as const;

  it("scopes the grant to exactly one room", () => {
    const g = grantsForParticipant({ ...base, role: "PARTICIPANT" });
    expect(g.room).toBe("room_1");
    expect(g.roomJoin).toBe(true);
  });

  it("lets everyone publish in unmoderated rooms", () => {
    expect(grantsForParticipant({ ...base, role: "PARTICIPANT" }).canPublish).toBe(true);
  });

  it("makes non-hosts listen-only in moderated rooms (raise-hand to speak)", () => {
    const g = grantsForParticipant({ ...base, isModerated: true, role: "PARTICIPANT" });
    expect(g.canPublish).toBe(false);
    expect(g.canPublishData).toBe(true); // raise-hand signal still allowed
    expect(g.canSubscribe).toBe(true);
  });

  it("hosts and moderators can always publish", () => {
    expect(grantsForParticipant({ ...base, isModerated: true, role: "HOST" }).canPublish).toBe(true);
    expect(
      grantsForParticipant({ ...base, isModerated: true, role: "MODERATOR" }).canPublish,
    ).toBe(true);
  });

  it("voice-only rooms restrict publish sources to the microphone", () => {
    const g = grantsForParticipant({ ...base, isVoiceOnly: true, role: "PARTICIPANT" });
    expect(g.canPublishSources).toEqual([TrackSource.MICROPHONE]);
  });

  it("video rooms allow camera, mic, and screen share", () => {
    const g = grantsForParticipant({ ...base, role: "PARTICIPANT" });
    expect(g.canPublishSources).toContain(TrackSource.CAMERA);
    expect(g.canPublishSources).toContain(TrackSource.MICROPHONE);
  });
});

describe("mintRoomToken", () => {
  it("produces a JWT verifiable with the API secret, carrying identity and grants", async () => {
    process.env.LIVEKIT_API_KEY = "testkey";
    process.env.LIVEKIT_API_SECRET = "testsecret_testsecret_testsecret";
    process.env.SESSION_SECRET = "x".repeat(64);
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5434/x";
    process.env.LIVEKIT_HOST = "http://localhost:7890";
    process.env.NEXT_PUBLIC_LIVEKIT_URL = "ws://localhost:7890";

    const { mintRoomToken } = await import("@/lib/livekit");
    const token = await mintRoomToken({
      userId: "user_42",
      displayName: "Tester",
      roomId: "room_9",
      role: "HOST",
      isVoiceOnly: false,
      isModerated: true,
    });

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode("testsecret_testsecret_testsecret"),
      { issuer: "testkey" },
    );
    expect(payload.sub).toBe("user_42");
    const video = payload.video as Record<string, unknown>;
    expect(video.room).toBe("room_9");
    expect(video.roomJoin).toBe(true);
    expect(video.canPublish).toBe(true); // host publishes even in moderated rooms
    expect(JSON.parse(payload.metadata as string)).toEqual({ role: "HOST" });
  });
});
