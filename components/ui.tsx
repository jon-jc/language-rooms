import Link from "next/link";
import { ReactNode } from "react";

/** Shared UI primitives — the app's visual language lives here. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`glass rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${className}`}
    >
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
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm " +
  "text-zinc-100 placeholder-zinc-500 outline-none transition-all " +
  "focus:border-indigo-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20";

export const buttonClass =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r " +
  "from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white " +
  "shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 " +
  "hover:brightness-110 active:scale-[0.98] disabled:opacity-40 " +
  "disabled:cursor-not-allowed disabled:hover:brightness-100";

export const buttonSecondaryClass =
  "inline-flex items-center justify-center rounded-xl border border-white/10 " +
  "bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-all " +
  "hover:border-white/20 hover:bg-white/10 active:scale-[0.98]";

export const buttonDangerClass =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r " +
  "from-rose-600 to-red-600 px-5 py-2.5 text-sm font-semibold text-white " +
  "shadow-lg shadow-rose-600/25 transition-all hover:brightness-110 " +
  "active:scale-[0.98] disabled:opacity-40";

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
      {message}
    </p>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "indigo" | "emerald" | "amber";
}) {
  const tones = {
    neutral: "bg-white/8 text-zinc-300 border-white/10",
    indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-400/20",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    amber: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function TopNav({
  user,
}: {
  user: { displayName: string; role: string } | null;
}) {
  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0 !bg-[#08080d]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          Language<span className="gradient-text">Rooms</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/rooms" className="text-zinc-400 transition-colors hover:text-white">
            Rooms
          </Link>
          {user && (user.role === "ADMIN" || user.role === "MODERATOR") ? (
            <Link href="/admin" className="text-amber-400/90 transition-colors hover:text-amber-300">
              Moderation
            </Link>
          ) : null}
          {user ? (
            <>
              <span className="flex items-center gap-2 text-zinc-300">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
                {user.displayName}
              </span>
              <form action="/api/auth/logout" method="post">
                <button className="text-zinc-500 transition-colors hover:text-white" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-400 transition-colors hover:text-white">
                Sign in
              </Link>
              <Link href="/signup" className={buttonClass}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
