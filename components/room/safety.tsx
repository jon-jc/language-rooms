"use client";

import { useEffect } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";

/** Draw the first attached <video> of a track to a JPEG data URL. */
export function captureVideoFrame(el: HTMLVideoElement | undefined): string | null {
  if (!el || el.videoWidth === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(el.videoWidth, 1280);
  canvas.height = Math.round((canvas.width / el.videoWidth) * el.videoHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null; // tainted canvas or codec quirk — report proceeds frameless
  }
}

/**
 * Defense-in-depth for blocks created mid-session: if a blocked counterparty
 * is somehow co-present (the join API already prevents new co-presence),
 * their audio is muted locally. Video tiles are filtered out in MediaStage.
 */
export function BlockEnforcer({ hiddenUserIds }: { hiddenUserIds: string[] }) {
  const remotes = useRemoteParticipants();

  useEffect(() => {
    for (const p of remotes) {
      if (hiddenUserIds.includes(p.identity)) {
        p.setVolume(0);
      }
    }
  }, [remotes, hiddenUserIds]);

  return null;
}

const SAMPLE_INTERVAL_MS = 60_000;
const FIRST_SAMPLE_MS = 5_000;

/**
 * Automated content-moderation sampling (disclosed in the consent flow):
 * periodically captures a frame of the local participant's own outgoing
 * camera track and posts it to the scanning endpoint. Production replaces
 * client sampling with server-side LiveKit Egress sampling — see
 * docs/abuse-handling.md#automated-scanning.
 */
export function FrameSampler({ roomId }: { roomId: string }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!localParticipant) return;

    const sample = () => {
      const pub = localParticipant.getTrackPublication(Track.Source.Camera);
      const el = pub?.track?.attachedElements?.[0] as HTMLVideoElement | undefined;
      const frame = captureVideoFrame(el);
      if (!frame) return;
      fetch("/api/moderation/frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, frame }),
        keepalive: true,
      }).catch(() => {});
    };

    const first = setTimeout(sample, FIRST_SAMPLE_MS);
    const interval = setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [localParticipant, roomId]);

  return null;
}
