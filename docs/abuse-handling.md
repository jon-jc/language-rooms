# Abuse handling

Live multi-party video is a high-risk surface. This document describes every
abuse-handling mechanism in LanguageRooms: user-facing tools (report, block,
leave), automatic enforcement (rate limits, strikes, throttles, takedowns),
the human moderation queue, automated content scanning, and the escalation
path for CSAM-class material.

Related docs: [age-gating.md](age-gating.md) (18+ enforcement),
[modules/host-controls.md](modules/host-controls.md) (in-room host powers).

## 1. In-room reporting with evidence frames

Every remote participant's tile carries a **⚑ Report** button
(`components/room/ReportModal.tsx`). Submitting a report:

- captures recent **frame(s) of the reported participant's video stream**
  from the reporter's client, plus metadata: reporter id, target id, room
  id, timestamp;
- is **disclosed clearly** in three places: the report dialog itself
  ("Submitting this report captures recent frame(s) of X's video stream…"),
  the video-conduct consent screen, and ToS §3;
- offers an inline "also block" option.

Server side (`POST /api/reports`):

- rate-limited (10 reports/hour/user);
- validated: reporter and target must both actually be in the reported room;
  self-reports rejected; frames must be JPEG/PNG data URLs ≤ 1.5 MB
  (`parseFrameDataUrl`, unit-tested);
- evidence is written to the evidence store (`EVIDENCE_STORAGE_DIR` in dev;
  an S3-style versioned, lifecycle-locked bucket in production) with a
  SHA-256 recorded per frame (`EvidenceFrame`);
- the report lands in the moderation queue as `PENDING` — or is immediately
  **escalated** if severe (§7).

## 2. Blocks

`POST /api/users/:id/block` (and DELETE to unblock). Semantics
(`lib/abuse/blocks.ts`):

- If A blocked B, A and B are **never admitted to the same room again**, in
  either direction — the join API refuses when any active participant has a
  block relation with the joiner.
- The refusal is deliberately **indistinguishable from "room full"**
  (same code and message), so a blocked user can't confirm they were
  blocked by probing rooms.
- Defense-in-depth for blocks created mid-session: the join response lists
  block counterparties, and the client hides their video tiles and mutes
  their audio (`BlockEnforcer`) if they are ever co-present.

## 3. Instant leave & host powers

- Any participant can leave instantly (leave button or closing the tab);
  `navigator.sendBeacon` makes the departure authoritative immediately.
- Hosts/moderators: server-side mute, kick (with a 15-minute rejoin
  cooldown), lock, capacity — see modules/host-controls.md. All actions are
  audit-logged.

## 4. Server-side rate limits

Central registry in `lib/rate-limit.ts` (Postgres fixed-window):

| operation | limit | deters |
| --- | --- | --- |
| signup | 5 / h / IP | account farming |
| login | 10 / 15 min / IP+email | credential stuffing |
| room create | 4 / h / user **and** / IP | room spam |
| room join | 30 / 10 min / user | room scanning |
| room **re**join | 5 / 10 min / user+room | kick evasion |
| report | 10 / h / user | report spam / weaponization |

## 5. Strikes & reputation

`lib/abuse/reports.ts#issueStrike`, ladder in
`lib/abuse/thresholds.ts#strikePenalty` (unit-tested):

| active strikes | automatic penalty |
| --- | --- |
| 1 | recorded warning |
| 2 | 24-hour ban |
| 3 | 7-day ban |
| 4+ | permanent ban |

Strikes expire after 90 days. They are issued when a moderator actions a
report (warn/ban) and automatically when a user hosts a room that gets
auto-taken-down. Bans are enforced at **room join and room creation**
(`isBannedNow`), so a banned user can still read the directory but cannot
participate.

## 6. Automatic throttling of repeat offenders

Evaluated on every new report (`evaluateAutoEnforcement`):

- **Repeatedly-reported account**: ≥ 3 reports from ≥ 3 *distinct* reporters
  within 24 h → automatic 24 h restriction (`TEMP_BANNED`) pending human
  review. The distinct-reporter requirement prevents one hostile user from
  throttling someone by spamming reports.
