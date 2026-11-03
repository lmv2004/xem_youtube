import type { RoomMessageDto } from "./rooms";

/** Baseline the first completed sync; count new incoming IDs, never poll echoes. */
export function createRoomUnreadTracker() {
  const seen = new Set<string>();
  let initialized = false;
  let unread = 0;
  return {
    update(messages: RoomMessageDto[], ready: boolean, ownId: string | null | undefined, reading: boolean) {
      if (!ready) return unread;
      for (const message of messages) {
        if (initialized && !seen.has(message.id) && message.author.id !== ownId) unread++;
        seen.add(message.id);
      }
      initialized = true;
      if (reading) unread = 0;
      return unread;
    },
  };
}
