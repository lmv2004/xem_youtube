import assert from "node:assert/strict";
import test from "node:test";
import {
  adjacentPlaylistVideo,
  canAccessPersonalPlaylist,
  createPlaylistAdvanceGuard,
  MAX_PERSONAL_PLAYLIST_ITEMS,
  normalizePersonalPlaylist,
  personalPlaylistHref,
  PLAYLIST_STORAGE_KEY,
  playlistIndex,
  standaloneVideoUrl,
  togglePlaylistShuffle,
} from "./personal-playlist";
import { hasUnpersistedPlaylist, readPersonalPlaylist, savePersonalPlaylist } from "./personal-playlist-storage";

const item = (number: number) => ({
  id: `v${String(number).padStart(10, "0")}`,
  title: `Video ${number}`,
  channel: "Channel",
  thumbnail: "https://i.ytimg.com/test.jpg",
  description: "Private description that need not be retained",
  durationSeconds: 120,
  viewCount: 3,
});
const create = () => normalizePersonalPlaylist({
  id: "11111111-1111-4111-8111-111111111111",
  title: "Private collection",
  items: [item(4), item(2), item(1), item(3)],
})!;

test("playlist snapshot preserves the displayed source order, deduplicates and validates IDs", () => {
  const playlist = normalizePersonalPlaylist({ ...create(), items: [item(4), item(2), item(4), { ...item(1), id: "bad" }, item(3)] })!;
  assert.deepEqual(playlist.items.map((video) => video.id), [item(4).id, item(2).id, item(3).id]);
  assert.deepEqual(playlist.order, playlist.items.map((video) => video.id));
  assert.equal(playlist.items[0].description, "");
  assert.equal(normalizePersonalPlaylist({ ...create(), id: "../unsafe" }), null);
  assert.equal(normalizePersonalPlaylist({ ...create(), items: [] }), null);
  assert.equal(normalizePersonalPlaylist(null), null);
});

test("damaged order cannot drop, duplicate or inject videos and playback metadata is bounded", () => {
  const playlist = normalizePersonalPlaylist({ ...create(), title: "x".repeat(200), shuffled: true, order: [item(4).id, item(4).id, "unknown", item(3).id] })!;
  assert.deepEqual(playlist.order, create().order);
  assert.equal(playlist.shuffled, false);
  assert.equal(playlist.title.length, 160);
  const bounded = normalizePersonalPlaylist({ ...create(), items: Array.from({ length: 600 }, (_, index) => item(index)) })!;
  assert.equal(bounded.items.length, MAX_PERSONAL_PLAYLIST_ITEMS);
});

test("next and previous obey displayed order and stop at ends unless whole-playlist repeat is enabled", () => {
  const playlist = create();
  assert.equal(adjacentPlaylistVideo(playlist, item(4).id, 1), item(2).id);
  assert.equal(adjacentPlaylistVideo(playlist, item(2).id, -1), item(4).id);
  assert.equal(adjacentPlaylistVideo(playlist, item(3).id, 1), null);
  assert.equal(adjacentPlaylistVideo(playlist, item(4).id, -1), null);
  assert.equal(adjacentPlaylistVideo(playlist, "unknown", 1), null);
  assert.equal(adjacentPlaylistVideo({ ...playlist, repeat: true }, item(3).id, 1), item(4).id);
  assert.equal(adjacentPlaylistVideo({ ...playlist, repeat: true }, item(4).id, -1), item(3).id);
  const single = normalizePersonalPlaylist({ ...playlist, items: [item(1)], repeat: true })!;
  assert.equal(adjacentPlaylistVideo(single, item(1).id, 1), item(1).id);
});

