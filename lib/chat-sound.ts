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

const buffers = new WeakMap<AudioContext, Promise<AudioBuffer>>();
const sources = new WeakMap<AudioContext, AudioBufferSourceNode>();

export function loadChatSound(context: AudioContext): Promise<AudioBuffer> {
  const cached = buffers.get(context);
  if (cached) return cached;
  const request = fetch("/sounds/room-notification.mp3")
    .then(response => {
      if (!response.ok) throw new Error("Notification sound unavailable");
      return response.arrayBuffer();
    })
    .then(data => context.decodeAudioData(data))
    .catch(error => { buffers.delete(context); throw error; });
  buffers.set(context, request);
  return request;
}

export async function playChatTone(context: AudioContext, volume = 70, shouldPlay = () => true) {
  const buffer = await loadChatSound(context);
  if (context.state !== "running" || !shouldPlay()) return;
  // Repeated previews replace the previous cue instead of stacking sounds.
  sources.get(context)?.stop();
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = normalizeChatVolume(volume) / 100;
  source.connect(gain);
  gain.connect(context.destination);
  sources.set(context, source);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
    if (sources.get(context) === source) sources.delete(context);
  };
  source.start();
}
