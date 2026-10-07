import { Client } from "pg";
import { prisma } from "./db";
import { playbackDto } from "./room-commands";
import { NOTICE_CHANNEL, type RoomEvent, type RoomNotice } from "./room-protocol";
import { PRESENCE_TIMEOUT_MS } from "./rooms";

type Subscriber = { receive: (event: RoomEvent) => void; disconnected: () => void };
export function realtimeDatabaseUrl() {
  const value = process.env.REALTIME_DATABASE_URL || process.env.DATABASE_URL;
  if (!value) throw new Error("Missing realtime database connection");
  const url = new URL(value);
  if (url.hostname.includes("pooler") || url.searchParams.get("pgbouncer") === "true") {
    throw new Error("LISTEN requires a direct REALTIME_DATABASE_URL, not a transaction pooler");
  }
  url.searchParams.delete("schema");
  if (["require", "prefer", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

/** One LISTEN connection per process, shared by all its room sockets. */
export class RoomEventBus {
  private client: Client | null = null;
  private connecting: Promise<void> | null = null;
  private subscribers = new Map<string, Set<Subscriber>>();
  private queues = new Map<string, Promise<void>>();

  async subscribe(code: string, subscriber: Subscriber) {
    let group = this.subscribers.get(code);
    if (!group) { group = new Set(); this.subscribers.set(code, group); }
    group.add(subscriber);
    const unsubscribe = () => {
      group!.delete(subscriber);
      if (!group!.size) this.subscribers.delete(code);
      if (!this.subscribers.size && this.client) {
        const client = this.client;
        this.client = null;
        this.connecting = null;
        void client.end().catch(() => {});
      }
    };
    try { await this.connect(); } catch (error) { unsubscribe(); throw error; }
    return unsubscribe;
  }
  private connect() {
    if (this.connecting) return this.connecting;
    const client = new Client({ connectionString: realtimeDatabaseUrl(), connectionTimeoutMillis: 10_000,
      keepAlive: true, application_name: "xemphim-room-events" });
    this.client = client;
    const failed = () => {
      if (this.client !== client) return;
      this.client = null;
      this.connecting = null;
      for (const group of [...this.subscribers.values()]) for (const sub of [...group]) sub.disconnected();
      void client.end().catch(() => {});
    };
    client.on("error", failed);
    client.on("end", failed);
    client.on("notification", (notification) => {
      if (notification.channel !== NOTICE_CHANNEL || !notification.payload) return;
      let notice: RoomNotice;
      try { notice = JSON.parse(notification.payload); } catch { return; }
      if (typeof notice.code !== "string" || !this.subscribers.has(notice.code)) return;
      const previous = this.queues.get(notice.code) ?? Promise.resolve();
      const next = previous.then(async () => {
        const event = await this.resolve(notice);
        if (event) for (const sub of this.subscribers.get(notice.code) ?? []) sub.receive(event);
      }).catch(failed).finally(() => { if (this.queues.get(notice.code) === next) this.queues.delete(notice.code); });
      this.queues.set(notice.code, next);
    });
    this.connecting = (async () => {
      try { await client.connect(); await client.query(`LISTEN ${NOTICE_CHANNEL}`); }
      catch (error) { failed(); throw error; }
    })();
    return this.connecting;
  }
  private async resolve(notice: RoomNotice): Promise<RoomEvent | null> {
    if (notice.kind === "closed") return { type: "closed" };
    if (notice.kind === "chat" && typeof notice.id === "string") {
      const row = await prisma.roomMessage.findFirst({ where: { id: notice.id, room: { code: notice.code } },
        include: { user: { select: { id: true, name: true, image: true } } } });
      return row ? { type: "chat", message: { id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), author: row.user } } : null;
    }
    if (notice.kind !== "members" && notice.kind !== "playback") return null;
    const room = await prisma.room.findUnique({ where: { code: notice.code } });
    if (!room) return { type: "closed" };
    if (notice.kind === "playback") return { type: "playback", update: playbackDto(room) };
    const rows = await prisma.roomPresence.findMany({ where: { roomId: room.id, lastSeenAt: { gte: new Date(Date.now() - PRESENCE_TIMEOUT_MS) } }, orderBy: { joinedAt: "asc" }, take: 100 });
    return { type: "members", members: rows.map((p) => ({ clientId: p.clientId, name: p.name, image: p.image,
      isHost: p.userId === room.hostId, isGuest: !p.userId, joinedAt: p.joinedAt.toISOString() })) };
  }
}
const globalBus = globalThis as unknown as { roomEventBus?: RoomEventBus };
export const roomEventBus = globalBus.roomEventBus ??= new RoomEventBus();
