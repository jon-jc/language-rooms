import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { apiHandler, jsonError, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";

/**
 * Streams an evidence frame to staff. Every access is audit-logged —
 * evidence viewing is itself a sensitive action.
 */
export const GET = apiHandler(async (_req: NextRequest, ctx) => {
  const session = await requireSession();
  if (session.role !== "ADMIN" && session.role !== "MODERATOR") {
    return jsonError(403, "FORBIDDEN", "Staff only.");
  }

  const { id } = await ctx.params;
  const frame = await db.evidenceFrame.findUnique({
    where: { id },
    include: { report: { select: { id: true, targetUserId: true } } },
  });
  if (!frame) return jsonError(404, "NOT_FOUND", "Evidence not found.");

  let data: Buffer;
  try {
    data = await readFile(frame.storagePath);
  } catch {
    return jsonError(410, "EVIDENCE_UNAVAILABLE", "Evidence file is not available.");
  }

  await audit({
    actorId: session.sub,
    action: "admin.evidence.viewed",
    targetUserId: frame.report.targetUserId,
    detail: { reportId: frame.report.id, frameId: frame.id },
  });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": frame.contentType,
      "Cache-Control": "private, no-store",
    },
  });
});
