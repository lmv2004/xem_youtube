# Instant room actions and room names

Chat uses client-generated message IDs. Submitted text renders immediately in the same bubble as its confirmed message. The composer is independent of the outbox, so a late response never clears a newer draft. WebSocket echoes and HTTP acknowledgements share the same identity; identical message text remains valid as distinct submissions. Failed messages stay visible and can be restored to the composer.

Queue add, remove and reorder commands render immediately as outstanding intents over the latest server snapshot. Requests are serialized per client in the background. Adds have stable entry IDs, and reorders place entries before/after a chosen neighbor so replaying an already reflected intent does not move an entry twice. A rejected operation removes only its own pending intent and keeps newer remote edits. Playback changes, next and ended commands continue to use authoritative server state.

The host can use the pencil beside the room title to rename the room (1–80 characters). The server verifies the authenticated host, stores the name, and broadcasts it to members. Naming is independent of the current song and preserves the playback anchor, queue and generation. Vietnamese, English and Telugu labels are included.

No database migration, dependency or new environment variable is required. Merge the PR into main to use the existing deployment pipeline.

Validation: typecheck, lint, production build, regression tests, and two-gateway PostgreSQL/WebSocket integration covering host-only rename, stable IDs, queue changes and playback continuity. Browser component checks use a temporary local harness with a 10-second response delay; the harness is removed before commit.
