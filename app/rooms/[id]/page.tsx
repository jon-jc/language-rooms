import { notFound } from "next/navigation";
import { requireOnboardedUserPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { languageName } from "@/lib/languages";
import { Card } from "@/components/ui";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOnboardedUserPage();
  const { id } = await params;

  const room = await db.room.findUnique({
    where: { id },
    include: {
      createdBy: { select: { displayName: true } },
      participants: {
        where: { leftAt: null },
        include: { user: { select: { displayName: true } } },
      },
    },
  });
  if (!room || room.isTakenDown) notFound();

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{room.name}</h1>
            <p className="text-sm text-zinc-400">
              {languageName(room.languageCode)}
              {room.level ? ` · ${room.level}` : " · all levels"} · host{" "}
              {room.createdBy.displayName}
              {room.topic ? ` · ${room.topic}` : ""}
            </p>
          </div>
          <span className="text-sm text-zinc-400">
            {room.participants.length}/{room.capacity}
          </span>
        </div>
      </Card>
      {/* Live media (video grid + voice) arrives with milestone M4. */}
      <Card>
        <p className="text-sm text-zinc-400">
          Hi {user.displayName} — the live video/voice experience for this room is
          being connected in the next milestone (M4: SFU media). Room joining,
          admission checks, and the in-room experience land there.
        </p>
      </Card>
    </div>
  );
}
