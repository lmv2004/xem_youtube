import test from "node:test";
import assert from "node:assert/strict";
import { defaultStageState, withStageState, toggleStage, requestStageJoin, approveStageRequest, setStageLimit } from "./room-stage";
const cat = (clientId: string) => ({clientId, name: "Guest", catId: "cat", catGifUrl: "https://example.com/cat.gif", catName: "Cat"});
test("full-stage approval preserves the pending request", () => {
  const state = defaultStageState();
  withStageState(state, () => {
    toggleStage("TEST", true, {clientId: "host"});
    setStageLimit("TEST", 1);
    requestStageJoin("TEST", cat("guest"));
    approveStageRequest("TEST", "guest");
    assert.equal(state.requests.length, 1);
    setStageLimit("TEST", 2);
    approveStageRequest("TEST", "guest");
    assert.equal(state.participants.length, 2);
    assert.equal(state.requests.length, 0);
  });
});
test("transaction-scoped states cannot leak between concurrent rooms", async () => {
  const first=defaultStageState(), second=defaultStageState();
  await Promise.all([withStageState(first, async()=>{await Promise.resolve();toggleStage("A",true);}), withStageState(second, async()=>{await Promise.resolve();assert.equal(second.enabled,false);})]);
  assert.equal(first.enabled,true); assert.equal(second.enabled,false);
});
