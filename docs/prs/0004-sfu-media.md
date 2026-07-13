# PR #4 — M4: SFU media — multi-party video & voice

- **Branch:** `milestone/04-sfu-media`
- **Date:** 2026-07-13
- **Status:** merged

## What this delivers

- **LiveKit integration** (`lib/livekit.ts`): access-token minting with
  role/room-type-derived grants (voice-only rooms are mic-only *by grant*;
  moderated rooms make non-hosts listen-only), RoomServiceClient for M5
  host controls, WebhookReceiver.
- **Join API** (`POST /api/rooms/:id/join`): admission fully server-side via
  `decideJoin` + rate limits (join 30/10min/user, rejoin 5/10min/user+room);
  upserts presence; returns token + WS URL. Blocked users will see
  "room full" (M6 wiring point present).
- **Leave API** + `sendBeacon` on disconnect for instant, authoritative
  departure.
- **Webhook endpoint** (`/api/livekit/webhook`): signature-verified;
  reconciles `participant_joined/left`, `room_finished` into Postgres.
- **In-room UI** (`components/room/RoomClient.tsx`): multi-participant
  `GridLayout` with active-speaker highlighting, per-tile connection-quality
  indicators, mic/cam controls, leave button, reconnect toast, voice-only
  variant.

## Verification

- `npm test` → 47/47 (incl. grant matrix and a minted token verified against
  the API secret with issuer + video grants asserted).
- `npm run build` → clean.
- **Live browser test**: login → directory → join → console shows
  `signal connecting to ws://localhost:7890/rtc/v1` → `signal connected` →
  `connected to LiveKit Server 1.9.12` → state `connected`. (Device capture
  itself is blocked by the test browser's permission sandbox.)
- LiveKit server log shows both webhooks delivered; participant count
  observed 0 → 1 → 0 across join/leave.
- Unsigned webhook POST → 401.
