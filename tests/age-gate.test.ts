import { describe, expect, it } from "vitest";
import {
  calculateAge,
  evaluateAgeGate,
  hashEmail,
  IP_MAX_FAILURES_PER_DAY,
  MINIMUM_AGE,
} from "@/lib/age-gate";

const utc = (s: string) => new Date(`${s}T00:00:00Z`);

describe("calculateAge", () => {
  it("counts a birthday that already happened this year", () => {
    expect(calculateAge(utc("2000-01-15"), utc("2026-07-13"))).toBe(26);
  });

  it("does not count a birthday that has not happened yet this year", () => {
    expect(calculateAge(utc("2000-12-31"), utc("2026-07-13"))).toBe(25);
  });

  it("turns 18 exactly on the 18th birthday", () => {
    expect(calculateAge(utc("2008-07-13"), utc("2026-07-13"))).toBe(18);
    expect(calculateAge(utc("2008-07-14"), utc("2026-07-13"))).toBe(17);
  });

  it("handles Feb-29 birthdays in non-leap years (counts from Mar 1)", () => {
    const dob = utc("2008-02-29");
    expect(calculateAge(dob, utc("2026-02-28"))).toBe(17);
    expect(calculateAge(dob, utc("2026-03-01"))).toBe(18);
  });

  it("is timezone-independent (uses UTC parts)", () => {
    const lateEvening = new Date("2026-07-13T23:59:00Z");
    expect(calculateAge(utc("2008-07-13"), lateEvening)).toBe(18);
  });
});

describe("evaluateAgeGate", () => {
  const base = {
    now: utc("2026-07-13"),
    emailHasRecentFailure: false,
    ipFailureCount: 0,
  };

  it("passes an adult", () => {
    const d = evaluateAgeGate({ ...base, dateOfBirth: utc("1990-01-01") });
    expect(d).toEqual({ outcome: "pass", age: 36 });
  });

  it("rejects under-18 with the exact age", () => {
    const d = evaluateAgeGate({ ...base, dateOfBirth: utc("2010-01-01") });
    expect(d).toEqual({ outcome: "underage", age: 16 });
  });

  it("hard floor is 18 and not lower", () => {
    expect(MINIMUM_AGE).toBe(18);
  });

  it("locks the email after a prior rejected attempt even if the new DOB is adult", () => {
    const d = evaluateAgeGate({
      ...base,
      emailHasRecentFailure: true,
      dateOfBirth: utc("1990-01-01"), // user edited DOB to an adult one
    });
    expect(d).toEqual({ outcome: "locked" });
  });

  it("locks the IP once it exhausts its failure budget", () => {
    const d = evaluateAgeGate({
      ...base,
      ipFailureCount: IP_MAX_FAILURES_PER_DAY,
      dateOfBirth: utc("1990-01-01"),
    });
    expect(d).toEqual({ outcome: "locked" });
  });

  it("does not lock below the IP budget", () => {
    const d = evaluateAgeGate({
      ...base,
      ipFailureCount: IP_MAX_FAILURES_PER_DAY - 1,
      dateOfBirth: utc("1990-01-01"),
    });
    expect(d.outcome).toBe("pass");
  });
});

describe("hashEmail", () => {
  it("normalizes case and whitespace", () => {
    expect(hashEmail("  Foo@Example.COM ")).toBe(hashEmail("foo@example.com"));
  });

  it("produces distinct hashes for distinct emails", () => {
    expect(hashEmail("a@example.com")).not.toBe(hashEmail("b@example.com"));
  });
});
