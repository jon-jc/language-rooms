"use client";

import { useCallback, useState } from "react";
import {
  useDataChannel,
  useRemoteParticipants,
} from "@livekit/components-react";
import { decodeSignal, HandSignal } from "@/components/room/signals";

interface RaisedHand {
  userId: string;
  name: string;
}

/**
 * Host/moderator panel: per-participant mute/kick/promote (+ grant/revoke
 * speak in moderated rooms), room lock and capacity. Every button calls the
 * server-authorized moderate API — nothing here is a client-side-only power.
 */
export default function HostControls({
  roomId,
  role,
  isModerated,
  isLocked: initialLocked,
  capacity: initialCapacity,
}: {
  roomId: string;
  role: "HOST" | "MODERATOR";
  isModerated: boolean;
  isLocked: boolean;
  capacity: number;
}) {
  const remoteParticipants = useRemoteParticipants();
  const [hands, setHands] = useState<RaisedHand[]>([]);
  const [locked, setLocked] = useState(initialLocked);
  const [capacity, setCapacity] = useState(initialCapacity);
  const [error, setError] = useState<string | null>(null);

  useDataChannel("hand", (msg) => {
    const signal = decodeSignal<HandSignal>(msg.payload);
    if (signal?.t !== "hand") return;
    setHands((prev) => {
      const without = prev.filter((h) => h.userId !== signal.userId);
      return signal.up ? [...without, { userId: signal.userId, name: signal.name }] : without;
    });
  });

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      setError(null);
      const res = await fetch(`/api/rooms/${roomId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Action failed.");
        return false;
      }
      return true;
    },
    [roomId],
  );

  async function grantSpeak(userId: string) {
    if (await act({ action: "grantSpeak", targetUserId: userId })) {
      setHands((prev) => prev.filter((h) => h.userId !== userId));
    }
  }

  const btn =
    "rounded-full px-2 py-0.5 text-[11px] font-medium border border-white/12 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.09] hover:text-white";

  return (
    <aside className="panel flex w-64 shrink-0 flex-col gap-3 rounded-2xl !border-amber-500/20 p-3">
      <div>
        <h2 className="text-sm font-semibold text-amber-300">
          {role === "HOST" ? "Host controls" : "Moderator controls"}
        </h2>
        {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      </div>

      {role === "HOST" ? (
        <div className="space-y-2 rounded-xl border border-white/[0.05] bg-white/[0.03] p-2.5">
          <label className="flex items-center justify-between text-xs text-zinc-300">
            <span>Room locked</span>
            <input
              type="checkbox"
              checked={locked}
              onChange={async (e) => {
                const lock = e.target.checked;
                if (await act({ action: lock ? "lock" : "unlock" })) setLocked(lock);
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-xs text-zinc-300">
            <span>Capacity</span>
            <input
              type="number"
              min={2}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              onBlur={() => act({ action: "setCapacity", capacity })}
              className="input !w-16 !rounded-lg !px-2 !py-0.5 !text-right !text-xs"
            />
          </label>
        </div>
      ) : null}

      {isModerated && hands.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase text-zinc-400">
            Raised hands
          </h3>
          {hands.map((h) => (
            <div
              key={h.userId}
              className="flex items-center justify-between rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-2.5 py-1.5"
            >
              <span className="text-xs text-zinc-200">✋ {h.name}</span>
              <button className={btn} onClick={() => grantSpeak(h.userId)}>
                Allow to speak
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        <h3 className="text-xs font-semibold uppercase text-zinc-400">
          Participants ({remoteParticipants.length + 1})
        </h3>
        {remoteParticipants.map((p) => (
          <div key={p.identity} className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-2.5 py-2">
            <p className="truncate text-xs font-medium text-zinc-200">
              {p.name || p.identity}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                className={btn}
                onClick={() => act({ action: "mute", targetUserId: p.identity })}
              >
                Mute
              </button>
              <button
                className={`${btn} !border-rose-500/25 !text-rose-300 hover:!bg-rose-500/10`}
                onClick={() => act({ action: "kick", targetUserId: p.identity })}
              >
                Kick
              </button>
              {role === "HOST" ? (
                <button
                  className={btn}
                  onClick={() => act({ action: "promote", targetUserId: p.identity })}
                >
                  Promote
                </button>
              ) : null}
              {isModerated ? (
                <button
                  className={btn}
                  onClick={() => act({ action: "revokeSpeak", targetUserId: p.identity })}
                >
                  Revoke mic
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {remoteParticipants.length === 0 ? (
          <p className="text-xs text-zinc-600">No one else here yet.</p>
        ) : null}
      </div>
    </aside>
  );
}
