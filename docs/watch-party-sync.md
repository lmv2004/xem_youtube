# Watch party WebSocket transport

Chat, play/pause/seek, video changes, control locks, membership updates and room closure are delivered over the same-origin `/api/rooms/[code]/socket` WebSocket. There is no periodic HTTP state polling. The client uses the existing snapshot API when joining/reconnecting and paginates missed chat history; live events received during that fetch are replayed after the snapshot. The one-second player correction clock is local only.

## Deployment

- Vercel Functions WebSockets are currently Beta and require Fluid compute. The Next.js route uses `experimental_upgradeWebSocket` from `@vercel/functions`, with a 300-second function duration. Connections rotate before 240 seconds (or session expiry) and automatically reconnect with backoff/jitter.
- Postgres `LISTEN/NOTIFY` distributes events across instances. Each active process shares one direct listening connection across its viewers, releasing it after the final socket closes. Set `REALTIME_DATABASE_URL` to a direct connection to the **same database** as `DATABASE_URL` if the latter uses transaction pooling. An existing direct `DATABASE_URL` works without a new variable. No Redis or schema migration is needed.
- Writes and small event references commit in the same database transaction. Full payloads are read once per event per listening instance, not stored in the Postgres notification payload (which has an 8KB limit). A listener failure closes its sockets so clients reconnect and catch up instead of silently missing events.
- Persistent connections consume Vercel duration/resources and Postgres connection capacity, and keep a Neon compute awake while viewers are connected. This removes empty HTTP polling, not all hosting cost. Monitor connection limits before scaling to many instances.
- Use `npm run dev` (pinned Vercel CLI, initial download/login/project linking may be needed) for the supported upgrade runtime. `npm run dev:next` and `next start` can render the app but cannot serve this Vercel-specific upgrade API. Preview deployments are the deployment acceptance environment.

## Reliability and authorization

The upgrade checks same-origin requests and authenticates the cookie session. Guest viewers can join, but chat still requires an account. Commands use the server's authenticated actor and connection ID; submitted host/user IDs are ignored. Playback mutations serialize under a room row lock, enforce the host control lock and emit a monotonic room revision. Clients ignore older revisions from delayed acknowledgements or snapshots.

WebSocket requests carry acknowledgement IDs, have a 15-second client timeout, and are not automatically retried after an ambiguous disconnect. The chat outbox retains failed text without overwriting the next draft. Switching to video search preserves the mounted chat/outbox. Pending unsent text is in memory and ends when leaving the room.

Sockets have a 16KB inbound payload limit, bounded command queues, per-connection rate limits and slow-consumer protection. Server ping/pong renews presence every 25 seconds without an HTTP round trip. A new connection gets a fresh presence row so cleanup from the old connection cannot delete the replacement. Host deletion is transactional, cascades chat/presence records and sends a closed event.

## Checks

- `node --import tsx --test lib/*.test.ts`: outbox races, message merging/cursors, wire validation and existing player regressions.
- `npm run typecheck` and `npm run build`.
- `ROOM_REALTIME_INTEGRATION=1 node --import tsx --test integration/room-realtime.test.ts`: opt-in database integration. Creates only uniquely named disposable fixtures and removes them. CI runs it against its own Postgres service after `prisma db push`.
- The integration uses two independent LISTEN connections and actual WebSocket clients to verify cross-gateway delivery, guest chat rejection, host lock enforcement, playback changes, presence and room deletion.
- Browser harness using the actual sync hook verifies one initial snapshot request while idle/playing/chatting and another only after forced reconnection. Production network latency is not inferred from this test.

References: [Vercel WebSockets](https://vercel.com/docs/functions/websockets), [Postgres NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html).