- **Repeatedly-reported room**: ≥ 5 reports from ≥ 3 distinct reporters
  within 24 h → automatic room takedown + a strike for its host. Admins can
  reinstate from the queue.

Both actions are audit-logged as system actions (`actorId: null`).

## 7. Escalation path for severe reports (CSAM-class)

Reasons `CHILD_SAFETY` and `SUSPECTED_UNDERAGE` are **always SEVERE**
(`severityForReason`) and are escalated at creation
(`lib/abuse/escalation.ts`):

1. status becomes `ESCALATED` — sorted to the top of the queue and
   **cannot be dismissed** there;
2. **evidence is preserved**: no code path deletes evidence for escalated
   reports and the admin UI exposes no delete. US providers are required to
   preserve reported content (18 U.S.C. § 2258A); treat the evidence store
   as write-once for these reports;
3. the event is audit-logged;
4. `notifyAuthorities(reportId)` is called — **the single integration
   point** where production must wire its legal reporting pipeline
   (NCMEC CyberTipline for US-based services; INHOPE member hotlines
   elsewhere; direction of counsel governs). In development this function
   only logs, loudly, that it is not configured. It is deliberately **not**
   a real submission pipeline in dev.

**Policy**: such material is never re-shared, never used for model training
or tests, access to escalated evidence is audit-logged per view, and
retention follows statutory minimums.

## 8. Automated content scanning

Interface: `ContentModerationProvider.scanFrame(buffer)`
(`lib/abuse/content-moderation.ts`). Two ingestion paths feed it:

- **Sampled video frames**: while publishing video, each client samples its
  own outgoing camera track every 60 s and posts it to
  `POST /api/moderation/frame` (disclosed in the consent flow). Production
  should replace client sampling with **server-side sampling via LiveKit
  Egress** so a hostile client can't opt out; the endpoint stays the same
  seam either way. The scan verdict is never revealed to the sender.
- **Whiteboard photo uploads** are scanned *before* storage/display
  (docs/modules/whiteboard.md).

Flagged content creates an **automated report** (`source: "automated"`,
reporter `null`) with the frame attached as evidence, feeding the same
queue, throttles, and strike machinery as user reports.

Dev provider: a stub that flags only buffers starting with the ASCII marker
`NSFW-TEST` — deterministic end-to-end testing without unsafe content.
Production candidates: AWS Rekognition Content Moderation, Google Cloud
Vision SafeSearch, Hive; plus Microsoft PhotoDNA for known-CSAM hashing
(PhotoDNA hits must route to §7 escalation, not the ordinary queue).
Select via `CONTENT_MODERATION_PROVIDER`.

## 9. Moderation queue (staff)

`/admin` (ADMIN and MODERATOR roles; guarded server-side on both the page
and every API). Reports are listed SEVERE-first, then oldest-first, with
evidence thumbnails (served via the **audited** `/api/admin/evidence/:id`
route — every view is logged).

Actions (`POST /api/admin/reports/:id/action`):

| action | effect | who |
| --- | --- | --- |
| dismiss | resolved, no violation (blocked for ESCALATED reports) | staff |
| warn | strike + recorded warning | staff |
| temp_ban_24h / temp_ban_7d | strike + timed ban | staff |
| perm_ban | strike + permanent ban | **admin only** |
| room_takedown | room delisted + SFU room destroyed + everyone disconnected | **admin only** |

Roles are granted only via `node scripts/promote-user.mjs <email> <role>` —
there is no self-serve path to staff roles. Every resolution writes the
resolver, action, and optional note to the report and the audit log.

## 10. Audit logging

`lib/audit.ts` writes an immutable `AuditLog` row (actor, action, room,
target, JSON detail, timestamp) and mirrors it to structured logs for SIEM
shipping. Covered events include: report lifecycle (created/escalated/
resolved), every admin action, every in-room host action (mute/kick/lock/
promote/capacity/whiteboard-clear), blocks/unblocks, strikes, automatic
throttles and takedowns, CLI role changes, and every evidence view.
