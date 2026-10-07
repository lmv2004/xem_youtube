/** YouTube can report a scripted play/pause several seconds after the call. */
export function createPlayerEventGuard() {
  let expected: { playing: boolean; started: number; quietMs: number } | null = null;
  return {
    expect(playing: boolean, quietMs = 1200, now = Date.now()) {
      expected = { playing, started: now, quietMs };
    },
    consume(playing: boolean, now = Date.now()) {
      if (!expected) return false;
      const elapsed = now - expected.started;
      if (elapsed > 10_000) { expected = null; return false; }
      if (playing === expected.playing) { expected = null; return true; }
      if (elapsed < expected.quietMs) return true;
      expected = null;
      return false;
    },
  };
}
