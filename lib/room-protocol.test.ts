import test from "node:test";
import assert from "node:assert/strict";
import { roomCommand } from "./room-protocol";

test("wire commands reject invalid chat, excessive payloads and nonfinite positions", () => {
  assert.equal(roomCommand.safeParse({ type: "chat", requestId: "a", body: "  " }).success, false);
  assert.equal(roomCommand.safeParse({ type: "chat", requestId: "a", body: "x".repeat(501) }).success, false);
  assert.equal(roomCommand.safeParse({ type: "playback", requestId: "a", payload: { positionSeconds: Infinity } }).success, false);
  assert.equal(roomCommand.safeParse({ type: "playback", requestId: "a", payload: { positionSeconds: -1 } }).success, false);
  assert.equal(roomCommand.safeParse({ type: "delete", requestId: "a" }).success, false);
});

test("client cannot supply an authenticated actor through a command", () => {
  const parsed = roomCommand.parse({ type: "chat", requestId: "a", body: "hello", userId: "host", isHost: true });
  assert.deepEqual(parsed, { type: "chat", requestId: "a", body: "hello" });
  const playback = roomCommand.parse({ type: "playback", requestId: "b", payload: { isPlaying: true, clientId: "host" } });
  assert.deepEqual(playback, { type: "playback", requestId: "b", payload: { isPlaying: true } });
});

test("queue commands require a valid generation and bounded video metadata", () => {
  assert.equal(roomCommand.safeParse({ type: "queue", requestId: "q", payload: { action: "ended", generation: -1, duration: 100 } }).success, false);
  assert.equal(roomCommand.safeParse({ type: "queue", requestId: "q", payload: { action: "ended", generation: 0, duration: 0 } }).success, false);
  assert.equal(roomCommand.safeParse({ type: "queue", requestId: "q", payload: { action: "next" } }).success, false);
  assert.equal(roomCommand.safeParse({ type: "queue", requestId: "q", payload: { action: "clear" } }).success, false);
  assert.equal(roomCommand.safeParse({ type: "queue", requestId: "q", payload: { action: "add", video: { videoId: "invalid", title: "QA" } } }).success, false);
  assert.equal(roomCommand.safeParse({ type: "queue", requestId: "q", payload: { action: "next", generation: 0 } }).success, true);
});
