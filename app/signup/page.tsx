"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClass, Card, ErrorNote, Field, inputClass } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        displayName: form.get("displayName"),
        dateOfBirth: form.get("dateOfBirth"),
        acceptedTerms: form.get("acceptedTerms") === "on",
      }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/consent");
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "Something went wrong.");
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <Card>
        <h1 className="mb-1 text-xl font-bold">Create your account</h1>
        <p className="mb-6 text-sm text-zinc-400">
          A couple of details and you&apos;re in the conversation.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Display name">
            <input name="displayName" required minLength={2} maxLength={32} className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <input name="password" type="password" required minLength={8} className={inputClass} />
          </Field>
          <Field
            label="Date of birth"
            hint="We use this to verify your age; the verification result is stored."
          >
            <input name="dateOfBirth" type="date" required className={inputClass} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-zinc-300">
            <input name="acceptedTerms" type="checkbox" required className="mt-1" />
            <span>
              I accept the{" "}
              <Link href="/terms" className="text-indigo-400 underline" target="_blank">
                Terms of Service
              </Link>
              , including its age requirement.
            </span>
          </label>
          <ErrorNote message={error} />
          <button type="submit" disabled={busy} className={`${buttonClass} w-full`}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
