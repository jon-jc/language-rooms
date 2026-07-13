# Architecture

## Overview

LanguageRooms is a multi-user, room-based video/voice platform for language
practice. The system has three runtime components:

1. **Next.js app** (App Router) — all UI, all HTTP APIs, authentication,
   authorization, room directory, moderation. Talks to Postgres via Prisma.
2. **LiveKit SFU** — media plane. Every room maps 1:1 to a LiveKit room.
   Clients connect to LiveKit over its WebSocket signaling protocol using
   short-lived JWT access tokens minted by the Next.js backend. LiveKit
   forwards each participant's audio/video to the others (SFU topology),
   runs ICE/STUN, and embeds a TURN server for NAT traversal.
3. **Postgres** — source of truth for users, profiles, rooms, membership,
   moderation state (reports, blocks, bans, strikes, audit log).

## Why an SFU (and why LiveKit)

With mesh P2P, each publisher uploads its stream once **per peer**: a
12-person video room means 11 outgoing encodes per client — infeasible on
consumer uplinks. An SFU receives each stream once and fans it out
server-side, so rooms scale to 12–20 video participants (more voice-only)
limited by server bandwidth, not client uplink.

LiveKit specifically because it is:
- **Self-hostable, single Go binary** — one container in dev, horizontally
  scalable with Redis in production.
- **A complete signaling layer** — a real WebSocket protocol handling join/
  leave, SDP/ICE negotiation, active-speaker events, connection-quality
  reports, and reliable data channels (used for raise-hand and the support
  panel). We do not need to hand-roll a Socket.IO signaling server that
  would then have to be kept consistent with the media state.
- **Operable for moderation** — server SDK exposes `removeParticipant`,
  `mutePublishedTrack`, room metadata updates; webhooks report room and
  participant lifecycle so Postgres room state stays authoritative.
- **Batteries included on the client** — `@livekit/components-react`
  provides the grid, active-speaker highlighting, and device controls.

Alternatives considered: **mediasoup** is a Node library, not a server — we
would own the SFU process, its signaling protocol, and scaling; more control,
much more surface area. **Janus** is C with a plugin model and a thinner
React ecosystem. For a product where moderation tooling matters as much as
media, LiveKit's server API is the decisive advantage.

## Signaling & room-state flow

```
join click ─► POST /api/rooms/:id/join  (authz: ban? blocked? full? locked?)
                 │ mints LiveKit token (identity = user id, room = room id,
                 │ grants reflect role: host/moderator/participant)
                 ▼
client ──WS──► LiveKit  (media negotiation, tracks, data channels)
                 │
LiveKit ──webhook──► /api/livekit/webhook  (participant_joined/left,
                 room_started/finished → Postgres RoomParticipant sync)
```

All *policy* decisions (who may join, capacity, locks, bans, blocks) are made
in the Next.js backend **before** a token is minted; LiveKit only admits
holders of valid tokens. In-room moderation actions call LiveKit's server API
and are recorded in the audit log.

## NAT traversal

LiveKit's ICE agent uses built-in STUN; the embedded TURN server
(`livekit.yaml → turn:`) relays media for clients behind symmetric NATs or
UDP-blocking firewalls (TURN/UDP 3478 in dev; TURN/TLS with real certs in
production). WebRTC-over-TCP (port 7881) is the final fallback.

## Configuration & logging

- `lib/env.ts` — Zod-validated environment; the process fails fast on
  missing/invalid config.
- `lib/logger.ts` — pino structured JSON logs, per-module child loggers,
  credential redaction.

## Module docs

Each subsystem has a doc in `docs/` or `docs/modules/` as it lands:
auth & age-gating (`docs/age-gating.md`), rooms & directory
(`docs/modules/rooms.md`), media/SFU (`docs/modules/media.md`),
moderation & abuse handling (`docs/abuse-handling.md`).
