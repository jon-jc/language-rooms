"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, Card, ErrorNote } from "@/components/ui";

const CONDUCT_RULES = [
  "No nudity or sexual content on camera, in voice, or in the support panel.",
  "No harassment, hate speech, threats, or targeted abuse of other learners.",
  "No weapons, violence, or self-harm content on stream.",
  "No broadcasting of illegal content of any kind.",
  "Do not record or screenshot other participants without their consent.",
  "Follow host and moderator instructions; repeated violations lead to bans.",
];

export default function ConsentPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptVideoConductRules: true }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "Something went wrong.");
  }

  return (
    <div className="mx-auto mt-12 max-w-lg">
      <Card>
        <h1 className="mb-1 text-xl font-bold">Video conduct rules</h1>
        <p className="mb-4 text-sm text-zinc-400">
          You must explicitly accept these rules before joining any room. They
          exist to keep live video safe for everyone.
        </p>
        <ul className="mb-4 space-y-2 text-sm text-zinc-300">
          {CONDUCT_RULES.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="text-indigo-400">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
        <p className="mb-4 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
          Reporting a participant captures recent frames of their video stream for
          moderator review, and active streams may be sampled by automated safety
          systems. By accepting, you acknowledge both.
        </p>
        <label className="mb-4 flex items-start gap-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            className="mt-1"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>I have read and accept the video conduct rules.</span>
        </label>
        <ErrorNote message={error} />
        <button
          onClick={accept}
          disabled={!checked || busy}
          className={`${buttonClass} w-full`}
        >
          {busy ? "Saving…" : "Accept and continue"}
        </button>
      </Card>
    </div>
  );
}
