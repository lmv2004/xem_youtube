import { z } from "zod";

export const playbackInput = z.object({
  isPlaying: z.boolean().optional(),
  positionSeconds: z.number().min(0).max(86_400).optional(),
  hostOnlyControl: z.boolean().optional(),
  video: z
    .object({
      videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
      title: z.string().trim().min(1).max(300),
      channel: z.string().max(200).default(""),
      thumbnail: z.string().max(600).default(""),
      embedUrl: z.string().max(600),
      watchUrl: z.string().max(600),
      duration: z.number().int().min(0).max(86400).default(0),
    })
    .optional(),
});
export const roomCommand = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rename"),
    requestId: z.string().min(1).max(64),
    title: z.string().trim().min(1).max(80),
  }),
  z.object({
    type: z.literal("queue"),
    requestId: z.string().min(1).max(64),
    payload: z.discriminatedUnion("action", [
      z.object({
        action: z.literal("add"),
        id: z.string().uuid().optional(),
        video: playbackInput.shape.video.unwrap(),
      }),
      z.object({ action: z.literal("remove"), id: z.string().min(1).max(64) }),
      z.object({
        action: z.literal("move"),
        id: z.string().min(1).max(64),
        direction: z.enum(["up", "down"]),
        beforeId: z.string().min(1).max(64).optional(),
        afterId: z.string().min(1).max(64).optional(),
      }),
      z.object({
        action: z.literal("next"),
        generation: z.number().int().nonnegative(),
      }),
      z.object({
        action: z.literal("ended"),
        generation: z.number().int().nonnegative(),
        duration: z.number().positive().max(86400),
      }),
    ]),
  }),
  z.object({
    type: z.literal("chat"),
    requestId: z.string().min(1).max(64),
    body: z.string().trim().min(1).max(500),
    messageId: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal("playback"),
    requestId: z.string().min(1).max(64),
    payload: playbackInput,
  }),
]);
export type RoomCommand = z.infer<typeof roomCommand>;
