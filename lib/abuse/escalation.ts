import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";

const log = logger("escalation");

/**
 * Escalation path for SEVERE reports (CSAM-class / child-safety and
 * suspected-underage) — see docs/abuse-handling.md for the full policy.
 *
 * Requirements implemented here:
 *  - the report is moved to ESCALATED (a separate, priority queue state);
 *  - evidence is PRESERVED: nothing in the codebase deletes evidence for
 *    escalated reports, and the admin UI exposes no delete for them;
 *  - the event is audit-logged;
 *  - `notifyAuthorities` is the single integration point where a production
 *    deployment must wire its legal reporting pipeline (e.g. the NCMEC
 *    CyberTipline API at report.cybertip.org for US-based services, plus
 *    counsel-directed law-enforcement contacts). In dev it logs loudly and
 *    does nothing else — deliberately NOT a real submission.
 */
export async function escalateSevereReport(reportId: string): Promise<void> {
  const report = await db.report.update({
    where: { id: reportId },
    data: { status: "ESCALATED" },
  });

  await audit({
    actorId: null,
    action: "report.escalated",
    roomId: report.roomId ?? undefined,
    targetUserId: report.targetUserId,
    detail: { reportId, reason: report.reason, severity: report.severity },
  });

  await notifyAuthorities(reportId);
}

/**
 * INTEGRATION POINT — legal escalation.
 *
 * Production: submit to the appropriate hotline/authority per counsel
 * (NCMEC CyberTipline for US services; INHOPE member hotlines elsewhere),
 * attaching preserved evidence references, and record the submission id.
 * Statutory preservation windows apply to the underlying evidence
 * (18 U.S.C. § 2258A requires providers to preserve reported content).
 *
 * Development: log-only stub, clearly marked.
 */
async function notifyAuthorities(reportId: string): Promise<void> {
  log.error(
    { reportId, integration: "NOT_CONFIGURED" },
    "SEVERE report escalated — production deployments MUST wire this to " +
      "their legal reporting pipeline (see docs/abuse-handling.md#escalation)",
  );
}
