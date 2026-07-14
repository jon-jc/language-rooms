/**
 * Two counter-scrolling rows of example rooms — a feel for the directory's
 * breadth. Pure CSS animation (content duplicated for a seamless loop),
 * pauses on hover, fades at the edges.
 */

interface ExampleRoom {
  flag: string;
  name: string;
  level: string;
  count: number;
  mode?: string;
}

const ROW_A: ExampleRoom[] = [
  { flag: "🇪🇸", name: "Spanish – Beginner free talk", level: "A1", count: 7 },
  { flag: "🇯🇵", name: "日本語 Conversation Club", level: "B1", count: 11 },
  { flag: "🇫🇷", name: "Café français — débutants bienvenus", level: "A2", count: 5 },
  { flag: "🇬🇧", name: "English job-interview practice", level: "B2", count: 9, mode: "✋" },
  { flag: "🇩🇪", name: "Deutsch am Abend", level: "B1", count: 6 },
  { flag: "🇰🇷", name: "한국어 K-drama talk", level: "A2", count: 12 },
  { flag: "🇮🇹", name: "Aperitivo italiano 🍝", level: "all", count: 8 },
];

const ROW_B: ExampleRoom[] = [
  { flag: "🇧🇷", name: "Português do Brasil — música e papo", level: "B1", count: 10 },
  { flag: "🇨🇳", name: "中文角 Chinese Corner", level: "A1", count: 6, mode: "✋" },
  { flag: "🇺🇦", name: "Українська для друзів", level: "all", count: 4 },
  { flag: "🇸🇦", name: "العربية — دردشة مسائية", level: "A2", count: 7 },
  { flag: "🇷🇺", name: "Русский разговорный вечер", level: "B2", count: 9 },
  { flag: "🇹🇷", name: "Türkçe pratik — çay saati ☕", level: "A1", count: 5 },
  { flag: "🇻🇳", name: "Tiếng Việt cho người mới", level: "A1", count: 3 },
];

function RoomPill({ room }: { room: ExampleRoom }) {
  return (
    <div className="glass flex w-72 shrink-0 items-center gap-3 rounded-2xl px-4 py-3">
      <span className="text-2xl">{room.flag}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{room.name}</p>
        <p className="text-xs text-zinc-500">
          {room.level === "all" ? "all levels" : room.level}
          {room.mode ? " · moderated" : ""}
        </p>
      </div>
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {room.count}
      </span>
    </div>
  );
}

export default function RoomMarquee() {
  return (
    <div className="space-y-4">
      <div className="marquee">
        <div className="marquee-track marquee-left">
          {[...ROW_A, ...ROW_A].map((room, i) => (
            <RoomPill key={`a-${i}`} room={room} />
          ))}
        </div>
      </div>
      <div className="marquee">
        <div className="marquee-track marquee-right">
          {[...ROW_B, ...ROW_B].map((room, i) => (
            <RoomPill key={`b-${i}`} room={room} />
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-zinc-600">
        Example rooms — the live directory changes all day long.
      </p>
    </div>
  );
}
