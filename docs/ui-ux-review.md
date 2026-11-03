# UI/UX review — 2026-11-03

Scope: local review on codex/ui-polish-room-notifications; preserves earlier room changes. No deploy, database migration or new production dependency.

## Findings and changes

| Priority | Finding | Change |
| --- | --- | --- |
| High | Vietnamese sign-in text overflowed the header at 320px | Mobile icon button with accessible name; desktop keeps text |
| High | Mobile language select clipped its selected label | Existing Radix radio menu; compact language code on mobile, full names in the menu |
| High | Several navigation destinations had no route loading boundary | Shared localized skeleton for favorites, history, watch later, account, room directory and room detail |
| High | Motion classes on dialogs depended on animation utilities not configured here | Explicit CSS animations driven by Radix state; reduced-motion override |
| Medium | Inconsistent button and field geometry | Rounded controls, 44px defaults, short press feedback, larger mobile input text |
| Medium | Auth forms lacked a page heading and password visibility control | h1 headings and accessible show/hide control, preserving autocomplete |
| Medium | Main navigation repeated for keyboard users | Localized skip-to-content link |
| Medium | Service configuration instructions exposed in search error UI | Plain user-facing temporary-unavailability message and retry |
| Medium | Video cards and menus lacked consistent feedback | Subtle thumbnail hover, menu enter/exit, scroll bounds on long menus |

## Validation

- Next production build passed, including type checking and lint.
- All existing lib/*.test.ts tests passed.
- Headless Edge on local production build: 1440x900 and 390x900.
- Home, quick watch, watch later, room directory, login and register: no horizontal document overflow.
- Password reveal/hide, language menu and light theme interactions passed at both widths.
- Unauthenticated favorites, history and account correctly redirect to login.
- Screenshots inspected: home desktop/mobile, room directory desktop, login desktop and mobile light theme.

## Limits

Private library/collection/account content needs an authenticated review. Room playback/chat under multiple real users was not re-tested in this styling pass. Browser checks do not replace assistive-technology or full contrast auditing. Localhost uses the existing remote database; review actions can write to it.

## Implementation references

- https://www.radix-ui.com/primitives/docs/overview/accessibility
- https://nextjs.org/docs/app/api-reference/file-conventions/loading
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility

The Community Wisdom connector was not available in this session; no community claims are inferred.

Additional checks: full vi/en/te language switching and keyboard skip link passed. The first rapid menu test was corrected to wait for the closing animation before reopening.

## Final additions and verification

- Full-width shared content shell, aligned header/footer and responsive video columns; separate watch player width limit removed.
- Browser measurements at 1920px: home, watch later and rooms use 24px outside margins; 390px mobile uses 16px, with no document overflow. Rechecked 320px in Vietnamese, English and Telugu after fixing the sign-in control.
- Room chat unread counters on tabs, collapsed controls and document title; jump-to-latest preserves reading position. Initial history, own messages and poll echoes are excluded.
- Opt-in synthesized notification sound with persisted 10–100% volume, preview and four-second rate limit. Audio signal rendered in headless Edge at three volume settings; no residual signal after the cue.
- Hidden/background player state changes no longer become room play/pause commands. A 150ms pause delay handles pause-before-hide ordering; a 1.5s restoration window rejects delayed lifecycle events. Manual pause/play passed the isolated browser test with a simulated YouTube player.
- Final production build, lint/type checking and all 110 library tests passed. Temporary browser harness routes were removed.
- Real-device background playback and concurrent live users still require field validation; the browser lifecycle test uses simulated YouTube events.

## Notification attention follow-up

Chat counts as read only when its panel is active/in view, at the latest messages, the document is visible and focused, and there has been interaction within 60 seconds. This is a heuristic, not gaze detection. Programmatic chat scrolling does not reset the inactivity timer. Saved sound preferences now attempt AudioContext initialization on mount; blocked/suspended audio exposes an explicit activation control.

An isolated browser harness verified focus/blur, hidden/visible transitions, a 61-second idle period, keyboard reactivation and ignoring programmatic scrolling. With an allowed AudioContext mock, saved sound initialized and a new unread cue played without an extra click. Actual OS background audio restrictions remain browser-dependent. Harness routes were removed after the check.
