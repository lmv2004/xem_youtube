import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoomReconnectNotice,
  isScheduledRoomRenewal,
  ROOM_RECONNECT_NOTICE_DELAY_MS,
} from "./room-reconnect";

test("only the scheduled server expiry receives the quiet renewal policy", () => {
  assert.equal(
    isScheduledRoomRenewal({ code: 1012, reason: "Reconnect" }),
    true,
  );
  for (const event of [
    { code: 1006, reason: "" },
    { code: 1012, reason: "Event connection lost" },
    { code: 1012, reason: "Presence unavailable" },
    { code: 1000, reason: "Reconnect" },
  ])
    assert.equal(isScheduledRoomRenewal(event), false);
});
test("a fast renewal never shows a warning and releases commands waiting for readiness", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const warnings: boolean[] = [];
  const notice = createRoomReconnectNotice((value) => warnings.push(value));
  notice.begin(true);
  const command = notice.waitForReady();
  context.mock.timers.tick(1000);
  notice.restored();
  await command;
  context.mock.timers.tick(20_000);
  assert.equal(warnings.includes(true), false);
  assert.equal(notice.renewing, false);
  notice.dispose();
});
test("a slow renewal shows a warning without resetting its deadline on retry", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const warnings: boolean[] = [];
  const notice = createRoomReconnectNotice((value) => warnings.push(value));
  notice.begin(true);
  context.mock.timers.tick(2000);
  notice.begin(true);
  context.mock.timers.tick(ROOM_RECONNECT_NOTICE_DELAY_MS - 2000);
  assert.deepEqual(warnings, [false, true]);
  notice.restored();
  assert.deepEqual(warnings, [false, true, false]);
  notice.dispose();
});
test("real connection failure warns immediately and rejects waiting sends without replay", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const warnings: boolean[] = [];
  const notice = createRoomReconnectNotice((value) => warnings.push(value));
  notice.begin(true);
  const failed = assert.rejects(notice.waitForReady(), /kết nối lại/);
  notice.begin(false);
  await failed;
  assert.deepEqual(warnings, [false, true]);
  assert.equal(notice.renewing, false);
  context.mock.timers.tick(20_000);
  assert.deepEqual(warnings, [false, true]);
  notice.dispose();
});
test("leaving cancels notice timers and waiting sends", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const warnings: boolean[] = [];
  const notice = createRoomReconnectNotice((value) => warnings.push(value));
  notice.begin(true);
  const cancelled = assert.rejects(notice.waitForReady());
  notice.dispose();
  await cancelled;
  context.mock.timers.tick(20_000);
  notice.restored();
  assert.deepEqual(warnings, [false]);
});
test("waiting through a stalled renewal is bounded", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const notice = createRoomReconnectNotice(() => {});
  notice.begin(true);
  const failed = assert.rejects(notice.waitForReady(), /kết nối lại/);
  context.mock.timers.tick(15_000);
  await failed;
  notice.dispose();
});
