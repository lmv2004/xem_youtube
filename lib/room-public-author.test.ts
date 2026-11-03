import test from "node:test";
import assert from "node:assert/strict";
import { roomPublicAuthor } from "./room-public-author";
test("room authors use public nicknames without Google profile fallbacks", () => {
    assert.deepEqual(roomPublicAuthor("user1", "  Movie   Fan "), { id: "user1", name: "Movie Fan", image: null });
    for (const value of [null, undefined, "", "private@gmail.com"])
        assert.equal(roomPublicAuthor("user1", value).name, "Khách");
    assert.equal(roomPublicAuthor("user1", "a".repeat(100)).name.length, 60);
});
