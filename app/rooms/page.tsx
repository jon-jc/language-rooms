import Link from "next/link";
import { requireOnboardedUserPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildRoomWhere, roomFilterSchema } from "@/lib/rooms";
import { CEFR_LEVELS, LANGUAGES, languageFlag, languageName } from "@/lib/languages";
import { Badge, buttonClass, Card, inputClass } from "@/components/ui";

export const metadata = { title: "Rooms — LanguageRooms" };

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOnboardedUserPage();

  const raw = await searchParams;
  const parsed = roomFilterSchema.safeParse({
    language: typeof raw.language === "string" && raw.language ? raw.language : undefined,
    level: typeof raw.level === "string" && raw.level ? raw.level : undefined,
    q: typeof raw.q === "string" && raw.q ? raw.q : undefined,
  });
  const filter = parsed.success ? parsed.data : {};

  const rooms = await db.room.findMany({
    where: buildRoomWhere(filter),
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    include: {
      createdBy: { select: { displayName: true } },
      _count: { select: { participants: { where: { leftAt: null } } } },
    },
  });

  const selectClass = `${inputClass} w-auto`;

  return (
    <div className="space-y-6">
      <div className="rise-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Rooms</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Jump into a live conversation — or start your own.
          </p>
        </div>
        <Link href="/rooms/new" className={buttonClass}>
          + Create a room
        </Link>
      </div>

      <form method="get" className="glass flex flex-wrap gap-2 rounded-2xl p-3">
        <select name="language" defaultValue={filter.language ?? ""} className={selectClass}>
          <option value="">All languages</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>
        <select name="level" defaultValue={filter.level ?? ""} className={selectClass}>
          <option value="">All levels</option>
          {CEFR_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={filter.q ?? ""}
          placeholder="Search rooms…"
          className={`${inputClass} w-52`}
        />
        <button type="submit" className={buttonClass}>
          Filter
        </button>
      </form>

      {rooms.length === 0 ? (
        <Card className="text-center">
          <p className="text-4xl">🪐</p>
          <p className="mt-3 text-sm text-zinc-400">
            No rooms match those filters. Be the first —{" "}
            <Link href="/rooms/new" className="text-indigo-400 underline">
              create one
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, i) => {
            const count = room._count.participants;
            const full = count >= room.capacity;
            return (
              <div
                key={room.id}
                className={`glass rise-in rise-in-${(i % 3) + 1} group flex flex-col justify-between rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-indigo-400/30`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl">{languageFlag(room.languageCode)}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Badge tone="indigo">
                        {languageName(room.languageCode)}
                        {room.level ? ` · ${room.level}` : ""}
                      </Badge>
                      {!room.level ? <Badge>all levels</Badge> : null}
                      {room.isVoiceOnly ? <Badge>🎙 voice</Badge> : null}
                      {room.isModerated ? <Badge tone="amber">✋ moderated</Badge> : null}
                      {room.isLocked ? <Badge tone="amber">🔒 locked</Badge> : null}
                    </div>
                  </div>
                  <h2 className="mt-3 font-semibold text-white">{room.name}</h2>
                  {room.topic ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{room.topic}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-500">
                    hosted by {room.createdBy.displayName}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1.5 text-sm ${
                      full ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {count > 0 ? (
                      <span className="live-dot inline-block h-2 w-2 rounded-full bg-current" />
                    ) : null}
                    {count}/{room.capacity} inside
                  </span>
                  <Link href={`/rooms/${room.id}`} className={buttonClass} aria-disabled={full}>
                    Join →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
