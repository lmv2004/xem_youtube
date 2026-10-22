# Weekly popular search keywords

Search suggestions keep their instant local behavior. A separate, best-effort
`POST /api/searches` records only submitted keyword searches; typing and opening
a video URL do not record events. Recording failures never block video results.
Client writes run in a bounded queue of twenty events with an eight-second
deadline per write. Supported browsers coordinate that queue across tabs with
a Web Lock so initial concurrent searches reuse the first response's visitor
cookie. Other browsers serialize within each tab. No tracking writes are retried.

`GET /api/searches?locale=vi` (also `en` or `te`) returns up to ten real terms,
their qualified search counts, `windowDays: 7`, and `updatedAt`. It uses a
trailing **168-hour** window with millisecond precision. Each language has its
own ranking. Count ties use normalized keyword order, so ordering is stable.
The most frequent spelling is displayed; spelling ties also have stable order.
No sample counts or artificial fallback trends are returned.

## Counting and privacy

- An event UUID is unique across retries. Database constraints also count each
  normalized keyword once per anonymous browser, language, and **fixed five-minute
  bucket**. A bucket boundary can therefore allow two events less than five
  minutes apart; this is a lightweight spam control, not a unique-people metric.
- Each keyword needs at least **two distinct anonymous browser identifiers** in
  the current window before it appears publicly. A new installation can have an
  empty ranking until real searches qualify. Counts are searches, not people.
- Cookies contain a signed random UUID and last fourteen days. The cookie is
  HttpOnly, SameSite=Lax, Secure over HTTPS, and scoped to `/api/searches`. The
  database contains only an HMAC identifier derived using the existing
  `AUTH_SECRET` or `NEXTAUTH_SECRET`; no account identifiers, email addresses,
  raw IP addresses, or cookie UUIDs are stored. Existing secrets are not changed.
- Obvious URLs, video IDs, email addresses, phone-like numbers, and invalid input
  are excluded. This heuristic does not identify every possible private phrase;
  the two-browser threshold is an additional exposure limit.
- The POST is limited to JSON, 2 KB, a valid event UUID and a supported locale,
  with a matching Origin. Per-browser writes are capped at thirty per trailing
  hour. Transactional advisory locks and unique constraints enforce these limits
  across tabs and concurrent instances. Cookie resets are not a bot-proof identity.
- Stale rows are removed opportunistically: up to 1,000 events older than
  fourteen days per warm process per hour of writes. Low-traffic deployments may
  keep expired rows longer, but those rows never participate in the seven-day
  ranking. Only this feature's `SearchEvent` table is cleaned.

The aggregate query is cached for sixty seconds in the Next.js Data Cache.
Its cache namespace includes a digest of the database URL to keep local,
preview and production datasets separate. The public endpoint bypasses auth
middleware and does not issue authentication cookies or read sessions.
Successful GETs also allow a sixty-second CDN cache and a sixty-second stale
response during revalidation. Consequently the visible ranking may lag new
submissions and expiration by a few minutes. Failures return 503 with no-store;
they are not disguised as a successful empty ranking. Neither route reads auth
sessions, user history, or room state.

## Deployment

The Prisma schema adds a standalone `SearchEvent` table with indexes. Existing
deployments use the additive, idempotent script:

```sh
node scripts/ensure-search-analytics.mjs
```

Run it through the build/deployment sequence with the existing `DATABASE_URL`,
after `prisma generate`. It creates only the new table and indexes, and never
resets the database or modifies user, collection, history, or room records.
Fresh local databases may instead follow the project's normal Prisma setup.
No new service, cron, API key, secret value, or environment variable is required.
If the existing auth secret is absent, recording responds 503 while search keeps
working; set the same existing application auth secret rather than adding a new one.
