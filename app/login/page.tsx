"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClass, Card, ErrorNote, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      router.push(data.user.conductConsentAt ? "/rooms" : "/consent");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "Something went wrong.");
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <Card>
        <h1 className="mb-6 text-xl font-bold">Sign in</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} />
          </Field>
          <Field label="Password">
            <input name="password" type="password" required className={inputClass} />
          </Field>
          <ErrorNote message={error} />
          <button type="submit" disabled={busy} className={`${buttonClass} w-full`}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          New here?{" "}
          <Link href="/signup" className="text-indigo-400 underline">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
