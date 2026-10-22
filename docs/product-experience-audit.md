# Product experience upgrade — 22 October 2026

## Audit and priorities

| Priority | Observed issue | Implemented response |
| --- | --- | --- |
| P1 | Auth.js treats a failed session fetch like a missing session, making the user appear signed out until reload | Preserve the last confirmed UI identity while independently checking an uncertain response. Successful null clears identity. Protected server routes still enforce their own authentication. |
| P1 | A request aborted when a page sleeps can settle after resume and overwrite restored room state | Poll lifecycle epochs discard stale successes and failures; HTTP polling, background throttling and the playback anchor are retained. |
| P1 | Failed library deletion could silently remove visible data; destructive actions lacked confirmation | Apply successful server results, preserve data on error, expose retry feedback and confirm destructive collection/history/list actions. |
| P2 | Large introduction, glowing/translucent surfaces and inconsistent page frames compete with video content | Compact discovery header, neutral solid surfaces, semantic light/dark colors, shared desktop/mobile navigation for library/account pages. |
| P2 | Header search rendered twice with the same ID; navigation prefix matching made Watch and Watch later active together | One responsive header search and segment-aware active navigation. |
| P2 | Watch-later collection was hidden; the old “continue” rail actually showed saved videos without progress | Public, device-local Watch later page; separate actual progress-based Continue watching rail. |
| P2 | Account had a nonfunctional VIP badge and called the sum of video durations actual viewing time | Remove misleading VIP status; describe the existing duration metric accurately. |
| P2 | Chat repeated full timeline construction per message and had small reaction targets/IME Enter risks | Build timeline once, enlarge actions, respect reduced motion, preserve drafts across tabs and ignore composition Enter. |

## Four completed features

1. Continue watching: on-device progress saved every five seconds and on pause/exit; unfinished videos return to the saved position. Explicit `t=0` restarts. Completed videos/live streams are excluded. Up to 30 recent records, eight shown on home.
2. Timestamp sharing: editable/copyable share dialog, optional current time, native share where available, incoming seconds or `1h2m3s` timestamps. Duplicate malformed timestamps cannot crash the route.
3. Player shortcuts and help: watch-page controls ignore text editing, interactive controls, dialogs and modifier shortcuts. Theater/autoplay/loop changes retain the same iframe; explicit failure retry replaces it.
4. Watch later management: public browser-local list, search, sorting, keyboard-accessible order controls, removal and confirmed clear. Existing storage format is retained, repaired, deduplicated and capped at 100; cross-tab changes synchronize.

Room and library improvements preserve existing host permissions, optimistic chat/queue IDs, room rename/delete, cursor catch-up, collections, history, language preferences and HTTP intervals. No WebSocket, dependency or schema was added. Existing local discovery commits were retained and incorporated, not reset.

## Verification

- Browser: 1440×1000 desktop and 390×844 mobile; actual home, watch, Watch later, authenticated favorites/collections, history, account/settings, room join/chat, login and registration screens.
- English/dark and Vietnamese/light layouts checked; Telugu/light home checked. Mobile home/room measured without horizontal page overflow. Static translation-key scan found no missing literal strings; translation tests check English/Telugu and interpolation tokens.
- Actual YouTube playback started from `?t=60`; share captured `t=77`; theater retained iframe `widget2`; returning home showed saved progress `1:18`.
- Actual local login returned to favorites; collection tabs/back stayed aligned with URL. Real sign-out returned to anonymous home. Registration screen retained the room callback.
- Actual local room chat sent a message, retained a subsequent draft while switching search/chat tabs, and reached confirmed state. No production room/account records were changed.
- 56 regression tests passed, including nine poll lifecycle tests, storage validation/order, timestamps/progress, uncertain auth responses and safe callbacks. TypeScript and lint passed. Production build and actual HTTP integration are checked again by the PR CI.
- Screenshots: [desktop](qa/product-desktop.png), [mobile](qa/product-mobile.png).

## Limits and deployment

- Progress and Watch later are browser/device-local; no cross-device progress synchronization is claimed. Clearing browser storage removes them.
- Browser autoplay restrictions and YouTube embedding restrictions still apply. Google OAuth navigation was not completed with a real Google account; the button only appears when configured.
- The transient auth response classification is regression-tested. A prolonged real mobile network outage was not reproduced in-browser; server authorization remains authoritative throughout.
- HTTP polling remains approximately two seconds while visible and fifteen seconds while hidden. No production load/latency benchmark or exhaustive assistive-technology audit is claimed.
- Merge into main after review; existing CI/CD deploys. No new environment variable or migration is required. Refresh existing tabs once after deployment.

Player integration references: [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [supported player parameters](https://developers.google.com/youtube/player_parameters).
