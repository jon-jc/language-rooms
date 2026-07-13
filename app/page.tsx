import Link from "next/link";
import { readSession } from "@/lib/auth/session";
import { buttonClass, buttonSecondaryClass, Card } from "@/components/ui";

export default async function HomePage() {
  const session = await readSession();

  return (
    <div className="mt-10 space-y-10">
      <section className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Practice languages <span className="text-indigo-400">out loud</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
          Persistent video and voice rooms organized by language and level. Join
          &ldquo;Spanish – Beginner&rdquo; or &ldquo;Japanese Conversation&rdquo;, turn on your
          camera, and talk with other learners — like TinyChat, built for language
          learning. Adults (18+) only.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {session ? (
            <Link href="/rooms" className={buttonClass}>
              Browse rooms
            </Link>
          ) : (
            <>
              <Link href="/signup" className={buttonClass}>
                Join — 18+ only
              </Link>
              <Link href="/login" className={buttonSecondaryClass}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="font-semibold text-white">Rooms, not roulette</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Browse persistent rooms by language and CEFR level instead of being
            randomly paired. See who&apos;s inside before you join.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold text-white">Group video &amp; voice</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Multi-party video grid with group audio — everyone can speak, cameras
            optional. Text is just for corrections and vocabulary.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold text-white">Safe by design</h2>
          <p className="mt-1 text-sm text-zinc-400">
            18+ with verified age at signup, host moderation, one-click reporting
            and blocking, and a real enforcement pipeline behind it.
          </p>
        </Card>
      </section>
    </div>
  );
}
