"use client";

import { useState } from "react";
import { buttonDangerClass, buttonSecondaryClass, ErrorNote, inputClass } from "@/components/ui";

const REASONS: Array<{ value: string; label: string }> = [
  { value: "NUDITY_SEXUAL", label: "Nudity or sexual content" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "VIOLENCE_SELF_HARM", label: "Violence or self-harm" },
  { value: "SUSPECTED_UNDERAGE", label: "Participant appears to be under 18" },
  { value: "CHILD_SAFETY", label: "Child-safety emergency (CSAM)" },
  { value: "SPAM", label: "Spam or scam" },
  { value: "OTHER", label: "Something else" },
];

export interface ReportTarget {
  userId: string;
  name: string;
  /** Video elements currently rendering this user's stream (frame capture). */
  captureFrames: () => string[];
}

/**
 * In-room report dialog. Prominently discloses that submitting captures
 * frames of the reported participant's stream (also stated in ToS §3 and the
 * consent screen).
 */
export default function ReportModal({
  roomId,
  target,
  onClose,
}: {
  roomId: string;
  target: ReportTarget;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("NUDITY_SEXUAL");
  const [comment, setComment] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const frames = target.captureFrames();
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: target.userId,
        roomId,
        reason,
        comment: comment || undefined,
        frames,
      }),
    });
    if (res.ok && alsoBlock) {
      await fetch(`/api/users/${target.userId}/block`, { method: "POST" }).catch(() => {});
    }
    setBusy(false);
    if (res.ok) {
      setDone(true);
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "Could not submit the report.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        {done ? (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-bold text-white">Report received</h2>
            <p className="text-sm text-zinc-400">
              Our moderation team will review it. Thank you for helping keep
              rooms safe.
            </p>
            <button onClick={onClose} className={buttonSecondaryClass}>
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-white">
              Report {target.name}
            </h2>
            <div className="mt-4 space-y-3">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputClass}
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="What happened? (optional)"
                className={inputClass}
              />
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={alsoBlock}
                  onChange={(e) => setAlsoBlock(e.target.checked)}
                />
                Also block {target.name} (you will never share a room again)
              </label>
              <p className="rounded-lg border border-amber-900/70 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                Submitting this report captures recent frame(s) of{" "}
                {target.name}&apos;s video stream, together with your account,
                their account, this room, and the time, for review by our
                moderation team.
              </p>
              <ErrorNote message={error} />
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className={buttonSecondaryClass} disabled={busy}>
                  Cancel
                </button>
                <button onClick={submit} className={buttonDangerClass} disabled={busy}>
                  {busy ? "Submitting…" : "Submit report"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
