# UI/UX audit and implementation

Scope: discovery, search, shared navigation/cards, and the watch page. Existing authentication, collections and room APIs remain in place.

## Findings and fixes

| Priority | Observed issue | Change |
| --- | --- | --- |
| P0 | Search results selected a featured video while the featured player was hidden on the search screen. | Cards are semantic watch-page links; mouse, keyboard and open-in-new-tab follow the same destination. |
| P0 | Search metadata was joined by array position after IDs were filtered, pairing titles/thumbnails with the wrong video. | Both search helpers join by video ID, prefer video-detail snippets, with regression tests. |
| P1 | Cards could announce a successful save without a persistence callback. | Cards fall back to the shared watch-later hook; visible save state works on touch and keyboard. |
| P1 | A second iframe could be started from the floating watch-page card. | Floating control returns to the original player; no second playback instance. |
| P1 | Autoplay initialized before reading the saved preference. | Wait for preference hydration before mounting playback. |
| P1 | Local heart state claimed to add favorites but did not populate the account library. | Remove the disconnected heart action and expose the existing collection-backed save as “Lưu vào thư viện”. Existing local data is untouched. |
| P1 | Filters/search could diverge from navigation history; old requests could replace newer results. | URL is the search/filter source of truth; abort superseded fetches. |
| P1 | Homepage had no useful failure state when trending failed. | Explicit loading, error/retry and empty states; preserve existing results on pagination failure. |
| P2 | Duplicate search, oversized featured stage, dense actions and decorative motion competed with video discovery. | One home search, immediate video grid, quieter static background, compact navigation and explicit load-more control. |
| P2 | White-only borders/backgrounds did not work well in light mode. | Theme-aware surfaces/borders on the primary flows; check both themes. |
| P2 | Thumbnails/titles were click-only divs; hover controls were difficult on touch. | Real links, visible save actions, named menu controls and focus outlines. |
| P2 | HD/PRO badges and footer pseudo-links conveyed unsupported capabilities/actions. | Remove invented badges; footer uses actual destinations. |
| P2 | Mobile search expansion competed with the header layout; watch pages lacked bottom navigation. | Explicit mobile search panel with Escape/focus return; shared bottom navigation on watch pages. |
| P2 | Tall dialogs could exceed the mobile viewport. | Bounded viewport height with internal scrolling. |

## Validation

- TypeScript check and five unit tests passed during implementation.
- Browser: saving/removing a video updates the visible pressed state.
- Browser: search results link to the watch page; Enter activates the video link.
- Browser: duration filter updates the URL; Back restores the prior filter.
- Browser: corrected title/thumbnail/ID associations inspected on real search results.
- Browser: home and watch pages have no horizontal overflow at the tested 390px viewport; mobile search opens and closes with Escape.
- Visual review: desktop dark/light themes; primary card and navigation layouts.
- Production browser: sample YouTube video visibly played after using its Play control; one iframe on the watch page.
- Production build passed. Existing native thumbnail rendering produces a Next.js image-optimization warning.
- First-load homepage JS: 191 kB before, 178 kB after (Next.js build report).

## Boundaries

Room synchronization and authenticated collection mutations require a separate multi-user/account test. YouTube playback availability still depends on its embed policies and the browser/network. No new dependencies or database migrations were introduced.
