> Historical implementation, superseded by HTTP polling. See [watch-party-sync.md](watch-party-sync.md).

# Quiet room connection renewal

The existing server closes each WebSocket with code `1012` and reason `Reconnect` after at most four minutes, before the Vercel function duration limit. This remains in place.

The client now distinguishes that planned close from actual connection failures. Planned renewal reconnects immediately and hides the warning for up to three seconds while loading the authoritative snapshot. A slower renewal shows the existing warning. Database event connection failures, unexpected socket closes and command timeouts still warn immediately.

`isOffline` continues to protect playback reconciliation and controls whenever state is not synchronized; warning visibility is separate. The playing video is not paused or remounted. In-flight HTTP commands survive a planned renewal without automatic replay, and newly submitted messages can wait up to 15 seconds for snapshot readiness. Leaving the room cancels waiting sends and notice timers. Genuine disconnects keep the existing rejection and backoff behavior.

No new service, environment setting or database migration is required. Validation covers fast/slow renewal, real disconnects, bounded waits and cancellation, plus actual WebSocket expiry/rejoin with the same tab identity and an unchanged playback anchor.
