import Link from "next/link";
import { ReactNode } from "react";
import { IconLogout } from "@/components/icons";

/**
 * Shared UI primitives — the design system's building blocks.
 * Base styles live in globals.css (.btn, .input, .glass, .chip…);
 * these exports keep every page on the same visual language.
 */

export const buttonClass = "btn btn-primary";
export const buttonSecondaryClass = "btn btn-secondary";
export const buttonDangerClass = "btn btn-danger";
export const buttonGhostClass = "btn btn-ghost";
export const inputClass = "input";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`glass rounded-2xl p-6 ${className}`}>{children}</div>;
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
      <span className="text-[13px] font-medium text-zinc-300">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
      {message}
    </p>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "indigo" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    neutral: "bg-white/[0.06] text-zinc-300 border-white/10",
    indigo: "bg-indigo-500/12 text-indigo-300 border-indigo-400/20",
    emerald: "bg-emerald-500/12 text-emerald-300 border-emerald-400/20",
    amber: "bg-amber-500/12 text-amber-300 border-amber-400/20",
    rose: "bg-rose-500/12 text-rose-300 border-rose-400/20",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-xl text-center">
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h2 className="text-[1.75rem] font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      {sub ? <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">{sub}</p> : null}
    </div>
  );
}

export function TopNav({
  user,
}: {
  user: { displayName: string; role: string } | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07070c]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6d66ff] to-[#c26bff] text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_10px_-2px_rgba(109,102,255,0.6)]">
            🗣
          </span>
          Language<span className="gradient-text">Rooms</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/rooms"
            className="rounded-full px-3.5 py-1.5 text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Rooms
          </Link>
          {user && (user.role === "ADMIN" || user.role === "MODERATOR") ? (
            <Link
              href="/admin"
              className="rounded-full px-3.5 py-1.5 text-amber-300/80 transition-colors hover:bg-amber-400/10 hover:text-amber-200"
            >
              Moderation
            </Link>
          ) : null}
          {user ? (
            <div className="ml-2 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#6d66ff] to-[#c26bff] text-[11px] font-bold text-white">
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="max-w-28 truncate text-[13px] text-zinc-300">
                {user.displayName}
              </span>
              <form action="/api/auth/logout" method="post" className="flex">
                <button
                  className="text-zinc-500 transition-colors hover:text-white"
                  type="submit"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <IconLogout size={15} />
                </button>
              </form>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3.5 py-1.5 text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary ml-2 !py-1.5 !text-[13px]">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
