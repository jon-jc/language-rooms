# Deployment

## Local full-stack (containers)

```bash
docker compose --profile full up --build
```

Brings up Postgres, the LiveKit SFU, and the app image (migrations run
automatically at container start via `prisma migrate deploy`). App on
http://localhost:3000, health probe at `/api/health`.

Default dev flow stays lighter: `docker compose up -d` (Postgres + LiveKit
only) plus `npm run dev` on the host.

## Building the app image

```bash
docker build -t languagerooms \
  --build-arg NEXT_PUBLIC_LIVEKIT_URL=wss://sfu.example.com .
```

`NEXT_PUBLIC_*` values are inlined into the client bundle **at build time**
— a production image must be built with the real public LiveKit WebSocket
URL. Everything else is runtime configuration.

The image: multi-stage (deps → build → runner), Next.js standalone output,
runs as a non-root user, applies pending migrations on boot, exposes 3000.

## Runtime environment (validated at boot)

`instrumentation.ts` validates all configuration at server start via
`lib/env.ts` (Zod) — a misconfigured deployment refuses to boot with a
per-field error, and never limps into serving requests.

| variable | notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | ≥32 chars; rotate to invalidate all sessions |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | must match the SFU's `keys:` |
| `LIVEKIT_HOST` | server-to-SFU HTTP endpoint |
| `NEXT_PUBLIC_LIVEKIT_URL` | browser-facing `wss://` URL (also a build arg) |
| `CONTENT_MODERATION_PROVIDER` | `stub` in dev; real provider in prod (docs/abuse-handling.md §8) |
| `EVIDENCE_STORAGE_DIR` / `UPLOAD_STORAGE_DIR` | local paths in dev; replace the storage seams (`lib/abuse/evidence.ts`, `lib/uploads.ts`) with S3/GCS in production |
| `APP_BASE_URL`, `LOG_LEVEL` | logging/links |

## Production checklist

1. **Secrets**: generate real `SESSION_SECRET` and LiveKit key/secret
   (`openssl rand -hex 32`); never ship the dev values in
   `livekit.yaml`/`.env.example`.
2. **TLS everywhere**: app behind HTTPS; LiveKit signaling over `wss://`;
   enable TURN/TLS in `livekit.yaml` (`turn.tls_port`, certs, real domain)
   and `rtc.use_external_ip: true` on cloud VMs.
3. **LiveKit webhook** URL → `https://app.example.com/api/livekit/webhook`
   (signature-verified; unsigned requests are rejected).
4. **Storage**: point evidence and upload stores at object storage; the
   evidence bucket must be versioned and lifecycle-locked (CSAM
   preservation obligations — docs/abuse-handling.md §7).
5. **Content moderation**: wire a real provider and the NCMEC escalation
   integration point (`lib/abuse/escalation.ts#notifyAuthorities`) before
   accepting public traffic.
6. **Frame sampling**: move from client sampling to LiveKit Egress
   server-side sampling (docs/abuse-handling.md §8).
7. **Rate limiting**: swap the Postgres limiter for Redis if running
   multiple app nodes (interface in `lib/rate-limit.ts`).
8. **Staff**: `npm run user:promote -- <email> ADMIN` (audited); staff
   accounts should use strong unique passwords.
9. **Logs**: pino JSON to stdout — ship to your aggregator; audit events
   are tagged `module: audit`.
10. **Scaling the SFU**: LiveKit scales horizontally with Redis; the app
    is stateless (JWT sessions) and scales behind a load balancer.

## Security headers

Set globally in `next.config.ts`: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
and a `Permissions-Policy` restricting camera/microphone to same-origin.
