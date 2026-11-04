# Room reliability audit — 2026-11-04

Base: main at 5e8750b. Changes target concrete regressions; this is not a claim that every possible room bug is eliminated.

## Findings fixed

- Enabling/disabling the cat stage conditionally mounted separate SyncPlayer trees. A single stable player now changes its styling, preserving playback and callbacks.
- Hidden viewers skipped authoritative play/pause corrections. They now receive room state, while existing visibility guards continue filtering outgoing lifecycle events.
- Stage state lived in a process-global Map. It is now stored in Room.stage JSON with a room-row transaction lock. Stage updates do not move Room.updatedAt/lastSyncAt, so they cannot rewind video.
- Stage requests ran a second interval alongside the unified room poll; removed the competing interval. Stage responses/snapshots are accepted by monotonic stage revision only.
- A full-stage approval removed the request without adding the participant. It now preserves the request and the API rejects approval while full/closed.
- Stage action payloads lacked typed validation and allowed another client's identifier as the actor. Mutations now use a browser-bound membership proof; host-only checks remain server-side. Command, legacy playback and leave endpoints also verify browser ownership.
- SessionStorage IDs could be cloned into duplicated tabs. Each mounted room connection now gets a fresh ID; authenticated stage identity remains deduplicated by user ID.
- Historical chat could fall back to Google profile names after a presence expired. Both snapshots and message acknowledgements now use the public nickname or Guest.

## Schema/deployment

Additive columns only: Room.stage JSONB default {}, RoomPresence.ownerKey nullable text. The existing Vercel build upgrade script adds them idempotently before next build. A matching migration SQL is included. No production database command was run during this task. Existing AUTH_SECRET (or NEXTAUTH_SECRET) signs membership proofs; no new service or secret is required. Users should reload open rooms after deployment to obtain the new membership cookie/proof.

## Verification

- 113 library tests pass; typecheck/lint pass.
- PostgreSQL 18 disposable local cluster, separate from production; Prisma schema preparation and additive upgrade run twice.
- HTTP integration covers joining, chat, queue contribution/reordering/end progression, lock/rename/delete, stage persistence, host approval and rejection of impersonated commands/leave/heartbeat/stage actions.
- Headless Edge with a simulated YouTube API verifies one player instance across stage toggles and a hidden viewer following room pause/play.
- Real YouTube/mobile background media restrictions still require device testing; the browser regression test simulates YouTube state events.
