import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
  WebhookReceiver,
} from "livekit-server-sdk";
import type { RoomRole } from "@prisma/client";
import { env } from "@/lib/env";

/**
 * LiveKit integration (see docs/modules/media.md).
 *
 * Every LanguageRooms room maps 1:1 to a LiveKit room whose name is the Room
 * id. Clients never talk to LiveKit without a short-lived access token minted
 * here — all admission policy runs in our backend first (lib/rooms.decideJoin).
 */

/** Grants derived from room type + participant role. Pure — unit-tested. */
export function grantsForParticipant(input: {
  roomId: string;
  role: RoomRole;
  isVoiceOnly: boolean;
  /** Moderated rooms: non-hosts start listen-only and raise a hand (M5). */
  isModerated: boolean;
}) {
  const elevated = input.role === "HOST" || input.role === "MODERATOR";
  const listenOnly = input.isModerated && !elevated;
  return {
    roomJoin: true as const,
    room: input.roomId,
    canSubscribe: true,
    canPublish: !listenOnly,
    canPublishData: true, // support panel + raise-hand signals for everyone
    canPublishSources: input.isVoiceOnly
      ? [TrackSource.MICROPHONE]
      : [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE],
  };
}

export async function mintRoomToken(input: {
  userId: string;
  displayName: string;
  roomId: string;
  role: RoomRole;
  isVoiceOnly: boolean;
  isModerated: boolean;
}): Promise<string> {
  const at = new AccessToken(env().LIVEKIT_API_KEY, env().LIVEKIT_API_SECRET, {
    identity: input.userId,
    name: input.displayName,
    ttl: "2h",
    metadata: JSON.stringify({ role: input.role }),
  });
  at.addGrant(
    grantsForParticipant({
      roomId: input.roomId,
      role: input.role,
      isVoiceOnly: input.isVoiceOnly,
      isModerated: input.isModerated,
    }),
  );
  return at.toJwt();
}

let roomService: RoomServiceClient | null = null;

/** Server-side room control (mute, kick, metadata) — used by host controls (M5). */
export function livekitRoomService(): RoomServiceClient {
  if (!roomService) {
    roomService = new RoomServiceClient(
      env().LIVEKIT_HOST,
      env().LIVEKIT_API_KEY,
      env().LIVEKIT_API_SECRET,
    );
  }
  return roomService;
}

let receiver: WebhookReceiver | null = null;

/** Validates webhook authenticity (signed JWT in the Authorization header). */
export function livekitWebhookReceiver(): WebhookReceiver {
  if (!receiver) {
    receiver = new WebhookReceiver(
      env().LIVEKIT_API_KEY,
      env().LIVEKIT_API_SECRET,
    );
  }
  return receiver;
}
