export type OutboxMessage = {
  id: number;
  messageId: string;
  createdAt: string;
  body: string;
  status: "queued" | "sending" | "failed";
};

/** Owns submitted text independently of the editor. Only one POST runs at a time. */
export function createRoomOutbox(
  send: (body: string, messageId: string) => Promise<boolean>,
  changed: (messages: OutboxMessage[]) => void,
) {
  let messages: OutboxMessage[] = [];
  let sequence = 0;
  let running = false;
  let stopped = false;
  const publish = () => {
    if (!stopped) changed(messages.map((m) => ({ ...m })));
  };
  const drain = async () => {
    if (running || stopped) return;
    running = true;
    try {
      let next: OutboxMessage | undefined;
      while (!stopped && (next = messages.find((m) => m.status === "queued"))) {
        next.status = "sending";
        publish();
        let ok = false;
        try {
          ok = await send(next.body, next.messageId);
        } catch {
          /* Retain the failed text. */
        }
        if (stopped) return;
        if (ok) messages = messages.filter((m) => m.id !== next!.id);
        else next.status = "failed";
        publish();
      }
    } finally {
      running = false;
    }
  };
  return {
    enqueue(body: string) {
      if (stopped || !body.trim() || messages.length >= 20) return false;
      messages.push({
        id: ++sequence,
        messageId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        body: body.trim(),
        status: "queued",
      });
      publish();
      void drain();
      return true;
    },
    acknowledge(ids: Set<string>) {
      if (!messages.some((m) => ids.has(m.messageId))) return;
      messages = messages.filter((m) => !ids.has(m.messageId));
      publish();
    },
    restore(id: number) {
      const message = messages.find(
        (m) => m.id === id && m.status === "failed",
      );
      if (!message) return null;
      messages = messages.filter((m) => m.id !== id);
      publish();
      return message.body;
    },
    stop() {
      stopped = true;
    },
  };
}
