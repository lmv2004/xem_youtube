import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerEventGuard } from "./player-event-guard";

test("late YouTube responses to scripted actions do not become new room commands", () => {
  const guard = createPlayerEventGuard();
  guard.expect(true, 1200, 0);
  assert.equal(guard.consume(true, 8000), true);
  assert.equal(guard.consume(false, 8100), false, "subsequent user pause must propagate");
});
test("video loading transitions are quiet but subsequent manual controls propagate", () => {
  const guard = createPlayerEventGuard();
  guard.expect(true, 2500, 0);
  assert.equal(guard.consume(false, 1500), true);
  assert.equal(guard.consume(true, 4000), true);
  assert.equal(guard.consume(false, 5000), false);
  guard.expect(true, 1200, 6000);
  assert.equal(guard.consume(false, 8000), false, "opposite user action after the quiet window is allowed");
});
test("an autoplay-blocked action cannot swallow a later manual play indefinitely", () => {
  const guard = createPlayerEventGuard();
  guard.expect(true, 1200, 0);
  assert.equal(guard.consume(true, 11000), false);
});
