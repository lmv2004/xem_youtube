# Watch party lifecycle and synchronization

Hosts can delete their rooms from the room list or the room toolbar. The confirmation explains that all viewers are disconnected and chat history is permanently removed. The API authorizes the authenticated account and repeats the host ID in the delete predicate. Existing Prisma cascade relations remove messages and presences; no schema migration is needed.

Viewers receiving a 404 stop polling and unmount the player, then see a link back to the room list. Leaving or changing rooms cancels pending requests. Each mounted room has a distinct connection ID, including multiple tabs in the same browser.

## Polling budget

The deployment continues to use stateless HTTP polling, not WebSockets:

- Playing: 1.5 seconds after the previous response.
- Paused: 3 seconds after the previous response.
- Background tab: 15 seconds, subject to browser timer throttling.
- Presence: write on first join, roughly every 15 seconds, and on foreground/reconnection. Expire after 60 seconds without a heartbeat.
- Failure: exponential retry from 3 to 30 seconds; request timeout 10 seconds.

Only one state request runs at a time. A refresh requested during a pending request is queued. Playback mutations are serialized, and successful mutations request an immediate refresh. Foreground and online events request fresh state immediately. Ordinary sync polls skip session lookup in the logging wrapper and perform no presence writes or sweeps. The existing middleware still verifies its JWT.

Playback uses the server timestamp, a bounded half-round-trip estimate, and elapsed time since response receipt. A brief echo window avoids reflecting a local action back into the player; subsequent polls reconcile drift even for the last controller. This is approximate synchronization, with network latency and YouTube buffering still affecting alignment.

Chat cursors use timestamp plus ID for stable pagination. Local sends never move the server cursor, avoiding skipped concurrent messages. Merging deduplicates messages and retains the newest 300 in browser memory; stored history is unchanged until the room is deleted.

## Validation

Run `node --import tsx --test lib/*.test.ts`, `npm run typecheck`, and `npm run build`. CI also runs the regression tests.

Local production API checks with disposable users/rooms verified: creation, authenticated host controls, anonymous/non-host delete rejection, forged host client-ID rejection, read-only polls preserving `lastSeenAt`, same-timestamp chat pagination, host deletion, subsequent 404 responses, and cascade cleanup. All disposable fixtures were removed afterward.

Cross-device playback under real network jitter and browser background throttling still requires manual acceptance testing. Polling does not guarantee instantaneous room closure or frame-exact playback.
