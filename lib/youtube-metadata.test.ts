import assert from "node:assert/strict";
import test from "node:test";
import { matchVideoSnippet } from "./youtube-metadata";

test("non-video results do not shift titles onto the next video", () => {
  const results = [
    { id: {}, snippet: { title: "Channel" } },
    { id: { videoId: "video-a" }, snippet: { title: "Video A" } },
    { id: { videoId: "video-b" }, snippet: { title: "Video B" } },
  ];
  assert.equal(matchVideoSnippet("video-b", results)?.title, "Video B");
  assert.equal(matchVideoSnippet("video-a", results)?.title, "Video A");
  assert.equal(matchVideoSnippet("missing", results), undefined);
});

test("fresh detail metadata takes precedence over search snippets", () => {
  assert.equal(
    matchVideoSnippet(
      "a",
      [{ id: { videoId: "a" }, snippet: { title: "Old" } }],
      { snippet: { title: "Current" } },
    )?.title,
    "Current",
  );
});
