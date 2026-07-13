import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { livekitWebhookReceiver } from "@/lib/livekit";
import { logger } from "@/lib/logger";

const log = logger("livekit-webhook");

/**
 * LiveKit lifecycle events keep Postgres room state authoritative:
 *  - participant_joined  → mark present (leftAt = null)
 *  - participant_left    → mark departed
 *  - room_finished       → mark everyone departed
 *
 * Authenticity: the SDK's WebhookReceiver verifies the signed JWT in the
 * Authorization header against our API secret; unsigned requests are 401.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let event;
  try {
    event = await livekitWebhookReceiver().receive(body, authHeader);
  } catch (err) {
    log.warn({ err }, "rejected webhook with invalid signature");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const roomId = event.room?.name;
  const userId = event.participant?.identity;

  try {
    switch (event.event) {
      case "participant_joined":
        if (roomId && userId) {
          await db.roomParticipant.updateMany({
            where: { roomId, userId },
            data: { leftAt: null },
          });
        }
        break;
      case "participant_left":
        if (roomId && userId) {
          await db.roomParticipant.updateMany({
            where: { roomId, userId, leftAt: null },
            data: { leftAt: new Date() },
          });
        }
        break;
      case "room_finished":
        if (roomId) {
          await db.roomParticipant.updateMany({
            where: { roomId, leftAt: null },
            data: { leftAt: new Date() },
          });
        }
        break;
      default:
        break; // other events (track_published etc.) are not state we mirror
    }
  } catch (err) {
    log.error({ err, event: event.event }, "failed to apply webhook event");
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  log.debug({ event: event.event, roomId, userId }, "webhook applied");
  return NextResponse.json({ ok: true });
}
