import { describe, expect, it } from "vitest";
import { decideFixedWindow, RATE_LIMITS } from "@/lib/rate-limit";

const rule = { limit: 3, windowSeconds: 60 };
const t0 = new Date("2026-07-13T12:00:00Z");
const at = (offsetSec: number) => new Date(t0.getTime() + offsetSec * 1000);

describe("decideFixedWindow", () => {
  it("allows and starts a window when no counter exists", () => {
    expect(decideFixedWindow({ now: t0, rule, existing: null })).toEqual({
      allowed: true,
      newWindow: true,
    });
  });

  it("allows while under the limit inside the window", () => {
    const d = decideFixedWindow({
      now: at(30),
      rule,
      existing: { windowStart: t0, count: 2 },
    });
    expect(d.allowed).toBe(true);
    expect(d.newWindow).toBe(false);
  });

  it("denies at the limit and reports retry-after", () => {
    const d = decideFixedWindow({
      now: at(30),
      rule,
      existing: { windowStart: t0, count: 3 },
    });
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSeconds).toBe(30);
  });

  it("resets when the window has elapsed", () => {
    const d = decideFixedWindow({
      now: at(61),
      rule,
      existing: { windowStart: t0, count: 3 },
    });
    expect(d).toEqual({ allowed: true, newWindow: true });
  });

  it("registry covers the abuse-sensitive operations", () => {
    for (const name of ["signup", "login", "roomCreate", "roomJoin", "roomRejoin", "report"] as const) {
      expect(RATE_LIMITS[name].limit).toBeGreaterThan(0);
      expect(RATE_LIMITS[name].windowSeconds).toBeGreaterThan(0);
    }
  });
});
