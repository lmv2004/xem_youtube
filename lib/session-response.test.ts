import test from "node:test";
import assert from "node:assert/strict";
import { readConfirmedSession } from "./session-response";
import { authReturnPath } from "./auth-navigation";

test("login retains internal destinations and rejects external callbacks", () => {
  assert.equal(authReturnPath("/rooms/ABC234?join=1"), "/rooms/ABC234?join=1");
  for (const path of [
    null,
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
  ])
    assert.equal(authReturnPath(path), "/");
});

test("only successful empty session responses confirm logout", async () => {
  assert.equal(await readConfirmedSession(Response.json(null)), null);
  assert.equal(await readConfirmedSession(Response.json({})), null);
  for (const status of [401, 429, 500, 503])
    await assert.rejects(
      readConfirmedSession(Response.json({ message: "temporary" }, { status })),
    );
  await assert.rejects(
    readConfirmedSession(new Response("not JSON", { status: 200 })),
  );
  await assert.rejects(
    readConfirmedSession(Response.json({ error: "unavailable" })),
  );
  for (const value of [
    [],
    { user: "invalid", expires: "2026-12-01T00:00:00.000Z" },
    { user: [], expires: "2026-12-01T00:00:00.000Z" },
  ])
    await assert.rejects(readConfirmedSession(Response.json(value)));
});
test("valid server sessions retain their identity and expiry", async () => {
  const session = {
    user: { id: "host", name: "Host" },
    expires: "2026-12-01T00:00:00.000Z",
  };
  assert.deepEqual(await readConfirmedSession(Response.json(session)), session);
});
