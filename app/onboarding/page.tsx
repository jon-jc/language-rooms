"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, Card, ErrorNote, inputClass } from "@/components/ui";
import { CEFR_LABELS, CEFR_LEVELS, LANGUAGES, type Cefr } from "@/lib/languages";

interface Target {
  code: string;
  level: Cefr;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [native, setNative] = useState<string[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(async (res) => {
      if (res.status === 401) return router.push("/login");
      if (!res.ok) return;
      const data = await res.json();
      setNative(data.nativeLanguages ?? []);
      setTargets(data.targetLanguages ?? []);
    });
  }, [router]);

  function toggleNative(code: string) {
    setNative((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code].slice(0, 4),
    );
    setTargets((prev) => prev.filter((t) => t.code !== code));
  }

  function toggleTarget(code: string) {
    setTargets((prev) =>
      prev.some((t) => t.code === code)
        ? prev.filter((t) => t.code !== code)
        : [...prev, { code, level: "A1" as Cefr }].slice(0, 6),
    );
    setNative((prev) => prev.filter((c) => c !== code));
  }

  function setLevel(code: string, level: Cefr) {
    setTargets((prev) => prev.map((t) => (t.code === code ? { ...t, level } : t)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nativeLanguages: native, targetLanguages: targets }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/rooms");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "Something went wrong.");
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-6">
      <Card>
        <p className="eyebrow mb-1">Step 1 of 1</p>
        <h1 className="text-2xl font-bold tracking-tight">Your languages</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Tell us what you speak and what you&apos;re learning so we can show you the
          right rooms. Proficiency uses the CEFR scale (A1 beginner → C2 mastery).
        </p>

        <h2 className="eyebrow mt-8">I speak natively (up to 4)</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => toggleNative(lang.code)}
              className={`chip ${native.includes(lang.code) ? "chip-on" : ""}`}
            >
              <span>{lang.flag}</span> {lang.name}
            </button>
          ))}
        </div>

        <h2 className="eyebrow mt-8">I&apos;m learning (up to 6)</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {LANGUAGES.filter((l) => !native.includes(l.code)).map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => toggleTarget(lang.code)}
              className={`chip ${targets.some((t) => t.code === lang.code) ? "chip-on-alt" : ""}`}
            >
              <span>{lang.flag}</span> {lang.name}
            </button>
          ))}
        </div>

        {targets.length > 0 && (
          <div className="mt-8 space-y-3">
            <h2 className="eyebrow">My level in each</h2>
            {targets.map((t) => (
              <div key={t.code} className="flex items-center gap-3">
                <span className="w-40 text-sm text-zinc-200">
                  {LANGUAGES.find((l) => l.code === t.code)?.name}
                </span>
                <select
                  value={t.level}
                  onChange={(e) => setLevel(t.code, e.target.value as Cefr)}
                  className={`${inputClass} max-w-xs`}
                >
                  {CEFR_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {CEFR_LABELS[lvl]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <ErrorNote message={error} />
          <button
            onClick={save}
            disabled={busy || native.length === 0 || targets.length === 0}
            className={buttonClass}
          >
            {busy ? "Saving…" : "Save and find rooms"}
          </button>
        </div>
      </Card>
    </div>
  );
}
