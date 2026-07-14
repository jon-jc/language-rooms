import Link from "next/link";
import { readSession } from "@/lib/auth/session";
import { buttonClass, buttonSecondaryClass, SectionHeading } from "@/components/ui";
import {
  IconArrowRight,
  IconHand,
  IconMessage,
  IconPen,
  IconShield,
  IconUsers,
  IconVideo,
} from "@/components/icons";
import RotatingGreeting from "@/components/marketing/RotatingGreeting";
import MockRoom from "@/components/marketing/MockRoom";
import RoomMarquee from "@/components/marketing/RoomMarquee";

const FEATURES = [
  {
    icon: IconVideo,
    title: "Rooms, not roulette",
    text: "Browse persistent rooms by language and CEFR level instead of being randomly paired. See the topic and who's inside before you join.",
  },
  {
    icon: IconUsers,
    title: "Group video & voice",
    text: "Up to 20 people on camera (more voice-only) with active speakers highlighted live — a real conversation table, not a call queue.",
  },
  {
    icon: IconPen,
    title: "Shared whiteboards",
    text: "Sketch grammar, upload photos of textbook pages or menus, and annotate together in real time while you talk.",
  },
  {
    icon: IconMessage,
    title: "Corrections that stick",
    text: "A support panel for corrections, vocabulary, and links — with translation assist — so the conversation never has to stop.",
  },
  {
    icon: IconHand,
    title: "Classroom mode",
    text: "Hosts can run moderated sessions where learners raise a hand to speak. Perfect for structured practice and shy beginners.",
  },
  {
    icon: IconShield,
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
    <div className="relative space-y-28 pb-16">
      {/* Aurora backdrop for the hero */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[36rem] w-full max-w-5xl -translate-x-1/2">
        <div className="aurora aurora-a left-[10%] top-0 h-80 w-80 bg-[#6d66ff]" />
        <div className="aurora aurora-b right-[8%] top-16 h-72 w-72 bg-[#c26bff]" />
        <div className="aurora aurora-a bottom-0 left-[38%] h-64 w-64 bg-[#3fd6f5]" />
      </div>

      {/* ── Hero ── */}
      <section className="rise-in mx-auto max-w-3xl pt-12 text-center">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Live rooms in 32 languages — right now
        </p>
        <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-7xl">
          Say <RotatingGreeting />
          <br />
          to real people.
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-zinc-400">
          Apps teach you words.{" "}
          <span className="text-zinc-200">Conversations teach you the language.</span>{" "}
          Walk into a live video room like &ldquo;Spanish – Beginner&rdquo; or
          &ldquo;Japanese Conversation&rdquo; and start talking — with a shared
          whiteboard and gentle corrections built in.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {session ? (
            <Link href="/rooms" className={`${buttonClass} !px-8 !py-3 !text-base`}>
              Browse live rooms <IconArrowRight size={17} />
            </Link>
          ) : (
            <>
              <Link href="/signup" className={`${buttonClass} !px-8 !py-3 !text-base`}>
                Start speaking — it&apos;s free
              </Link>
              <Link href="/login" className={`${buttonSecondaryClass} !px-8 !py-3 !text-base`}>
                Sign in
              </Link>
            </>
          )}
        </div>
        <p className="mt-5 text-xs text-zinc-600">
          No installs. Works in your browser. Camera optional.
        </p>
      </section>

      {/* ── Live mock of the product ── */}
      <section className="rise-in rise-in-1">
        <MockRoom />
        <p className="mt-5 text-center text-sm text-zinc-500">
          This is the room. Four learners, one active speaker, corrections landing
          in the side panel — <span className="text-zinc-300">without interrupting anyone</span>.
        </p>
      </section>

      {/* ── Stats band ── */}
      <section className="glass mx-auto grid max-w-4xl grid-cols-2 gap-8 rounded-3xl p-9 sm:grid-cols-4">
        {STATS.map(([big, small]) => (
          <div key={small} className="text-center">
            <p className="gradient-text text-[2rem] font-extrabold tracking-tight">{big}</p>
            <p className="mt-1 text-xs leading-snug text-zinc-500">{small}</p>
          </div>
        ))}
      </section>

      {/* ── Room marquee ── */}
      <section>
        <SectionHeading
          eyebrow="The directory"
          title="There's a table for you"
          sub="Free talk, interview prep, K-drama debriefs, café chats — rooms are organized by language and CEFR level, so you're never out of your depth."
        />
        <RoomMarquee />
      </section>

      {/* ── Features ── */}
      <section>
        <SectionHeading
          eyebrow="Why it works"
          title="Built for practice, not small talk"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`glass glass-hover rise-in rise-in-${(i % 3) + 1} rounded-2xl p-6`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[#8b85ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <f.icon size={19} />
              </span>
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What a session sounds like ── */}
      <section className="glass mx-auto max-w-3xl rounded-3xl p-8 sm:p-10">
        <SectionHeading
          eyebrow="Five minutes inside"
          title="What a session sounds like"
          sub="(an example — your mistakes will be different, and that's the point)"
        />
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6d66ff] to-[#3fd6f5] text-xs font-bold text-white">
              K
            </span>
            <div className="rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-zinc-200">
              &ldquo;Ayer yo… <span className="text-zinc-400">fui a el cine</span>… con mi hermana.&rdquo;
            </div>
          </div>
          <div className="flex flex-row-reverse gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-xs font-bold text-white">
              M
            </span>
            <div className="rounded-2xl rounded-tr-sm border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-zinc-200">
              &ldquo;¡Muy bien! Casi perfecto — decimos{" "}
              <strong className="text-emerald-300">fui al cine</strong>. ¿Qué película viste?&rdquo;
            </div>
          </div>
          <div className="mx-auto w-fit rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
            📌 María pinned to the support panel:&nbsp;
            <span className="font-semibold">a + el = al → &ldquo;fui al cine&rdquo;</span>
          </div>
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6d66ff] to-[#3fd6f5] text-xs font-bold text-white">
              K
            </span>
            <div className="rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-zinc-200">
              &ldquo;¡Fui <strong className="text-emerald-300">al</strong> cine! Vi una película de terror…&rdquo; 🎉
            </div>
          </div>
        </div>
        <p className="mt-7 text-center text-sm text-zinc-400">
          The conversation never stopped. The correction is saved for later.{" "}
          <span className="text-zinc-200">That&apos;s how speaking gets easy.</span>
        </p>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-4xl text-center">
        <SectionHeading eyebrow="Getting started" title="Three steps to your first conversation" />
        <div className="grid gap-10 sm:grid-cols-3">
          {STEPS.map(([n, title, text]) => (
            <div key={n}>
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#6d66ff] to-[#c26bff] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_-4px_rgba(109,102,255,0.6)]">
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
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
          Free to join. Your first room is thirty seconds from here — and someone
          in it is learning your language too.
        </p>
        <div className="mt-9 flex justify-center">
          {session ? (
            <Link href="/rooms" className={`${buttonClass} !px-10 !py-3.5 !text-base`}>
              Find your room <IconArrowRight size={17} />
            </Link>
          ) : (
            <Link href="/signup" className={`${buttonClass} !px-10 !py-3.5 !text-base`}>
              Create your free account
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
