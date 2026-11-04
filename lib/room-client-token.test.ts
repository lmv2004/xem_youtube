import test from "node:test";
import assert from "node:assert/strict";
import { roomClientToken, verifyRoomClientToken } from "./room-client-token";
test("membership proof is scoped to room, client and private browser owner", () => {
  process.env.AUTH_SECRET ||= "isolated-unit-test-secret";
  const token=roomClientToken("room", "client", "browser");
  assert.equal(verifyRoomClientToken("room","client","browser",token),true);
  assert.equal(verifyRoomClientToken("other","client","browser",token),false);
  assert.equal(verifyRoomClientToken("room","other","browser",token),false);
  assert.equal(verifyRoomClientToken("room","client","other",token),false);
  assert.equal(verifyRoomClientToken("room","client","browser","bad"),false);
});
