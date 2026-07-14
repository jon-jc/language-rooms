# PR #6 — M6: Abuse handling

- **Branch:** `milestone/06-abuse-handling`
- **Date:** 2026-07-14
- **Status:** merged
- **GitHub:** https://github.com/jon-jc/language-rooms/pull/6

## What this delivers

Full abuse-handling subsystem — see the dedicated
[docs/abuse-handling.md](../abuse-handling.md):

- **In-room reporting** with client-captured frames of the target's stream +
  metadata; disclosure in dialog, consent flow, and ToS; rate-limited and
  participant-validated; evidence stored with SHA-256.
- **Blocks** with room-separation semantics (never co-present again, either
  direction), room-full-indistinguishable refusals, and client-side
  hide/mute as mid-session defense-in-depth.
- **Strikes & reputation**: 90-day strikes, ladder warn → 24h → 7d →
  permanent; bans enforced at join and creation.
- **Automatic enforcement**: repeat-target throttle (≥3 distinct
  reporters/24h) and room auto-takedown (≥5 reports, ≥3 reporters/24h)
  with a strike for the host — both anti-brigading-guarded and audited.
- **Moderation queue** at `/admin`: SEVERE-first, evidence thumbnails via
  audited access route, dismiss/warn/temp-ban/perm-ban/room-takedown with
  role-scoped powers; staff roles only via audited CLI
  (`npm run user:promote`).
- **Automated scanning**: provider interface + deterministic dev stub;
  sampled outgoing frames every 60s (prod seam: LiveKit Egress);
  flagged content → automated reports.
- **CSAM-class escalation**: always SEVERE, auto-ESCALATED,
  preservation-locked (no dismissal, no evidence deletion path), single
  `notifyAuthorities` integration point for NCMEC CyberTipline wiring.
- **Audit logging** for everything, including evidence views.

## Verification

- `npm test` → 68/68; `npm run build` → clean.
- Live, against dev server + Postgres + LiveKit:
  - stub-flagged frame → automated report with evidence in queue;
  - admin promoted via CLI → queue lists report; evidence 200 for staff,
    **403 for non-staff**; warn action → report `RESOLVED_ACTIONED`,
    strike issued, audit rows (`admin.report.warn`, `user.strike_issued`,
    `admin.evidence.viewed`, `user.role_changed_cli`);
  - CHILD_SAFETY report → `SEVERE / ESCALATED` at creation; dismiss
    attempt → **409 ESCALATED_LOCKED**; `notifyAuthorities` stub logged its
    integration-point warning.
