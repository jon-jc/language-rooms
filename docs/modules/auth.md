# Module: auth

Custom credential auth — chosen over a third-party identity provider because
the signup flow must embed the age gate and its lockout semantics
(docs/age-gating.md).

## Pieces

- `lib/auth/password.ts` — bcrypt (12 rounds) hash/verify.
- `lib/auth/session.ts` — stateless sessions: HS256 JWT (jose) in an
  `lr_session` httpOnly, SameSite=Lax cookie, 7-day TTL, `secure` in
  production. Pure `signSessionToken`/`verifySessionToken` take the secret as
  a parameter so they're unit-testable (`tests/session.test.ts`).
- `lib/auth/guards.ts` — server-component guards: `requireUserPage`
  (redirect to /login), `requireConsentedUserPage` (also enforces the
  conduct-consent gate), `requireStaffPage` (ADMIN/MODERATOR).
- `lib/api.ts` — `requireSession` for API routes (401), `parseBody` (Zod,
  400 with field details), `clientIp`, and `apiHandler` (uniform error
  handling; unexpected errors are logged and returned as opaque 500s).

## Endpoints

| route | behavior |
| --- | --- |
| `POST /api/auth/signup` | rate-limited, validates, runs the age gate, creates user + AgeVerification, sets session |
| `POST /api/auth/login` | rate-limited per IP+email, constant response for unknown email vs wrong password |
| `POST /api/auth/logout` | clears the cookie, 303 to `/` (plain form action) |
| `POST /api/auth/consent` | records explicit video-conduct consent timestamp |

## Security notes

- No user enumeration: login returns the same 401 either way; signup's 409
  for taken emails is only reachable for adults who passed the gate.
- Passwords and tokens are redacted from logs (`lib/logger.ts`).
- Role lives in the JWT for cheap checks but page guards re-read the user
  row, so role demotions/bans take effect without waiting for token expiry.
