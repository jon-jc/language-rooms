import Link from "next/link";
import { readSession } from "@/lib/auth/session";
import { buttonClass, buttonSecondaryClass } from "@/components/ui";
import RotatingGreeting from "@/components/marketing/RotatingGreeting";
import MockRoom from "@/components/marketing/MockRoom";
import RoomMarquee from "@/components/marketing/RoomMarquee";

const FEATURES = [
  {
    icon: "🎥",
    title: "Rooms, not roulette",
    text: "Browse persistent rooms by language and CEFR level instead of being randomly paired. See the topic and who's inside before you join.",
  },
  {
    icon: "🗣️",
    title: "Group video & voice",
    text: "Up to 20 people on camera (more voice-only) with active speakers highlighted live — a real conversation table, not a call queue.",
  },
  {
    icon: "🖊️",
    title: "Shared whiteboards",
    text: "Sketch grammar, upload photos of textbook pages or menus, and annotate together in real time while you talk.",
  },
  {
    icon: "📝",
    title: "Corrections that stick",
    text: "A support panel for corrections, vocabulary, and links — with translation assist — so the conversation never has to stop.",
  },
  {
    icon: "✋",
    title: "Classroom mode",
    text: "Hosts can run moderated sessions where learners raise a hand to speak. Perfect for structured practice and shy beginners.",
  },
  {
    icon: "🛡️",
    title: "Safe by design",
    text: "Verified accounts, host moderation, one-click reporting and blocking, and a real enforcement pipeline behind it all.",
  },
];

const STATS: Array<[string, string]> = [
  ["32", "languages, A1 → C2"],
  ["20", "people on camera per room"],
  ["1-click", "join, report, or block"],
  ["24/7", "rooms — someone's always talking"],
];

const STEPS: Array<[string, string, string]> = [
  ["1", "Tell us your languages", "What you speak natively and what you're learning, A1 to C2. Thirty seconds."],
  ["2", "Pick a room", "Filter by language and level. See the topic and who's inside before joining."],
  ["3", "Turn on your mic", "Jump into the conversation — camera optional, whiteboard ready, corrections flowing."],
];

