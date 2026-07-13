# LanguageRooms

A TinyChat-style, video-and-voice language-learning platform. People browse
persistent rooms organized by language and level ("Spanish – Beginner",
"Japanese Conversation") and practice together over live multi-party video
and group voice. Text is a secondary support channel (corrections, vocabulary,
links) — the main experience is talking.

**This platform is strictly 18+.** Age verification is enforced at signup
(see [docs/age-gating.md](docs/age-gating.md)) and abuse handling is a
first-class subsystem (see [docs/abuse-handling.md](docs/abuse-handling.md)).

## Architecture

```
Browser ──HTTPS──► Next.js (App Router)  ──Prisma──► Postgres
   │                    │  ▲
   │                    │  └── LiveKit webhooks (room/participant lifecycle)
   └──WebSocket/WebRTC──► LiveKit SFU (signaling WS + media + embedded TURN)
```

| Concern | Choice | Why |
| --- | --- | --- |
| Frontend + API | **Next.js (App Router)** | Single codebase for UI and backend routes, per spec. |
| SFU | **LiveKit (self-hosted)** | Multi-party rooms need an SFU, not mesh P2P (upload bandwidth scales O(n) per peer on mesh). LiveKit was chosen over mediasoup (a library — we'd have to build and operate our own SFU server, signaling protocol, and client state machine) and Janus (C plugins, weaker JS/React ecosystem). LiveKit is a single Go binary with a production signaling protocol over WebSocket, embedded TURN/STUN handling for NAT traversal, a server SDK for tokens/moderation (server-side mute, kick), webhooks for room state, and first-class React components for grids/active-speaker/connection quality. |
| Signaling | **LiveKit WebSocket protocol + webhooks** | Join/leave, media negotiation, active speaker, and low-latency in-room events (raise-hand, support-panel notes over data channels) ride LiveKit's real WebSocket signaling. Server-side room state stays authoritative in Postgres via LiveKit webhooks. |
| NAT traversal | **LiveKit embedded TURN + ICE/STUN** | TURN over UDP in dev; TURN/TLS in production (`livekit.yaml`). |
| Datastore | **Postgres + Prisma** | Relational fits users/rooms/moderation with strong constraints; Prisma for typed access and migrations. |
| Rate limiting | **Postgres-backed counters** | One fewer moving part than Redis for the dev/single-node footprint; the limiter is behind an interface so Redis can be swapped in for multi-node deployments. |
| Auth | **bcrypt + signed JWT session cookies (jose)** | Full control over the signup flow is required for age-gate lockout semantics; no third-party identity dependency. |
| Logging | **pino** | Structured JSON logs with per-module bindings and credential redaction. |

## Getting started

Prerequisites: Node 20+, Docker + Compose.

```bash
cp .env.example .env        # dev defaults work out of the box
docker compose up -d        # postgres + LiveKit SFU
npx prisma migrate dev      # apply database migrations
npm run dev                 # Next.js on http://localhost:3000
```

Run tests: `npm test` (Vitest).

## Repository layout

- `app/` — Next.js App Router pages and API routes
- `lib/` — server-side domain logic (auth, rooms, moderation, SFU tokens)
- `prisma/` — schema and migrations
- `tests/` — Vitest suites
- `docs/` — architecture, per-module docs, PR records
  - [docs/architecture.md](docs/architecture.md)
  - [docs/age-gating.md](docs/age-gating.md) — 18+ enforcement, lockout, consent gate
  - [docs/modules/auth.md](docs/modules/auth.md) — sessions, passwords, guards
  - [docs/modules/rooms.md](docs/modules/rooms.md) — directory, creation, join admission
  - [docs/abuse-handling.md](docs/abuse-handling.md) *(lands in M6)*
  - [docs/pr-workflow.md](docs/pr-workflow.md)
- `docker-compose.yml`, `livekit.yaml` — local infra

## Milestones & process

Development proceeds in documented milestones; each one is developed on a
feature branch, documented, recorded as a PR under `docs/prs/`, and merged
before the next begins (see [docs/pr-workflow.md](docs/pr-workflow.md)).

1. **M1 — Scaffolding**: Next.js, Prisma, Docker infra, docs skeleton ✅
2. **M2 — Auth + age-gate**: signup/login, DOB verification + lockout, conduct consent ✅
3. **M3 — Onboarding + room directory**: languages/CEFR, browse/search/create rooms ✅
4. **M4 — SFU media**: multi-party video/voice, reconnect, quality indicators
5. **M5 — Host controls**: mute/kick/lock, raise-hand, support panel, ratings
6. **M6 — Abuse handling**: reports + evidence frames, blocks, strikes, admin queue, moderation hooks, escalation
7. **M7 — Production hardening**: full tests, app Dockerfile, deploy docs

Every change is recorded in [CHANGELOG.md](CHANGELOG.md).
