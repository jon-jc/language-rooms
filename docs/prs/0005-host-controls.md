# PR #5 — M5: Host controls, raise-hand, support panel, ratings

- **Branch:** `milestone/05-host-controls`
- **Date:** 2026-07-13
- **Status:** merged

## What this delivers

- **Moderation API** (`POST /api/rooms/:id/moderate`) with server-side authz
  (`canModerate` matrix): host mute/kick/promote/lock/unlock/setCapacity/
  grant-revoke speak; moderators handle participants only; nobody targets
  themselves. Mute uses LiveKit's server-side `mutePublishedTrack`; kick sets
  a **15-minute rejoin cooldown** enforced by the join API.
- **Moderated rooms + raise-hand**: non-hosts join listen-only (token
  grants); hand signals ride the `hand` data channel; hosts grant speaking
  via LiveKit `updateParticipant` (live permission push).
- **Support panel**: persisted, typed notes (correction/vocab/link/note)
  broadcast over the `support` data channel; translation assist behind a
  `TranslationProvider` interface (documented dev stub).
- **Post-session rating**: skippable 1–5 stars + feedback on leave;
  participants only.
- **Audit logging**: every in-room action recorded to `AuditLog`
  (actor/action/room/target/detail) and mirrored to structured logs.
- New models: `AuditLog`, `RoomNote`, `RoomRating`; `kickedUntil` on
  `RoomParticipant`.

## Verification

- `npm test` → 57/57 (moderation matrix, action schema, kick-cooldown joins).
- `npm run build` → clean.
- Live: note POST 201 (persisted + returned), host lock 200 → directory shows
  `isLocked: true` → audit row `room.lock` with actor recorded → unlock 200;
  translate stub 200 with marked output; rating 201.
