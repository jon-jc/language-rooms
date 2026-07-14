import Link from "next/link";
import { requireOnboardedUserPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildRoomWhere, roomFilterSchema } from "@/lib/rooms";
import { CEFR_LEVELS, LANGUAGES, languageFlag, languageName } from "@/lib/languages";
import { Badge, buttonClass, Card, inputClass } from "@/components/ui";
import {
  IconArrowRight,
  IconHand,
  IconLock,
  IconMic,
  IconPlus,
  IconSearch,
} from "@/components/icons";

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
      <div className="rise-in flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Directory</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Rooms</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Jump into a live conversation — or start your own table.
          </p>
        </div>
        <Link href="/rooms/new" className={buttonClass}>
          <IconPlus size={16} /> Create a room
        </Link>
      </div>

      <form method="get" className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="relative min-w-52 flex-1">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            name="q"
            defaultValue={filter.q ?? ""}
            placeholder="Search rooms and topics…"
            className={`${inputClass} !pl-9`}
          />
        </div>
        <select name="language" defaultValue={filter.language ?? ""} className={`${inputClass} !w-44`}>
          <option value="">All languages</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>
        <select name="level" defaultValue={filter.level ?? ""} className={`${inputClass} !w-32`}>
          <option value="">All levels</option>
          {CEFR_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      {rooms.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="text-4xl">🪐</p>
          <h2 className="mt-4 font-semibold text-white">Nothing here yet</h2>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-zinc-500">
            No rooms match those filters. Start the conversation — someone will join.
          </p>
          <Link href="/rooms/new" className={`${buttonClass} mt-6`}>
            <IconPlus size={16} /> Create the first room
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, i) => {
            const count = room._count.participants;
            const full = count >= room.capacity;
            return (
              <div
                key={room.id}
                className={`glass glass-hover rise-in rise-in-${(i % 3) + 1} flex flex-col justify-between rounded-2xl p-5`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      {languageFlag(room.languageCode)}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Badge tone="indigo">
                        {languageName(room.languageCode)}
                        {room.level ? ` · ${room.level}` : ""}
                      </Badge>
                      {!room.level ? <Badge>all levels</Badge> : null}
                      {room.isVoiceOnly ? (
                        <Badge>
                          <IconMic size={11} /> voice
                        </Badge>
                      ) : null}
                      {room.isModerated ? (
                        <Badge tone="amber">
                          <IconHand size={11} /> moderated
                        </Badge>
                      ) : null}
                      {room.isLocked ? (
                        <Badge tone="amber">
                          <IconLock size={11} /> locked
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <h2 className="mt-4 font-semibold leading-snug text-white">{room.name}</h2>
                  {room.topic ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{room.topic}</p>
                  ) : null}
                  <p className="mt-2.5 text-xs text-zinc-500">
                    hosted by {room.createdBy.displayName}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1.5 text-[13px] font-medium ${
                      full ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {count > 0 ? (
                      <span className="live-dot inline-block h-2 w-2 rounded-full bg-current" />
                    ) : null}
                    {count}/{room.capacity} inside
                  </span>
                  <Link
                    href={`/rooms/${room.id}`}
                    className={`${buttonClass} !px-4 !py-1.5 !text-[13px]`}
                    aria-disabled={full}
                  >
                    Join <IconArrowRight size={14} />
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
