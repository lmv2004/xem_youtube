# Watch party HTTP synchronization

Rooms use short HTTP requests, with no WebSocket endpoint, persistent LISTEN connection or scheduled four-minute reconnect. The client polls `/api/rooms/[code]/sync` every two seconds while visible and every fifteen seconds while hidden. There is never more than one sync request in flight; extra refresh requests coalesce. Failed requests back off to a maximum of fifteen seconds.

Presence is refreshed on the first request, then at least every twenty seconds of successful polling. Returning from a suspended page renews presence immediately. Other polls are read-only and do not authenticate or write presence. Sleeping tabs can rejoin using the same identity without changing the playback anchor.

Chat, queue, playback, lock and rename commands use `/api/rooms/[code]/commands` with server-side permission checks and HTTP acknowledgement. Chat and queue retain optimistic UI; other viewers receive changes on their next poll. The one-second playback clock stays local. Chat snapshots send only messages after the server cursor, paginate missed messages and deduplicate local confirmations. Full snapshots still include playback, queue and members; polling increases HTTP/database traffic compared with event push.

A temporary sync failure retains video, chat and queue state. Three consecutive failures show a sync warning and disable new commands until synchronization recovers. Only an explicit room-not-found response marks the room closed. Commands time out after fifteen seconds and are never replayed automatically, because a timed-out write may already have committed. Leaving sends a best-effort presence removal; stale records expire after sixty seconds.

## Deployment and local testing

No realtime service, `REALTIME_DATABASE_URL`, Vercel WebSocket Beta or additional environment variable is required. Existing DATABASE_URL, Auth.js and YouTube settings remain in use. `npm run dev` uses Next.js directly; `npm run dev:lan` binds to the LAN.

The existing additive queue upgrade in `scripts/ensure-room-queue.mjs` remains part of the Vercel build. No database reset or new migration is needed.

Run `npm run typecheck`, `npm run lint` and `node --import tsx --test lib/*.test.ts`. To test actual HTTP routes against a disposable PostgreSQL database, set DATABASE_URL, apply the schema, run `npm run build`, then set ROOM_HTTP_INTEGRATION=1 and run `node --import tsx --test integration/room-http.test.ts`. The integration starts an isolated Next.js production server, signs in a test account, checks guest/host access, chat idempotency, control locks, queue order, presence recovery and deletion, then removes only its unique fixtures. CI supplies the disposable database and runs these checks automatically.
