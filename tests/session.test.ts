import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session";

const SECRET = "test-secret-test-secret-test-secret-42";

describe("session tokens", () => {
  it("round-trips subject and role", async () => {
    const token = await signSessionToken({ sub: "user_1", role: "USER" }, SECRET);
    const payload = await verifySessionToken(token, SECRET);
    expect(payload).toEqual({ sub: "user_1", role: "USER" });
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSessionToken({ sub: "user_1", role: "ADMIN" }, SECRET);
    expect(await verifySessionToken(token, "another-secret-another-secret!!")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signSessionToken({ sub: "user_1", role: "USER" }, SECRET, -10);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySessionToken("not-a-jwt", SECRET)).toBeNull();
  });
});
