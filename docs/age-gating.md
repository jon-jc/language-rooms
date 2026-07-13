# Age gating

LanguageRooms is a live-video platform for **adults only**. The minimum age is
**18, hard-coded** (`MINIMUM_AGE` in `lib/age-gate.ts`). There is deliberately
no configuration surface that can lower it, and the Terms of Service state the
requirement as absolute (`app/terms/page.tsx`, §1).

## What happens at signup

`POST /api/auth/signup` (see `app/api/auth/signup/route.ts`):

1. **Rate limit** — max 5 signup attempts per IP per hour.
2. **Validation** — DOB must be a real `YYYY-MM-DD` date, in the past,
   after 1900; terms checkbox must be literally `true` (Zod `z.literal`).
3. **Age gate** (`runAgeGate` in `lib/age-gate.ts`):
   - Look up prior **FAILED attempts** for this (hashed) email in the last
     30 days, and for this IP in the last 24 h.
   - Decide via the pure function `evaluateAgeGate` (unit-tested):
     - email has a recent failure → **locked**
     - IP has ≥ 3 failures in 24 h → **locked**
     - computed age < 18 → **underage** (a FAILED attempt is recorded)
     - otherwise → **pass** (a PASSED attempt is recorded)
4. On **pass**, the user row is created together with an `AgeVerification`
   record; on anything else, signup is refused.

## Age calculation

`calculateAge` is calendar-accurate in UTC: birthdays that haven't occurred
yet this year don't count, and Feb-29 birthdays roll to Mar 1 in non-leap
years (an 18th birthday on Feb 29 is reached on Mar 1). Tested in
`tests/age-gate.test.ts`, including the exact-18th-birthday boundary.

## The verification result is stored — not a checkbox

For every account that passes, an `AgeVerification` row records:

| field | meaning |
| --- | --- |
| `dateOfBirth` | the DOB the user attested |
| `ageAtVerification` | computed age at signup |
| `result` | `PASSED` |
| `method` | `dob-self-attestation` (extension point for document/ID providers) |
| `verifiedAt` | timestamp |

Failed attempts never create users; they are recorded in `AgeGateAttempt`
with a **SHA-256 hash of the email** (a rejected minor's raw email is not
retained), the IP, and the result.

## Neutral gate + lockout (no retry-by-editing-DOB)

A rejected DOB must not be correctable by just editing the date:

- After one FAILED attempt, the email is **locked for 30 days** and — after
  3 failures — the IP for 24 h. The lock is checked **before** the new DOB
  is even evaluated, so resubmitting with an adult DOB still fails.
- Underage and locked outcomes return the **same HTTP status (403) and the
  same fixed message** ("We are unable to create your account."), with no
  reference to age, DOB, or the lockout. The gate cannot be probed to learn
  which birthdate would pass. Verified live: teen DOB → 403; same email with
  adult DOB → identical 403.

## Video-conduct consent gate

Age is necessary but not sufficient to enter a room. Before the first join,
every user must explicitly accept the video conduct rules (`/consent` page →
`POST /api/auth/consent`, which requires the literal acknowledgement flag and
stamps `User.conductConsentAt`). Room join APIs and pages check this
timestamp (`requireConsentedUserPage` in `lib/auth/guards.ts`) and refuse
until it exists. The consent screen also discloses report frame-capture and
automated stream sampling (see docs/abuse-handling.md).

## Retention & audit

- `AgeVerification` rows live as long as the account (deleted via cascade).
- `AgeGateAttempt` rows are retention-bounded by their purpose (lockout
  windows: 30 days email / 24 h IP); a scheduled cleanup can prune older
  rows without weakening the gate.
