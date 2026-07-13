# Module: media (SFU integration)

Multi-party video/voice rides a self-hosted **LiveKit SFU**. Architecture
rationale (SFU vs. mesh, LiveKit vs. mediasoup/Janus) is in
`docs/architecture.md`.

## Join flow

1. Client `POST /api/rooms/:id/join`.
2. Backend enforces **all** admission policy first (`decideJoin`): rate
   limits (30 joins/10 min per user; 5 rejoins/10 min per user+room to deter
   kick-evasion and scanning), consent, lock, capacity, bans/blocks (M6).
3. On admit: `RoomParticipant` upserted (creator becomes HOST; rejoins keep
   the stored role), and a **2-hour LiveKit access token** is minted
   (`lib/livekit.ts`), scoped to exactly that room, identity = user id.
4. Client connects to LiveKit's WebSocket signaling endpoint
   (`NEXT_PUBLIC_LIVEKIT_URL`) with the token; the SFU handles SDP/ICE
   negotiation, simulcast, and forwarding.

## Token grants (`grantsForParticipant`, unit-tested)

| room type | role | canPublish | sources |
| --- | --- | --- | --- |
| normal | anyone | ✔ | camera, mic, screen share |
| voice-only | anyone | ✔ | **microphone only** (enforced server-side by grant, not UI) |
| moderated | participant | ✘ (listen-only; raise-hand in M5) | — |
| moderated | host/moderator | ✔ | per room type |

`canPublishData` stays true for everyone — the support panel and raise-hand
signals use LiveKit's reliable data channels.

## Room state authority

Postgres is the source of truth for who is in a room:

- join API marks presence immediately (capacity checks can't be raced by
  webhook lag);
- `POST /api/rooms/:id/leave` (sent via `navigator.sendBeacon` on disconnect
  — instant-leave path) marks departure;
- LiveKit **webhooks** (`/api/livekit/webhook`) reconcile reality:
  `participant_joined` / `participant_left` / `room_finished`. Signatures are
  verified with the SDK's `WebhookReceiver`; unsigned requests get 401.

## Client (`components/room/RoomClient.tsx`)

`@livekit/components-react`: `GridLayout` + `ParticipantTile` render the
multi-participant grid with **active-speaker outline**, per-tile
**connection-quality indicator**, mute badges, and name labels.
`ControlBar` provides mic/camera toggles and leave; `RoomAudioRenderer`
plays the group audio; `ConnectionStateToast` surfaces the client's
automatic **reconnect** attempts. Voice-only rooms render an audio-tile grid
and hide camera controls.

## NAT traversal

LiveKit embeds STUN handling and a TURN server (`livekit.yaml`): TURN/UDP
3479 in dev; production should enable TURN/TLS with real certificates and
`use_external_ip: true`. WebRTC-over-TCP (7891) is the last-resort fallback.

## Verified

- Browser → `signal connected` → `connected to LiveKit 1.9.12` (protocol 16).
- Webhooks delivered and applied: directory count 1 → 0 on leave.
- Unsigned webhook rejected 401.
