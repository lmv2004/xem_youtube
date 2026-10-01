import assert from "node:assert/strict";
import test from "node:test";
import { youtubeEmbedUrl } from "./youtube-embed";

test("user-initiated playback requests autoplay and inline controls", () => {
  const url = new URL(youtubeEmbedUrl("dQw4w9WgXcQ"));
  assert.equal(url.origin, "https://www.youtube.com");
  assert.equal(url.pathname, "/embed/dQw4w9WgXcQ");
  assert.equal(url.searchParams.get("autoplay"), "1");
  assert.equal(url.searchParams.get("playsinline"), "1");
  assert.equal(url.searchParams.has("playlist"), false);
});

test("single-video looping includes the matching playlist", () => {
  const url = new URL(youtubeEmbedUrl("dQw4w9WgXcQ", true));
  assert.equal(url.searchParams.get("loop"), "1");
  assert.equal(url.searchParams.get("playlist"), "dQw4w9WgXcQ");
});

test("video input cannot inject player query parameters", () => {
  const url = new URL(youtubeEmbedUrl("invalid?autoplay=0&controls=0"));
  assert.equal(url.searchParams.get("autoplay"), "1");
  assert.equal(url.searchParams.has("controls"), false);
});
