# PR #2 — M2: Auth + age gate

- **Branch:** `milestone/02-auth-age-gate`
- **Date:** 2026-07-13
- **Status:** merged

## What this delivers

- **Data model** (`prisma/migrations/20260713202331_auth_age_gate`): `User`,
  `AgeVerification` (stored result, not a checkbox), `AgeGateAttempt`
  (hashed-email + IP lockout records), `RateLimitCounter`.
- **Auth**: bcrypt(12) + HS256 JWT session cookies; signup/login/logout/
  consent endpoints; server-component guards; no user enumeration.
- **Age gate (full)**: 18+ hard floor (`MINIMUM_AGE`, not configurable);
  UTC calendar-accurate age calc; DOB evaluated at registration and the
  result persisted; **neutral** 403 identical for underage and locked
  outcomes; a rejected DOB locks the email 30 days / IP after 3 failures per
  24 h, checked *before* the resubmitted DOB — editing the birthdate cannot
  bypass the gate.
- **Consent gate**: explicit video-conduct-rules acceptance (timestamped)
  required before any room join; discloses report frame-capture and
  automated stream sampling.
- **Rate limiting**: Postgres fixed-window limiter + central registry
  (signup 5/h/IP, login 10/15min/IP+email, room + report limits pre-declared
  for later milestones).
- **UI**: landing, signup, login, ToS (18+ absolute clause), consent.
- **Docs**: `docs/age-gating.md` (dedicated), `docs/modules/auth.md`.

## Verification

- `npm test` → 22/22 passing (age boundaries incl. Feb-29 and exact 18th
  birthday; lockout decisions; JWT round-trip/expiry/tamper; window math).
- `npm run build` → clean.
- Live against dev server + Postgres:
  - adult signup → 201 + session cookie
  - DOB 2012 → 403 `SIGNUP_UNAVAILABLE` (neutral)
  - same email, DOB edited to 1990 → **still** 403, identical body
  - consent POST → `conductConsentAt` timestamp recorded
