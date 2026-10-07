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
