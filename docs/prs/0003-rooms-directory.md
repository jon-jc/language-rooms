# PR #3 — M3: Onboarding + room directory

- **Branch:** `milestone/03-rooms-directory`
- **Date:** 2026-07-13
- **Status:** merged

## What this delivers

- **Onboarding**: `/onboarding` — native language(s) (≤4) and target
  language(s) (≤6) with CEFR level (A1–C2) each; enforced ≥1 of each before
  the directory is reachable; languages can't be both native and target.
  `PUT /api/profile` replaces the profile atomically.
- **Room model + directory**: browse/search by language, level, and free
  text; live participant counts (`leftAt IS NULL`); taken-down rooms never
  listed; all-levels rooms (`level = null`) match every level filter.
- **Room creation**: name/topic/language/level/moderated flag/optional
  capacity; video rooms 2–20 (default 12), voice-only 2–50 (default 20);
  consent-gated; rate-limited per user and per IP.
- **Join admission core**: pure `decideJoin` (used by the M4 join API) with
  ban/consent/block/lock/capacity/reconnect semantics, fully unit-tested.
- **Docs**: `docs/modules/rooms.md`.

## Verification

- `npm test` → 40/40; `npm run build` → clean.
- Live: profile PUT 200 → room create 201 → directory lists the room with
  `participantCount: 0`; capacity 99 rejected 400 with a bounds message.
