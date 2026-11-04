import { stageLightingSchema } from "./stage-lighting-schema";
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STAGE_LIGHTING, normalizeStageLighting, stageLightingStyle } from "./stage-lighting";
import { defaultStageState, withStageState, setStageLighting, clearStage } from "./room-stage";
test("old room snapshots and corrupt settings use the existing gentle default", () => {
  assert.deepEqual(normalizeStageLighting(undefined),DEFAULT_STAGE_LIGHTING);
  assert.deepEqual(normalizeStageLighting({palette:"unknown"}),DEFAULT_STAGE_LIGHTING);
  assert.deepEqual(normalizeStageLighting({...DEFAULT_STAGE_LIGHTING,brightness:999}),DEFAULT_STAGE_LIGHTING);
});
test("validated settings cannot inject CSS or unbounded intensity", () => {
  for(const patch of [{palette:"red;display:none"},{brightness:19},{brightness:101},{brightness:50.5},{pulse:"strobe"},{extra:true}]) assert.equal(stageLightingSchema.safeParse({...DEFAULT_STAGE_LIGHTING,...patch}).success,false);
  const style=stageLightingStyle({...DEFAULT_STAGE_LIGHTING,palette:"sunset",motion:"fast",pulse:"fast",brightness:80});
  assert.equal(style["--concert-level"],"0.8"); assert.equal(style["--concert-pulse"],"1.5s"); assert.equal(style["--concert-speed"],"4.5s");
});
test("stage lighting survives performer clearing and serialization", () => {
  const stage=defaultStageState(); const config={...DEFAULT_STAGE_LIGHTING,type:"wash",palette:"ocean"} as const;
  withStageState(stage,()=>{setStageLighting("ROOM",config);clearStage("ROOM")});
  assert.deepEqual(JSON.parse(JSON.stringify(stage)).lighting,config);
});
