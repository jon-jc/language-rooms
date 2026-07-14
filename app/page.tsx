import Link from "next/link";
import { readSession } from "@/lib/auth/session";
import { buttonClass, buttonSecondaryClass } from "@/components/ui";

const FEATURES = [
  {
    icon: "🎥",
    title: "Rooms, not roulette",
    text: "Browse persistent rooms by language and CEFR level instead of being randomly paired. See who's inside before you join.",
  },
  {
    icon: "🗣️",
    title: "Group video & voice",
    text: "A multi-party video grid with group audio — everyone can speak, cameras optional, active speakers highlighted live.",
  },
  {
    icon: "🖊️",
    title: "Shared whiteboards",
    text: "Sketch grammar, drop in photos of textbook pages or menus, and annotate together in real time while you talk.",
  },
  {
    icon: "📝",
    title: "Corrections that stick",
    text: "A support panel for corrections, vocabulary, and links — with translation assist — so the conversation never stops.",
  },
  {
    icon: "✋",
    title: "Classroom mode",
    text: "Hosts can run moderated sessions where learners raise a hand to speak. Perfect for structured practice.",
  },
  {
    icon: "🛡️",
    title: "Safe by design",
    text: "Verified accounts, host moderation, one-click reporting and blocking, and a real enforcement pipeline behind it all.",
  },
];

export default async function HomePage() {
  const session = await readSession();

  return (
    <div className="space-y-20 pb-10">
      <section className="rise-in mx-auto max-w-3xl pt-14 text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Live rooms in 32 languages
        </p>
        <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl">
          Practice languages
          <br />
          <span className="gradient-text">out loud, together.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
          Join persistent video &amp; voice rooms like &ldquo;Spanish – Beginner&rdquo; or
          &ldquo;Japanese Conversation&rdquo;. Talk with real people, share a whiteboard,
          and actually use the language you&apos;re learning.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          {session ? (
            <Link href="/rooms" className={`${buttonClass} px-8 py-3 text-base`}>
              Browse rooms →
            </Link>
          ) : (
            <>
              <Link href="/signup" className={`${buttonClass} px-8 py-3 text-base`}>
                Start speaking free
              </Link>
              <Link href="/login" className={`${buttonSecondaryClass} px-8 py-3 text-base`}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`glass rise-in rise-in-${(i % 3) + 1} group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-indigo-400/30`}
          >
            <span className="text-2xl">{f.icon}</span>
            <h2 className="mt-3 font-semibold text-white">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="glass rounded-3xl p-10 text-center">
        <h2 className="text-2xl font-bold text-white">
          Three steps to your first conversation
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {[
            ["1", "Tell us your languages", "What you speak natively and what you're learning, A1 to C2."],
            ["2", "Pick a room", "Filter by language and level. See topics and who's inside before joining."],
            ["3", "Turn on your mic", "Jump into the conversation — camera optional, whiteboard ready."],
          ].map(([n, title, text]) => (
            <div key={n}>
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
                {n}
              </span>
              <h3 className="mt-3 font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{text}</p>
            </div>
          ))}
        </div>
        {!session ? (
          <Link href="/signup" className={`${buttonClass} mt-10 px-8 py-3 text-base`}>
            Create your account
          </Link>
        ) : null}
      </section>
    </div>
  );
}
