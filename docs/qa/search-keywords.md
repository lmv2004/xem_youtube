# Keyword suggestions

The home search and header search now share one accessible autocomplete. It shows matching recent searches and a small editorial keyword catalog in Vietnamese, English and Telugu. These are starting points, not live YouTube popularity data. Typing filters the list locally and does not call an API; submitting still uses the existing video search.

Recent searches keep their existing browser storage format. Matching ignores Vietnamese accents and casing, preserves Telugu vowel signs, removes duplicate phrases, and hides suggestions for video IDs and links. Results are limited to six rows, with discovery keywords still visible when the empty input has a full search history.

## Verification

- `npm run typecheck` and `npm run lint` passed.
- `npm run build` passed with placeholder credentials and an isolated local database URL; no production data was used.
- `node --import tsx --test lib/*.test.ts` passed all 65 tests, including nine new suggestion tests.
- Browser checks covered home and header searches, pointer selection, arrow keys and Enter, Escape retaining input focus, mobile Escape returning to the search trigger, recent searches shared between the two fields, Vietnamese accent matching, English and Telugu suggestions, and opening a pasted YouTube URL.
- Visually checked the desktop layout, mobile layout at 390 × 844, and light/dark themes. No horizontal overflow at the mobile size.
- Physical-device touch input, native IME conversion and screen-reader speech were not tested. Composition events are guarded in both search fields.

![Desktop search](search-keywords-desktop.png)

![Mobile search](search-keywords-mobile.png)

![Dark header search](search-keywords-dark.png)