test("shuffle keeps played videos and current position, exhausts every remaining video once, and restores original order", () => {
  const original = create();
  const shuffled = togglePlaylistShuffle(original, item(2).id, () => 0);
  assert.deepEqual(shuffled.order.slice(0, 2), original.order.slice(0, 2));
  assert.notDeepEqual(shuffled.order, original.order);
  assert.equal(playlistIndex(shuffled, item(2).id), 1);
  assert.deepEqual([...shuffled.order].sort(), [...original.order].sort());
  assert.equal(new Set(shuffled.order).size, original.items.length);
  assert.deepEqual(togglePlaylistShuffle(shuffled, item(2).id).order, original.order);
  assert.equal(togglePlaylistShuffle(original, "missing"), original);
  assert.equal(new Set(togglePlaylistShuffle(original, item(4).id, () => NaN).order).size, 4);
});

test("compact context links select any row, reset subsequent video time, and leave shared links independent", () => {
  const playlist = create();
  const href = new URL(personalPlaylistHref(playlist, item(1).id), "https://example.com");
  assert.equal(href.pathname, `/watch/${item(1).id}`);
  assert.equal(href.searchParams.get("index"), "2");
  assert.equal(href.searchParams.get("t"), "0");
  assert.ok(!href.href.includes(encodeURIComponent(playlist.title)));
  assert.equal(new URL(personalPlaylistHref(playlist, item(2).id, false), href).searchParams.has("t"), false);
  const shared = new URL(standaloneVideoUrl(`${href}&loop=1&t=35`));
  assert.equal(shared.searchParams.has("playlist"), false);
  assert.equal(shared.searchParams.has("index"), false);
  assert.equal(shared.searchParams.get("loop"), "1");
});

test("an ended/navigation claim is synchronous, ignores duplicate events, and can be reset after failure", () => {
  const guard = createPlaylistAdvanceGuard();
  assert.equal(guard.claim(), true);
  assert.equal(guard.claim(), false);
  assert.equal(guard.claim(), false);
  guard.reset();
  assert.equal(guard.claim(), true);
});

test("collection snapshots belong to their signed-in owner while Watch Later stays anonymous", () => {
  const playlist = create();
  const privatePlaylist = normalizePersonalPlaylist({ ...playlist, ownerId: "owner-1" })!;
  assert.equal(canAccessPersonalPlaylist(privatePlaylist, "owner-1"), true);
  assert.equal(canAccessPersonalPlaylist(privatePlaylist, "other-user"), false);
  assert.equal(canAccessPersonalPlaylist(privatePlaylist), false);
  assert.equal(canAccessPersonalPlaylist(playlist), true);
});

test("session snapshots survive a storage round trip, retain recent queues, and recover from blocked storage", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const stored = new Map<string, string>();
  let blocked = false;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: {
    getItem: (key: string) => { if (blocked) throw new Error("blocked"); return stored.get(key) ?? null; },
    setItem: (key: string, value: string) => { if (blocked) throw new Error("blocked"); stored.set(key, value); },
  } } });
  try {
    const playlist = create();
    assert.equal(savePersonalPlaylist(playlist), true);
    assert.deepEqual(readPersonalPlaylist(playlist.id)?.order, playlist.order);
    blocked = true;
    const shuffled = togglePlaylistShuffle(playlist, playlist.order[0], () => 0);
    assert.equal(savePersonalPlaylist(shuffled), false);
    assert.equal(hasUnpersistedPlaylist(), true);
    assert.deepEqual(readPersonalPlaylist(playlist.id)?.order, shuffled.order);
    blocked = false;
    assert.equal(savePersonalPlaylist(shuffled), true);
    assert.equal(hasUnpersistedPlaylist(), false);
    for (let i = 0; i < 8; i++) savePersonalPlaylist({ ...playlist, id: `22222222-2222-4222-8222-${String(i).padStart(12, "0")}` });
    assert.equal(JSON.parse(stored.get(PLAYLIST_STORAGE_KEY)!).length, 5);
    stored.set(PLAYLIST_STORAGE_KEY, "invalid-json");
    assert.equal(readPersonalPlaylist("does-not-exist"), null);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
