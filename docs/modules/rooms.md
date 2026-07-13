# Module: rooms & directory

Persistent rooms organized by language and CEFR level. Users browse/search
the directory, see participant counts, and create rooms.

## Data model

- `Room` — name, optional topic, `languageCode` (ISO 639-1 from
  `lib/languages.ts`), `level` (CEFR or `null` = all levels welcome),
  `isVoiceOnly`, `capacity`, `isLocked`, `isModerated` (raise-hand mode, M5),
  `isTakenDown` (admin, M6), creator.
- `RoomParticipant` — one row per user per room; `leftAt IS NULL` means
  currently present; `role` is HOST/MODERATOR/PARTICIPANT. Kept in sync with
  the SFU via LiveKit webhooks (M4).
- `LanguageProfile` — the onboarding result: NATIVE rows (no level) and
  TARGET rows (CEFR level), unique per (user, language, kind).

## Domain rules (`lib/rooms.ts`, all unit-tested)

- **Capacity**: video rooms 2–20 (default 12); voice-only rooms 2–50
  (default 20) — voice streams are far cheaper to forward than video.
- **Directory query** (`buildRoomWhere`): never lists taken-down rooms;
  level filters also match all-levels rooms; text search covers name+topic,
  case-insensitive.
- **Join admission** (`decideJoin`): pure decision used by the join API (M4).
  Order: room missing/taken-down → banned → consent missing → blocked →
  already-present (admit: reconnects bypass lock/capacity) → locked (host
  exempt) → full. Blocked users receive a response indistinguishable from
  room-full (see docs/abuse-handling.md).

## Endpoints & pages

| surface | behavior |
| --- | --- |
| `GET /api/rooms?language=&level=&q=` | filtered directory with live participant counts (top 100, newest first) |
| `POST /api/rooms` | create; consent required; rate-limited per user **and** per IP (4/h each) |
| `GET/PUT /api/profile` | read/replace language profile (atomic transaction) |
| `/onboarding` | native (≤4) + target (≤6) languages with CEFR per target; a language can't be both |
| `/rooms` | server-rendered directory with filter form |
| `/rooms/new` | create-room form with live capacity bounds |
| `/rooms/[id]` | room page (media experience lands in M4) |

Pages requiring a full profile use `requireOnboardedUserPage` (session →
consent → ≥1 native + ≥1 target language, redirecting to the right step).
