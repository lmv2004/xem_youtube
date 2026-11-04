# Direct-link room queue

The queue tab accepts YouTube watch/share/Shorts/live URLs and bare video IDs. It resolves optional title/channel metadata through YouTube oEmbed, never the YouTube Search/Data API. Failed, rate-limited or timed-out metadata falls back to an explicitly labelled YouTube video ID with canonical embed/watch URLs and a thumbnail; unknown duration remains zero and existing player-ended reporting supplies the real duration.

Queue contributions use the existing optimistic command path and server permissions. The form prevents duplicate submissions, preserves a subsequent draft while an earlier link is submitting, and retains failed input. Queue success is reported after server acknowledgement while the optimistic row is still inserted immediately.

Validation: URL normalization/invalid hosts, oEmbed-only requests and metadata 429/network/malformed fallback unit tests; browser fixture for duplicate-submit protection, subsequent typing, failed input, permissions and 390px layout. HTTP integration resolves a direct link without a usable Search API key, submits the resulting video through room commands and verifies the queue snapshot. New UI strings support Vietnamese, English and Telugu. Temporary visual fixture routes are removed before build.

Reference: https://oembed.com/ and https://github.com/iamcal/oembed/blob/master/providers/youtube.yml

A real guest-room browser test also passed with Search API requests forced to 429 and metadata resolution forced to 503: a pasted link reached the server-confirmed database queue and the confirmed draft cleared. Production build, typecheck, lint, 14 targeted unit tests and HTTP integration passed.
