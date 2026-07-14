import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReportStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { apiHandler, jsonError, requireSession } from "@/lib/api";

/** Staff-only moderation queue: ESCALATED first, then pending by age. */
export const GET = apiHandler(async (req: NextRequest) => {
  const session = await requireSession();
  if (session.role !== "ADMIN" && session.role !== "MODERATOR") {
    return jsonError(403, "FORBIDDEN", "Staff only.");
  }

  const statusFilter = req.nextUrl.searchParams.get("status") ?? "open";
  const where: Prisma.ReportWhereInput =
    statusFilter === "all"
      ? {}
      : statusFilter === "open"
        ? { status: { in: [ReportStatus.PENDING, ReportStatus.ESCALATED] } }
        : { status: statusFilter as ReportStatus };

  const reports = await db.report.findMany({
    where,
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    take: 100,
    include: {
      reporter: { select: { id: true, displayName: true } },
      targetUser: {
        select: {
          id: true,
          displayName: true,
          status: true,
          strikes: { where: { expiresAt: { gt: new Date() } }, select: { id: true } },
        },
      },
      evidenceFrames: { select: { id: true, contentType: true, capturedAt: true } },
    },
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      severity: r.severity,
      status: r.status,
      source: r.source,
      comment: r.comment,
      roomId: r.roomId,
      createdAt: r.createdAt,
      reporter: r.reporter
        ? { id: r.reporter.id, displayName: r.reporter.displayName }
        : { id: null, displayName: "Automated scan" },
      target: {
        id: r.targetUser.id,
        displayName: r.targetUser.displayName,
        status: r.targetUser.status,
        activeStrikes: r.targetUser.strikes.length,
      },
      frames: r.evidenceFrames,
    })),
  });
});
