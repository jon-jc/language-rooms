# PR #1 — M1: Project scaffolding & local infrastructure

- **Branch:** `milestone/01-scaffolding`
- **Date:** 2026-07-13
- **Status:** merged

## What this delivers

- Next.js 15 app (App Router, TypeScript, Tailwind, ESLint) as the single
  frontend + backend codebase.
- Prisma 6 wired to Postgres (`prisma/schema.prisma`; models land per
  milestone with their features).
- `docker-compose.yml`: Postgres 16 + LiveKit SFU v1.9 with embedded TURN
  and webhook wiring to the app. Both containers verified running.
- `livekit.yaml`: dev SFU config — WS/HTTP on **7890**, WebRTC/TCP **7891**,
  TURN/UDP **3479**, media UDP **52000–52100**. Non-default ports because this
  machine already runs another project (`lingorooms`) on LiveKit's defaults;
  remapping avoids breaking that environment.
- Validated env config (`lib/env.ts`, Zod — fail fast on bad config) and
  structured logging (`lib/logger.ts`, pino with secret redaction).
- Vitest configured (`vitest.config.ts`, suites under `tests/`).
- Docs skeleton: `README.md` (architecture + SFU justification + run
  instructions), `CHANGELOG.md`, `docs/architecture.md`,
  `docs/pr-workflow.md` (local PR process — no authenticated GitHub remote
  in this environment).

## Notable decisions

- **LiveKit over mediasoup/Janus** — full rationale in `docs/architecture.md`;
  short version: production WebSocket signaling + embedded TURN + server-side
  moderation API + React components, in one self-hostable binary.
- **Prisma pinned to v6** — v7's driver-adapter architecture is newer;
  v6 is the conservative production choice.
- Root commit bundles the create-next-app scaffold with the infra skeleton
  (a root commit must exist before a branch can); subsequent milestones are
  fully branch-isolated.

## Verification

- `docker compose ps` → postgres (healthy), livekit (up; log shows
  "starting LiveKit server", TURN started on 3479).
