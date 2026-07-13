# Changelog

All notable changes to LanguageRooms, with date, summary, and rationale.

## [M1] 2026-07-13 — Scaffolding

**Summary**
- Scaffolded Next.js (App Router, TypeScript, Tailwind, ESLint).
- Added Prisma (v6) with Postgres datasource; empty base schema (models land per milestone).
- Added `docker-compose.yml` with Postgres 16 and LiveKit SFU (v1.9) including embedded TURN and webhook wiring; `livekit.yaml` dev config.
- Added validated environment config (`lib/env.ts`, Zod) and structured logging (`lib/logger.ts`, pino with credential redaction).
- Added Vitest configuration.
- Established docs skeleton (`docs/`), local PR workflow (`docs/pr-workflow.md`), README, this changelog.

**Rationale**
- LiveKit chosen as SFU: multi-party rooms don't scale on mesh P2P; LiveKit provides a production WebSocket signaling protocol, embedded TURN/STUN, server-side moderation APIs, webhooks, and React components — versus building a bespoke SFU server on mediasoup or integrating Janus's C-plugin ecosystem.
- Prisma pinned to v6 (stable, conventional setup) rather than v7 (new driver-adapter architecture) to reduce operational risk.
- Postgres-backed rate limiting keeps the dev footprint to two containers; the limiter is interface-shaped for a Redis swap at scale.
- GitHub CLI is unauthenticated in this environment, so PRs are recorded locally under `docs/prs/` and merged with `--no-ff` merge commits (see docs/pr-workflow.md).
