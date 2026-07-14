"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, ErrorNote, inputClass } from "@/components/ui";

interface QueueReport {
  id: string;
  reason: string;
  severity: "NORMAL" | "SEVERE";
  status: string;
  source: string;
  comment: string | null;
  roomId: string | null;
  createdAt: string;
  reporter: { id: string | null; displayName: string };
  target: {
    id: string;
    displayName: string;
    status: string;
    activeStrikes: number;
  };
  frames: Array<{ id: string; contentType: string; capturedAt: string }>;
}

const REASON_LABELS: Record<string, string> = {
  NUDITY_SEXUAL: "Nudity / sexual content",
  HARASSMENT: "Harassment",
  HATE_SPEECH: "Hate speech",
  VIOLENCE_SELF_HARM: "Violence / self-harm",
  SUSPECTED_UNDERAGE: "Suspected underage",
  CHILD_SAFETY: "Child safety (CSAM-class)",
  SPAM: "Spam",
  OTHER: "Other",
};

type Filter = "open" | "RESOLVED_ACTIONED" | "RESOLVED_DISMISSED" | "all";

/**
 * The moderation queue. Data comes from /api/admin/reports; every button is
 * re-authorized server-side. Evidence frames load through the audited
 * /api/admin/evidence route.
 */
export default function AdminQueue({ isAdmin }: { isAdmin: boolean }) {
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async (f: Filter) => {
    setError(null);
    const res = await fetch(`/api/admin/reports?status=${f}`);
    if (!res.ok) {
      setError("Could not load the queue.");
      return;
    }
    const data = await res.json();
    setReports(data.reports);
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function act(reportId: string, action: string) {
    setBusyId(reportId);
    setError(null);
    const res = await fetch(`/api/admin/reports/${reportId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: notes[reportId] || undefined }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "Action failed.");
      return;
    }
    await load(filter);
  }

  const actionBtn =
    "rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-medium " +
    "text-zinc-200 hover:bg-white/[0.09] hover:text-white disabled:opacity-40 transition-colors";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            ["open", "Open"],
            ["RESOLVED_ACTIONED", "Actioned"],
            ["RESOLVED_DISMISSED", "Dismissed"],
            ["all", "All"],
          ] as Array<[Filter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
              filter === value
                ? "bg-gradient-to-r from-[#6d66ff] to-[#c26bff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                : "border border-white/12 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />

      {reports.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">Queue is clear. 🎉</p>
        </Card>
      ) : (
        reports.map((report) => {
          const severe = report.severity === "SEVERE";
          const open = report.status === "PENDING" || report.status === "ESCALATED";
          return (
            <Card
              key={report.id}
              className={severe ? "!border-red-800" : undefined}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {severe ? (
                      <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-200">
                        SEVERE {report.status === "ESCALATED" ? "· ESCALATED" : ""}
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-zinc-300">
                        {report.status}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-white">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {report.source === "automated" ? "🤖 automated" : "👤 user report"}
                      {" · "}
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-zinc-300">
                    <span className="text-zinc-500">Target:</span>{" "}
                    <strong>{report.target.displayName}</strong>{" "}
                    <span className="text-xs text-zinc-500">
                      ({report.target.status}, {report.target.activeStrikes} active strike
                      {report.target.activeStrikes === 1 ? "" : "s"})
                    </span>
                    {"  ·  "}
                    <span className="text-zinc-500">Reported by:</span>{" "}
                    {report.reporter.displayName}
                    {report.roomId ? (
                      <>
                        {"  ·  "}
                        <span className="text-zinc-500">Room:</span>{" "}
                        <span className="font-mono text-xs">{report.roomId}</span>
                      </>
                    ) : null}
                  </p>
                  {report.comment ? (
                    <p className="mt-1.5 rounded-lg border border-white/[0.05] bg-white/[0.03] px-2.5 py-1.5 text-sm text-zinc-400">
                      “{report.comment}”
                    </p>
                  ) : null}
                </div>
                {report.frames.length > 0 ? (
                  <div className="flex gap-2">
                    {report.frames.map((frame) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={frame.id}
                        src={`/api/admin/evidence/${frame.id}`}
                        alt="Evidence frame"
                        className="h-20 w-28 rounded-xl border border-white/10 object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              {open ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    value={notes[report.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    placeholder="Resolution note (optional)"
                    className={`${inputClass} max-w-xs !py-1 text-xs`}
                  />
                  <button
                    className={actionBtn}
                    disabled={busyId === report.id || report.status === "ESCALATED"}
                    title={
                      report.status === "ESCALATED"
                        ? "Escalated reports are preservation-locked"
                        : undefined
                    }
                    onClick={() => act(report.id, "dismiss")}
                  >
                    Dismiss
                  </button>
                  <button
                    className={actionBtn}
                    disabled={busyId === report.id}
                    onClick={() => act(report.id, "warn")}
                  >
                    Warn (strike)
                  </button>
                  <button
                    className={actionBtn}
                    disabled={busyId === report.id}
                    onClick={() => act(report.id, "temp_ban_24h")}
                  >
                    Ban 24h
                  </button>
                  <button
                    className={actionBtn}
                    disabled={busyId === report.id}
                    onClick={() => act(report.id, "temp_ban_7d")}
                  >
                    Ban 7d
                  </button>
                  {isAdmin ? (
                    <>
                      <button
                        className={`${actionBtn} !border-red-900 !text-red-300 hover:!bg-red-950`}
                        disabled={busyId === report.id}
                        onClick={() => act(report.id, "perm_ban")}
                      >
                        Permanent ban
                      </button>
                      {report.roomId ? (
                        <button
                          className={`${actionBtn} !border-red-900 !text-red-300 hover:!bg-red-950`}
                          disabled={busyId === report.id}
                          onClick={() => act(report.id, "room_takedown")}
                        >
                          Take down room
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}
