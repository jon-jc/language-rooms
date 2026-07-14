import { describe, expect, it } from "vitest";
import {
  AUTO_THROTTLE,
  isBannedNow,
  ROOM_TAKEDOWN,
  severityForReason,
  shouldAutoThrottleUser,
  shouldTakeDownRoom,
  strikePenalty,
} from "@/lib/abuse/thresholds";
import { parseFrameDataUrl, MAX_FRAME_BYTES } from "@/lib/abuse/evidence";
import { StubContentModerationProvider } from "@/lib/abuse/content-moderation";

describe("severityForReason", () => {
  it("child-safety and suspected-underage are always SEVERE", () => {
    expect(severityForReason("CHILD_SAFETY")).toBe("SEVERE");
    expect(severityForReason("SUSPECTED_UNDERAGE")).toBe("SEVERE");
  });

  it("other reasons are NORMAL", () => {
    for (const reason of [
      "NUDITY_SEXUAL",
      "HARASSMENT",
      "HATE_SPEECH",
      "VIOLENCE_SELF_HARM",
      "SPAM",
      "OTHER",
    ] as const) {
      expect(severityForReason(reason)).toBe("NORMAL");
    }
  });
});

describe("strikePenalty ladder", () => {
  it("escalates warn → 24h → 7d → permanent", () => {
    expect(strikePenalty(0)).toEqual({ kind: "none" });
    expect(strikePenalty(1)).toEqual({ kind: "warn" });
    expect(strikePenalty(2)).toEqual({ kind: "temp_ban", hours: 24 });
    expect(strikePenalty(3)).toEqual({ kind: "temp_ban", hours: 168 });
    expect(strikePenalty(4)).toEqual({ kind: "perm_ban" });
    expect(strikePenalty(9)).toEqual({ kind: "perm_ban" });
  });
});

describe("shouldAutoThrottleUser", () => {
  it("requires both volume and distinct reporters (anti-brigading)", () => {
    const min = AUTO_THROTTLE.minDistinctReporters;
    expect(
      shouldAutoThrottleUser({ recentReportCount: min, distinctReporters: min }),
    ).toBe(true);
    // One user spamming reports must not trigger the throttle.
    expect(
      shouldAutoThrottleUser({ recentReportCount: 10, distinctReporters: 1 }),
    ).toBe(false);
    expect(
      shouldAutoThrottleUser({ recentReportCount: min - 1, distinctReporters: min - 1 }),
    ).toBe(false);
  });
});

describe("shouldTakeDownRoom", () => {
  it("takes down at the report and reporter thresholds", () => {
    expect(
      shouldTakeDownRoom({
        recentReportCount: ROOM_TAKEDOWN.minReports,
        distinctReporters: ROOM_TAKEDOWN.minDistinctReporters,
      }),
    ).toBe(true);
    expect(
      shouldTakeDownRoom({
        recentReportCount: ROOM_TAKEDOWN.minReports - 1,
        distinctReporters: ROOM_TAKEDOWN.minDistinctReporters,
      }),
    ).toBe(false);
    expect(
      shouldTakeDownRoom({
        recentReportCount: ROOM_TAKEDOWN.minReports + 5,
        distinctReporters: 1,
      }),
    ).toBe(false);
  });
});

describe("isBannedNow", () => {
  const now = new Date("2026-07-14T00:00:00Z");
  const future = new Date("2026-07-15T00:00:00Z");
  const past = new Date("2026-07-13T00:00:00Z");

  it("active users are not banned", () => {
    expect(isBannedNow({ status: "ACTIVE", bannedUntil: null }, now)).toBe(false);
  });

  it("permanent bans never expire", () => {
    expect(isBannedNow({ status: "PERM_BANNED", bannedUntil: null }, now)).toBe(true);
    expect(isBannedNow({ status: "PERM_BANNED", bannedUntil: past }, now)).toBe(true);
  });

  it("temp bans bind until expiry (and bind when no expiry is set)", () => {
    expect(isBannedNow({ status: "TEMP_BANNED", bannedUntil: future }, now)).toBe(true);
    expect(isBannedNow({ status: "TEMP_BANNED", bannedUntil: past }, now)).toBe(false);
    expect(isBannedNow({ status: "TEMP_BANNED", bannedUntil: null }, now)).toBe(true);
  });
});

describe("evidence frame parsing", () => {
  const tinyPngB64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("accepts jpeg and png data URLs and hashes them", () => {
    const frame = parseFrameDataUrl(`data:image/png;base64,${tinyPngB64}`);
    expect(frame).not.toBeNull();
    expect(frame!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(parseFrameDataUrl(`data:image/jpeg;base64,${tinyPngB64}`)).not.toBeNull();
  });

  it("rejects other formats, malformed input, and oversized frames", () => {
    expect(parseFrameDataUrl(`data:image/gif;base64,${tinyPngB64}`)).toBeNull();
    expect(parseFrameDataUrl(`data:image/webp;base64,${tinyPngB64}`)).toBeNull();
    expect(parseFrameDataUrl("garbage")).toBeNull();
    const big = Buffer.alloc(MAX_FRAME_BYTES + 1).toString("base64");
    expect(parseFrameDataUrl(`data:image/jpeg;base64,${big}`)).toBeNull();
  });
});

describe("stub content-moderation provider", () => {
  it("flags only test-marked buffers", async () => {
    const provider = new StubContentModerationProvider();
    const flagged = await provider.scanFrame(Buffer.from("NSFW-TEST-anything"));
    expect(flagged.flagged).toBe(true);
    expect(flagged.score).toBeGreaterThan(0.9);
    const clean = await provider.scanFrame(Buffer.from("ordinary image bytes"));
    expect(clean.flagged).toBe(false);
    expect(clean.categories).toEqual([]);
  });
});
