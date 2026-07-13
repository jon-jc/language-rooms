# Module: host controls, support panel, ratings

## Roles

- **HOST** — the room creator (assigned at join). Full in-room power:
  mute, kick, promote to moderator, lock/unlock, set capacity,
  grant/revoke speaking.
- **MODERATOR** — promoted by the host. Handles *people*, not structure:
  may mute/kick/grant/revoke-speak PARTICIPANTs only — never the host,
  other moderators, or themselves.
- **PARTICIPANT** — no moderation powers; in moderated rooms starts
  listen-only and raises a hand to request speaking.

The full permission matrix is `canModerate` in `lib/moderation.ts`
(unit-tested). Authorization happens **server-side against the stored room
role** in `POST /api/rooms/:id/moderate`; the client buttons are only UI.

## How each action works

| action | mechanism |
| --- | --- |
| mute | LiveKit server API `mutePublishedTrack` on every published microphone track — a real server-side mute, not a client hint |
| kick | participant row marked left + `kickedUntil = now + 15 min` (join API refuses rejoin during the cooldown — kick-evasion deterrent), then `removeParticipant` on the SFU |
| promote | stored role → MODERATOR + LiveKit `updateParticipant` restores full publish rights |
| lock/unlock | `Room.isLocked` — join API refuses non-hosts while locked |
| setCapacity | validated against room-type bounds (video ≤ 20, voice-only ≤ 50) |
| grantSpeak/revokeSpeak | LiveKit `updateParticipant` flips `canPublish`; the SFU pushes the permission change to the client live |

**Every action is written to the `AuditLog`** (actor, action, room, target,
detail, timestamp) via `lib/audit.ts` — including host actions, per spec.

## Raise-hand (moderated rooms)

Moderated rooms mint non-host tokens with `canPublish: false` (see
docs/modules/media.md). The participant's "✋ Raise hand" button broadcasts a
signal on the `hand` data-channel topic; hosts/moderators see the queue in
their panel and click *Allow to speak*, which calls `grantSpeak`. Data
channels remain open to everyone (`canPublishData: true`) so listen-only
participants can still signal and use the support panel.

## Support panel (secondary text channel)

Not a chat mode: a narrow side panel for **corrections, vocabulary, links**
(typed entries, `RoomNote` table). Notes are persisted via
`POST /api/rooms/:id/notes` (participants only, 500-char cap) and broadcast
live on the `support` data-channel topic; late joiners fetch the last 50.
**Translation assist**: `POST /api/translate` behind the
`TranslationProvider` interface — a clearly-marked stub in dev, with DeepL /
Google Cloud Translation as the documented production implementations.

## Post-session rating

Leaving a room (leave button, disconnect, or kick) routes to
`/rooms/:id/rate`: a skippable 1–5 star rating with optional feedback,
stored in `RoomRating` and restricted to users who actually participated.
