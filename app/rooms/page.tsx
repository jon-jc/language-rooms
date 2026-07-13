import Link from "next/link";
import { requireOnboardedUserPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildRoomWhere, roomFilterSchema } from "@/lib/rooms";
import { CEFR_LEVELS, LANGUAGES, languageName } from "@/lib/languages";
import { buttonClass, Card } from "@/components/ui";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Rooms</h1>
        <Link href="/rooms/new" className={buttonClass}>
          Create a room
        </Link>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <select
          name="language"
          defaultValue={filter.language ?? ""}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value="">All languages</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          name="level"
          defaultValue={filter.level ?? ""}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
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
          className="w-48 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm placeholder-zinc-600"
        />
        <button type="submit" className={buttonClass}>
          Filter
        </button>
      </form>

      {rooms.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-400">
            No rooms match. Be the first —{" "}
            <Link href="/rooms/new" className="text-indigo-400 underline">
              create one
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const count = room._count.participants;
            const full = count >= room.capacity;
            return (
              <Card key={room.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-white">{room.name}</h2>
                    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                      {languageName(room.languageCode)}
                      {room.level ? ` · ${room.level}` : " · all levels"}
                    </span>
                  </div>
                  {room.topic ? (
                    <p className="mt-1 text-sm text-zinc-400">{room.topic}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-500">
                    {room.isVoiceOnly ? "Voice-only" : "Video"} · host{" "}
                    {room.createdBy.displayName}
                    {room.isModerated ? " · moderated" : ""}
                    {room.isLocked ? " · locked" : ""}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`text-sm ${full ? "text-amber-400" : "text-emerald-400"}`}
                  >
                    {count}/{room.capacity} inside
                  </span>
                  <Link
                    href={`/rooms/${room.id}`}
                    className={buttonClass}
                    aria-disabled={full}
                  >
                    Join
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
