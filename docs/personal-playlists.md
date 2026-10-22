# Personal playlist playback

“Start watching” in Watch Later or a collection plays a snapshot of the visible,
filtered and sorted videos. Selecting a row starts that same list at the selected
video. Next and Previous follow the displayed order; Shuffle changes only the
remaining videos and can restore the original order. Repeat playlist wraps at
the end. The player's separate Repeat video control takes precedence while on.

The snapshot lives in this tab's session storage, so refreshing retains the
playlist. It is not synchronized to another device or an independent tab, and
closing the tab ends the session. Up to five recent snapshots are retained with
at most 500 videos each. A visible notice identifies the selected range when a
larger collection is bounded. Existing Watch Later and collection data is never
changed. Shared video links omit the opaque local playlist context and do not
expose collection titles or contents.
Collection snapshots are only shown while signed in as the account that created
them; signing out or switching accounts hides the private queue.

The YouTube IFrame API's ended event advances once to the next video; playback
still depends on YouTube availability, browser autoplay policy and networking.
There is no promise of gapless playback or continued playback on a locked device.
Blocked autoplay has an explicit Play action. Unavailable videos retain queue
controls so viewers can skip them. A missing snapshot falls back to standalone
video playback; blocked storage keeps the queue in memory with a visible warning.

Verify with typecheck, lint, the Node unit suite and a production build. Manual
checks: start a filtered/sorted collection, choose a middle row, use Next and
Previous, toggle Shuffle and Repeat playlist, refresh, share a timestamp link,
switch to mobile width and open the list with the keyboard. At the end of the
last video it stops unless Repeat playlist is enabled; Repeat video keeps that
video playing instead of advancing.
