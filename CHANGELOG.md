# Changelog

All notable changes to LanguageRooms, with date, summary, and rationale.

## [M2] 2026-07-13 — Auth + age gate

**Summary**
- Data model: `User` (with role + conduct-consent timestamp), `AgeVerification`
  (stored verification result), `AgeGateAttempt` (lockout bookkeeping),
  `RateLimitCounter`. Migration `auth_age_gate`.
- Credential auth: bcrypt(12) passwords, HS256 JWT session cookies (jose),
  login/logout/signup/consent endpoints, server-component guards.
- Age gate: calendar-accurate UTC age calculation; 18+ hard floor with no
  configurable minimum; failed attempts recorded by hashed email + IP;
  30-day email lock and 3-per-24h IP budget; neutral identical 403 for
  underage and locked outcomes.
- Explicit video-conduct consent flow (required before any room join),
  with frame-capture/sampling disclosure.
- Postgres-backed fixed-window rate limiter with a central limit registry
  (signup, login, room create/join/rejoin, report).
- UI: landing, signup (DOB + 18+ terms), login, terms of service, consent;
  shared nav/layout.
- Tests: 22 passing (age calc edge cases incl. Feb-29 and 18th-birthday
  boundary, gate lockout decisions, session token round-trip/expiry/tamper,
  rate-limit window math).

**Rationale**
- Custom auth (not NextAuth/a provider) because the age-gate lockout must run
  inside signup before any account exists.
- Emails of rejected minors are stored only as SHA-256 hashes: enough to
  enforce the lock, no PII of minors retained.
- Neutral rejection prevents probing the gate for a passing DOB;
  lock-before-evaluate prevents the "edit your birthday" retry.

**Infra note**: host ports remapped (Postgres → 5434) because this machine
runs a native PostgreSQL 18 service on 5432 and another project on 5433.

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
