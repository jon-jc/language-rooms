import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Liveness/readiness probe for containers and load balancers.
 * Verifies the database round-trip; unauthenticated by design and
 * deliberately reveals nothing beyond up/down.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