export default async function HomePage() {
  const session = await readSession();

  return (
    <div className="relative space-y-24 pb-16">
      {/* Aurora backdrop for the hero */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[36rem] w-full max-w-5xl -translate-x-1/2">
        <div className="aurora aurora-a left-[10%] top-0 h-80 w-80 bg-indigo-600" />
        <div className="aurora aurora-b right-[8%] top-16 h-72 w-72 bg-fuchsia-600" />
        <div className="aurora aurora-a bottom-0 left-[38%] h-64 w-64 bg-sky-600" />
      </div>

      {/* ── Hero ── */}
      <section className="rise-in mx-auto max-w-3xl pt-12 text-center">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Live rooms in 32 languages — right now
        </p>
        <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-7xl">
          Say <RotatingGreeting />
          <br />
          to real people.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
          Apps teach you words. <span className="text-zinc-200">Conversations teach you the language.</span>{" "}
          Walk into a live video room like &ldquo;Spanish – Beginner&rdquo; or
          &ldquo;Japanese Conversation&rdquo; and start talking — with a shared
          whiteboard and gentle corrections built in.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {session ? (
            <Link href="/rooms" className={`${buttonClass} px-8 py-3 text-base`}>
              Browse live rooms →
            </Link>
          ) : (
            <>
              <Link href="/signup" className={`${buttonClass} px-8 py-3 text-base`}>
                Start speaking — it&apos;s free
              </Link>
              <Link href="/login" className={`${buttonSecondaryClass} px-8 py-3 text-base`}>
                Sign in
              </Link>
            </>
          )}
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          No installs. Works in your browser. Camera optional.
        </p>
      </section>

      {/* ── Live mock of the product ── */}
      <section className="rise-in rise-in-1">
        <MockRoom />
        <p className="mt-4 text-center text-sm text-zinc-500">
          This is the room. Four learners, one active speaker, corrections
          landing in the side panel — <span className="text-zinc-300">without interrupting anyone</span>.
        </p>
      </section>

      {/* ── Stats band ── */}
      <section className="glass mx-auto grid max-w-4xl grid-cols-2 gap-6 rounded-3xl p-8 sm:grid-cols-4">
        {STATS.map(([big, small]) => (
          <div key={small} className="text-center">
            <p className="gradient-text text-3xl font-extrabold">{big}</p>
            <p className="mt-1 text-xs leading-snug text-zinc-400">{small}</p>
          </div>
        ))}
      </section>

      {/* ── Room marquee ── */}
      <section>
        <h2 className="mb-2 text-center text-2xl font-bold text-white">
          There&apos;s a table for you
        </h2>
        <p className="mx-auto mb-8 max-w-lg text-center text-sm text-zinc-400">
          Free talk, interview prep, K-drama debriefs, café chats — rooms are
          organized by language and CEFR level, so you&apos;re never out of your depth.
        </p>
        <RoomMarquee />
      </section>

      {/* ── Features ── */}
      <section>
        <h2 className="mb-8 text-center text-2xl font-bold text-white">
          Built for practice, not small talk
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`glass rise-in rise-in-${(i % 3) + 1} group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-indigo-400/30`}
            >
              <span className="text-2xl transition-transform group-hover:scale-110 inline-block">
                {f.icon}
              </span>
              <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What a session sounds like ── */}
      <section className="glass mx-auto max-w-3xl rounded-3xl p-8 sm:p-10">
        <h2 className="text-center text-2xl font-bold text-white">
          What five minutes in a room sounds like
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-500">
          (an example — your mistakes will be different, and that&apos;s the point)
        </p>
        <div className="mt-8 space-y-4 text-sm">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-white">
              K
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-white/5 px-4 py-2.5 text-zinc-200">
              &ldquo;Ayer yo… <span className="text-zinc-400">fui a el cine</span>…
              con mi hermana.&rdquo;
            </div>
          </div>
          <div className="flex flex-row-reverse gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-xs font-bold text-white">
              M
            </span>
            <div className="rounded-2xl rounded-tr-sm bg-white/5 px-4 py-2.5 text-zinc-200">
              &ldquo;¡Muy bien! Casi perfecto — decimos{" "}
              <strong className="text-emerald-300">fui al cine</strong>. ¿Qué película viste?&rdquo;
            </div>
          </div>
          <div className="mx-auto w-fit rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
            📌 María pinned to the support panel:&nbsp;
            <span className="font-semibold">a + el = al → &ldquo;fui al cine&rdquo;</span>
          </div>
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-white">
              K
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-white/5 px-4 py-2.5 text-zinc-200">
              &ldquo;¡Fui <strong className="text-emerald-300">al</strong> cine!
              Vi una película de terror…&rdquo; 🎉
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-400">
          The conversation never stopped. The correction is saved in the panel
          for later. <span className="text-zinc-200">That&apos;s how speaking gets easy.</span>
        </p>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-4xl text-center">
        <h2 className="text-2xl font-bold text-white">
          Three steps to your first conversation
        </h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {STEPS.map(([n, title, text]) => (
            <div key={n} className="relative">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
                {n}
              </span>
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="glass glow mx-auto max-w-3xl rounded-3xl p-10 text-center sm:p-14">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Your next language is a<br />
          <span className="gradient-text">conversation away.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-zinc-400">
          Free to join. Your first room is thirty seconds from here — and
          someone in it is learning your language too.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          {session ? (
            <Link href="/rooms" className={`${buttonClass} px-10 py-3.5 text-base`}>
              Find your room →
            </Link>
          ) : (
            <Link href="/signup" className={`${buttonClass} px-10 py-3.5 text-base`}>
              Create your free account
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
