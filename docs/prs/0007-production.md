# PR #9 — M7: Production hardening

- **Branch:** `milestone/07-production`
- **Date:** 2026-07-14
- **Status:** merged

## What this delivers

- **App image** (`Dockerfile`): multi-stage build on Node 22 alpine,
  Next.js standalone output, non-root runner, automatic
  `prisma migrate deploy` at boot, `/data` volumes for the dev-mode
  evidence/upload stores. `.dockerignore` keeps secrets and stores out of
  the build context.
- **Full-stack compose profile**: `docker compose --profile full up
  --build` — Postgres + LiveKit + app with a healthcheck against
  `/api/health` (new DB-probing liveness endpoint; reveals only up/down).
- **Boot-time config validation** (`instrumentation.ts`): the Zod env
  schema runs at server start; misconfigured deployments refuse to boot
  with per-field errors.
- **Security headers** on all routes: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, strict referrer policy, `Permissions-Policy`
  restricting camera/microphone to same-origin.
- **`docs/deployment.md`**: build/run instructions, runtime env reference,
  and the production checklist (TLS + TURN/TLS, real content-moderation
  provider + NCMEC escalation wiring, versioned/locked evidence bucket,
  LiveKit Egress sampling, Redis rate limiting for multi-node, log
  shipping, SFU scaling).

## Verification

- `npm test` → 78/78; `npm run build` → clean with standalone output.
- `docker build` → success; `docker compose --profile full up -d app` →
  container **healthy**; `/api/health` 200 `{"status":"ok"}`; home page
  200; all four security headers present on responses; boot log shows
  "environment validated; server starting" from the instrumentation hook.
