import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * Server-component guards. Pages call these at the top; unauthenticated or
 * unauthorized visitors are redirected instead of seeing an error.
 */

export async function requireUserPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user) redirect("/login");
  return user;
}

/** Same as requireUserPage plus the conduct-rules consent gate. */
export async function requireConsentedUserPage() {
  const user = await requireUserPage();
  if (!user.conductConsentAt) redirect("/consent");
  return user;
}

/** Consent + a completed language profile (≥1 native and ≥1 target). */
export async function requireOnboardedUserPage() {
  const user = await requireConsentedUserPage();
  const langs = await db.languageProfile.findMany({
    where: { userId: user.id },
    select: { kind: true },
  });
  const hasNative = langs.some((l) => l.kind === "NATIVE");
  const hasTarget = langs.some((l) => l.kind === "TARGET");
  if (!hasNative || !hasTarget) redirect("/onboarding");
  return user;
}

export async function requireStaffPage() {
  const user = await requireUserPage();
  if (user.role !== "ADMIN" && user.role !== "MODERATOR") redirect("/");
  return user;
}
