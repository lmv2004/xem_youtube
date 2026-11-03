import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerEventGuard, createPlayerVisibilityGuard } from "./player-event-guard";

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

test("background lifecycle changes never publish play/pause", () => {
  const guard = createPlayerVisibilityGuard();
  assert.equal(guard.allows(100), true);
  guard.change(true, 101);
  assert.equal(guard.allows(102), false);
  assert.equal(guard.allows(90000), false);
});
test("restoring a tab filters delayed lifecycle events then permits manual control", () => {
  const guard = createPlayerVisibilityGuard(true);
  assert.equal(guard.allows(0), false);
  guard.change(false, 1000);
  assert.equal(guard.allows(1001), false);
  assert.equal(guard.allows(2499), false);
  assert.equal(guard.allows(2500), true);
  guard.change(false, 2600);
  assert.equal(guard.allows(2600), true);
});
test("rapid hide/show cycles restart protection", () => {
  const guard = createPlayerVisibilityGuard();
  guard.change(true, 10);
  guard.change(false, 20);
  guard.change(true, 30);
  guard.change(false, 40);
  assert.equal(guard.allows(1520), false);
  assert.equal(guard.allows(1540), true);
});
