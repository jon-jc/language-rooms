"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConnectionStateToast,
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTrackRefContext,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { buttonSecondaryClass, Card, ErrorNote } from "@/components/ui";
import SupportPanel from "@/components/room/SupportPanel";
import HostControls from "@/components/room/HostControls";
import ReportModal, { ReportTarget } from "@/components/room/ReportModal";
import { BlockEnforcer, captureVideoFrame, FrameSampler } from "@/components/room/safety";

interface JoinInfo {
  token: string;
  url: string;
  role: "HOST" | "MODERATOR" | "PARTICIPANT";
  hiddenUserIds: string[];
  room: {
    id: string;
    name: string;
    isVoiceOnly: boolean;
    isModerated: boolean;
    isLocked: boolean;
    capacity: number;
  };
}

/**
 * The live room: joins via POST /api/rooms/:id/join (all admission policy is
 * server-side), then connects to the LiveKit SFU over its WebSocket signaling
 * protocol. LiveKit's client handles ICE/TURN and automatic reconnection.
 */
export default function RoomClient({
  roomId,
  user,
}: {
  roomId: string;
  user: { id: string; displayName: string };
}) {
  const router = useRouter();
  const [join, setJoin] = useState<JoinInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const requestJoin = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/rooms/${roomId}/join`, { method: "POST" });
    if (res.ok) {
      setJoin(await res.json());
      return;
    }
    const data = await res.json().catch(() => null);
    if (data?.error?.code === "CONSENT_REQUIRED") {
      router.push("/consent");
      return;
    }
    setError(data?.error?.message ?? "Could not join the room.");
  }, [roomId, router]);

  useEffect(() => {
    requestJoin();
  }, [requestJoin]);

  const onLeave = useCallback(() => {
    // Best-effort authoritative leave; navigator.sendBeacon survives unload.
    try {
      navigator.sendBeacon(`/api/rooms/${roomId}/leave`);
    } catch {
      fetch(`/api/rooms/${roomId}/leave`, { method: "POST", keepalive: true });
    }
    router.push(`/rooms/${roomId}/rate`);
  }, [roomId, router]);

  if (error) {
    return (
      <Card className="mx-auto mt-10 max-w-md space-y-4 text-center">
        <ErrorNote message={error} />
        <div className="flex justify-center gap-2">
          <button onClick={requestJoin} className={buttonSecondaryClass}>
            Try again
          </button>
          <button onClick={() => router.push("/rooms")} className={buttonSecondaryClass}>
            Back to rooms
          </button>
        </div>
      </Card>
    );
  }

  if (!join) {
    return (
      <div className="mt-16 text-center text-sm text-zinc-400">
        Connecting to the room…
      </div>
    );
  }

  const isStaff = join.role === "HOST" || join.role === "MODERATOR";

  return (
    <div data-lk-theme="default" className="h-[calc(100vh-9rem)]">
      <LiveKitRoom
        token={join.token}
        serverUrl={join.url}
        connect
        video={!join.room.isVoiceOnly}
        audio
        onDisconnected={onLeave}
        className="flex h-full gap-3"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <MediaStage
            isVoiceOnly={join.room.isVoiceOnly}
            hiddenUserIds={join.hiddenUserIds}
            onReport={setReportTarget}
          />
          <RoomAudioRenderer />
          <ControlBar
            variation="minimal"
            controls={{
              microphone: true,
              camera: !join.room.isVoiceOnly,
              screenShare: false,
              chat: false,
              leave: true,
            }}
          />
        </div>
        {isStaff ? (
          <HostControls
            roomId={roomId}
            role={join.role as "HOST" | "MODERATOR"}
            isModerated={join.room.isModerated}
            isLocked={join.room.isLocked}
            capacity={join.room.capacity}
          />
        ) : null}
        <SupportPanel
          roomId={roomId}
          isModerated={join.room.isModerated}
          role={join.role}
          userId={user.id}
          displayName={user.displayName}
        />
        <BlockEnforcer hiddenUserIds={join.hiddenUserIds} />
        {!join.room.isVoiceOnly ? <FrameSampler roomId={roomId} /> : null}
        <ConnectionStateToast />
      </LiveKitRoom>
      {reportTarget ? (
        <ReportModal
          roomId={roomId}
          target={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Multi-participant grid. ParticipantTile provides active-speaker outline,
 * per-tile connection-quality indicator, mute state, and name label; the
 * overlay adds the per-participant Report button. Blocked counterparties'
 * tiles are filtered out entirely.
 */
function MediaStage({
  isVoiceOnly,
  hiddenUserIds,
  onReport,
}: {
  isVoiceOnly: boolean;
  hiddenUserIds: string[];
  onReport: (target: ReportTarget) => void;
}) {
  const tracks = useTracks(
    isVoiceOnly
      ? [{ source: Track.Source.Microphone, withPlaceholder: true }]
      : [
          { source: Track.Source.Camera, withPlaceholder: true },
          { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
    { onlySubscribed: false },
  ).filter((t) => !hiddenUserIds.includes(t.participant.identity));

  return (
    <GridLayout tracks={tracks} className="flex-1">
      <StageTile onReport={onReport} />
    </GridLayout>
  );
}

function StageTile({ onReport }: { onReport: (target: ReportTarget) => void }) {
  const trackRef = useTrackRefContext();
  const participant = trackRef.participant;

  return (
    <div className="relative h-full w-full">
      <ParticipantTile trackRef={trackRef} className="h-full" />
      {!participant.isLocal ? (
        <button
          title={`Report ${participant.name || participant.identity}`}
          aria-label={`Report ${participant.name || participant.identity}`}
          onClick={() =>
            onReport({
              userId: participant.identity,
              name: participant.name || participant.identity,
              captureFrames: () => {
                const pub = participant.getTrackPublication(Track.Source.Camera);
                const el = pub?.track?.attachedElements?.[0] as
                  | HTMLVideoElement
                  | undefined;
                const frame = captureVideoFrame(el);
                return frame ? [frame] : [];
              },
            })
          }
          className="absolute right-1.5 top-1.5 z-10 rounded bg-black/60 px-1.5 py-0.5 text-xs text-red-300 opacity-70 hover:opacity-100"
        >
          ⚑ Report
        </button>
      ) : null}
    </div>
  );
}
