/** One cue per burst. Counts are updated even when sound cannot play. */
export function createChatSoundGate(intervalMs = 4000) {
  let previous = 0;
  let lastPlayed = -Infinity;
  return (unread: number, enabled: boolean, now: number) => {
    const incoming = unread > previous;
    previous = unread;
    if (!incoming || !enabled || now - lastPlayed < intervalMs) return false;
    lastPlayed = now;
    return true;
  };
}

export function normalizeChatVolume(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(10, Math.round(value))) : 70;
}

export function playChatTone(context: AudioContext, volume = 70) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1046, start);
  oscillator.frequency.exponentialRampToValueAtTime(784, start + .24);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(.32 * normalizeChatVolume(volume) / 100, start + .015);
  gain.gain.exponentialRampToValueAtTime(.001, start + .35);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(start);
  oscillator.stop(start + .38);
}
