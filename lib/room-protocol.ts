import { z } from "zod";
import type { RoomMemberDto, RoomMessageDto, RoomPlaybackUpdate } from "./rooms";

export const playbackInput = z.object({
  isPlaying: z.boolean().optional(),
  positionSeconds: z.number().min(0).max(86_400).optional(),
  hostOnlyControl: z.boolean().optional(),
  video: z.object({
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1).max(300), channel: z.string().max(200).default(""),
    thumbnail: z.string().max(600).default(""), embedUrl: z.string().max(600),
    watchUrl: z.string().max(600), duration: z.number().int().min(0).max(86400).default(0),
  }).optional(),
});
export const roomCommand = z.discriminatedUnion("type", [
  z.object({ type: z.literal("chat"), requestId: z.string().min(1).max(64), body: z.string().trim().min(1).max(500) }),
  z.object({ type: z.literal("playback"), requestId: z.string().min(1).max(64), payload: playbackInput }),
]);
export type RoomCommand = z.infer<typeof roomCommand>;
export type RoomEvent =
  | { type: "ready"; serverTime: string }
  | { type: "chat"; message: RoomMessageDto }
  | { type: "playback"; update: RoomPlaybackUpdate }
  | { type: "members"; members: RoomMemberDto[] }
  | { type: "closed" }
  | { type: "ack"; requestId: string; ok: boolean; data?: RoomMessageDto | RoomPlaybackUpdate; message?: string };
export type RoomNotice = { code: string; kind: "chat" | "playback" | "members" | "closed"; id?: string };
export const NOTICE_CHANNEL = "xemphim_rooms_v1";
