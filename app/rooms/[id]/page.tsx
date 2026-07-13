import { notFound } from "next/navigation";
import { requireOnboardedUserPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { languageName } from "@/lib/languages";
import RoomClient from "@/components/room/RoomClient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOnboardedUserPage();
  const { id } = await params;

  const room = await db.room.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      topic: true,
      languageCode: true,
      level: true,
      isTakenDown: true,
      createdBy: { select: { displayName: true } },
    },
  });
  if (!room || room.isTakenDown) notFound();

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold">{room.name}</h1>
          <p className="text-xs text-zinc-500">
            {languageName(room.languageCode)}
            {room.level ? ` · ${room.level}` : " · all levels"} · host{" "}
            {room.createdBy.displayName}
            {room.topic ? ` — ${room.topic}` : ""}
          </p>
        </div>
      </div>
      <RoomClient
        roomId={room.id}
        user={{ id: user.id, displayName: user.displayName }}
      />
    </div>
  );
}
