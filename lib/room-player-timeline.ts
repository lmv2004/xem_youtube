/** Live duration grows with the broadcast. It is not a VOD seek limit. */
export function createRoomPlayerTimeline() {
  let sample: { duration: number; at: number } | undefined;
  let live = false;
  return {
    observe(duration: number, knownDuration: number, liveHint = false, now = Date.now()) {
      if (liveHint) live = true;
      if (!Number.isFinite(duration) || duration <= 0) return live ? "live" : "unknown";
      if (!sample) sample = { duration, at: now };
      const elapsed = (now - sample.at) / 1000;
      const growth = duration - sample.duration;
      if (elapsed >= 1 && growth >= 0.75 && growth <= elapsed * 2 + 2) live = true;
      if (live) return "live";
      if (Math.abs(growth) > 0.5) sample = { duration, at: now };
      // Links can have no metadata. Wait for a stable duration before seeking.
      if (knownDuration > 0 || now - sample.at >= 6000) return "video";
      return "unknown";
    },
    reset() {
      sample = undefined;
      live = false;
    },
  };
}

export function boundedRoomPosition(position: number, duration: number) {
  const safe = Number.isFinite(position) ? Math.max(0, position) : 0;
  return Number.isFinite(duration) && duration > 0 ? Math.min(safe, duration) : safe;
}

/** Broadcast duration starts before the room exists, so its end uses room time. */
export function roomEndDuration(duration: number, live: boolean, roomPosition: number) {
  return Math.max(0.1, Math.min(86_400, live ? roomPosition : duration));
}
