import Link from "next/link";
import { ReactNode } from "react";

/** Minimal shared UI primitives — consistent styling across pages. */

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm " +
  "text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500";

export const buttonClass =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 " +
  "text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 " +
  "disabled:cursor-not-allowed transition-colors";

export const buttonSecondaryClass =
  "inline-flex items-center justify-center rounded-lg border border-zinc-700 " +
  "px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors";

export const buttonDangerClass =
  "inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 " +
  "text-sm font-semibold text-white hover:bg-red-600 transition-colors";

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}

export function TopNav({
  user,
}: {
  user: { displayName: string; role: string } | null;
}) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-white">
          Language<span className="text-indigo-400">Rooms</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/rooms" className="text-zinc-300 hover:text-white">
            Rooms
          </Link>
          {user && (user.role === "ADMIN" || user.role === "MODERATOR") ? (
            <Link href="/admin" className="text-amber-400 hover:text-amber-300">
              Moderation
            </Link>
          ) : null}
          {user ? (
            <>
              <span className="text-zinc-500">{user.displayName}</span>
              <form action="/api/auth/logout" method="post">
                <button className="text-zinc-400 hover:text-white" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-300 hover:text-white">
                Sign in
              </Link>
              <Link href="/signup" className={buttonClass}>
                Join — 18+
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
