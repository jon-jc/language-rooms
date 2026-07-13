"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, Card, ErrorNote, Field, inputClass } from "@/components/ui";
import { CEFR_LABELS, CEFR_LEVELS, LANGUAGES } from "@/lib/languages";

export default function NewRoomPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [voiceOnly, setVoiceOnly] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const capacityRaw = String(form.get("capacity") ?? "").trim();
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        topic: form.get("topic") || undefined,
        languageCode: form.get("languageCode"),
        level: form.get("level") || null,
        isVoiceOnly: voiceOnly,
        isModerated: form.get("isModerated") === "on",
        ...(capacityRaw ? { capacity: Number(capacityRaw) } : {}),
      }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/rooms/${data.room.id}`);
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "Something went wrong.");
  }

  return (
    <div className="mx-auto mt-8 max-w-lg">
      <Card>
        <h1 className="mb-4 text-xl font-bold">Create a room</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Room name" hint='e.g. "Spanish – Beginner free talk"'>
            <input name="name" required minLength={3} maxLength={60} className={inputClass} />
          </Field>
          <Field label="Topic (optional)">
            <input name="topic" maxLength={140} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Language">
              <select name="languageCode" required className={inputClass} defaultValue="es">
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Level">
              <select name="level" className={inputClass} defaultValue="">
                <option value="">All levels</option>
                {CEFR_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {CEFR_LABELS[lvl]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={voiceOnly}
              onChange={(e) => setVoiceOnly(e.target.checked)}
            />
            Voice-only room (no video, larger capacity)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="isModerated" />
            Moderated mode (participants raise a hand to speak)
          </label>
          <Field
            label="Capacity (optional)"
            hint={voiceOnly ? "2–50 for voice-only (default 20)" : "2–20 with video (default 12)"}
          >
            <input
              name="capacity"
              type="number"
              min={2}
              max={voiceOnly ? 50 : 20}
              className={inputClass}
            />
          </Field>
          <ErrorNote message={error} />
          <button type="submit" disabled={busy} className={`${buttonClass} w-full`}>
            {busy ? "Creating…" : "Create room"}
          </button>
        </form>
      </Card>
    </div>
  );
}
