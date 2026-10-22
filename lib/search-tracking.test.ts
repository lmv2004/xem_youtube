import assert from "node:assert/strict";
import test from "node:test";
import {
  createPopularSearchesStore,
  createSearchRecorder,
} from "./search-tracking";

const UPDATED_AT = "2026-10-22T10:00:00.000Z";
const ranking = (term = "nhạc lofi", count = 4) => ({
  items: [{ term, count }],
  windowDays: 7,
  updatedAt: UPDATED_AT,
});
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });

test("concurrent search surfaces share a locale request and its freshness", async () => {
  let now = 0;
  const calls: string[] = [];
  let resolveResponse!: (value: Response) => void;
  const firstResponse = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  const store = createPopularSearchesStore({
    now: () => now,
    fetcher: async (input) => {
      calls.push(String(input));
      return calls.length === 1 ? firstResponse : response(ranking());
    },
  });
  let notifications = 0;
  const unsubscribe = store.subscribe("vi", () => {
    notifications += 1;
  });
  const first = store.refresh("vi");
  const second = store.refresh("vi");
  assert.equal(first, second);
  assert.equal(store.getSnapshot("vi").loading, true);
  await Promise.resolve();
  assert.deepEqual(calls, ["/api/searches?locale=vi"]);
  resolveResponse(response(ranking()));
  await first;
  assert.deepEqual(store.getSnapshot("vi"), {
    items: [{ term: "nhạc lofi", count: 4 }],
    loading: false,
    error: false,
    updatedAt: UPDATED_AT,
  });
  assert.equal(notifications, 2);
  unsubscribe();
  await store.refresh("vi");
  assert.equal(calls.length, 1);
  await store.refresh("en");
  assert.equal(calls.length, 2);
  now = 60_000;
  await store.refresh("vi");
  assert.equal(calls.length, 3);
  assert.equal(notifications, 2);
});

test("bad JSON, invalid payloads and failed responses retain the last ranking and allow retry", async () => {
  const results: Response[] = [
    response(ranking()),
    new Response("not json"),
    response({ ...ranking(), items: [{ term: "music", count: "4" }] }),
    response({}, 503),
    response(ranking("piano music", 8)),
  ];
  let requests = 0;
  const store = createPopularSearchesStore({
    fetcher: async () => {
      requests += 1;
      return results.shift()!;
    },
  });
  await store.refresh("en");
  for (let i = 0; i < 3; i += 1) {
    await store.refresh("en", true);
    assert.deepEqual(store.getSnapshot("en"), {
      items: [{ term: "nhạc lofi", count: 4 }],
      updatedAt: UPDATED_AT,
      loading: false,
      error: true,
    });
    await store.refresh("en");
    assert.equal(requests, i + 2);
  }
  await store.refresh("en", true);
  assert.equal(store.getSnapshot("en").error, false);
  assert.deepEqual(store.getSnapshot("en").items, [
    { term: "piano music", count: 8 },
  ]);
});

test("timeouts and synchronous network failures release the shared request for retry", async () => {
  let requests = 0;
  const store = createPopularSearchesStore({
    timeoutMs: 10,
    fetcher: (_input, init) => {
      requests += 1;
      if (requests === 1) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("Network timeout"));
          });
        });
      }
      if (requests === 2) throw new Error("Network blocked");
      return Promise.resolve(response(ranking()));
    },
  });
  await store.refresh("vi");
  assert.equal(store.getSnapshot("vi").error, true);
  assert.equal(store.getSnapshot("vi").loading, false);
  await store.refresh("vi", true);
  assert.equal(store.getSnapshot("vi").error, true);
  await store.refresh("vi", true);
  assert.equal(requests, 3);
  assert.equal(store.getSnapshot("vi").error, false);
});

test("explicit keyword recording is best effort, normalized and uniquely identified", async () => {
  const requests: RequestInit[] = [];
  const recorder = createSearchRecorder({
    fetcher: (_input, init) => {
      requests.push(init!);
      return Promise.reject(new Error("Offline"));
    },
  });
  for (const value of [
    "a",
    "   ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "youtu.be/dQw4w9WgXcQ",
    "dQw4w9WgXcQ",
    "www.example.com",
    "example.com/path",
    "javascript:alert(1)",
    "hello\nthere",
  ]) {
    assert.equal(recorder.recordSearch(value, "en"), undefined);
  }
  assert.equal(requests.length, 0);
  assert.equal(recorder.recordSearch("  nhạc   lofi  ", "vi"), undefined);
  recorder.recordSearch("తెలుగు పాటలు", "te");
  assert.equal(requests.length, 0);
  await recorder.flush();
  assert.equal(requests.length, 2);
  const first = JSON.parse(String(requests[0].body));
  const second = JSON.parse(String(requests[1].body));
  assert.equal(first.keyword, "nhạc lofi");
  assert.equal(first.locale, "vi");
  assert.equal(second.keyword, "తెలుగు పాటలు");
  assert.match(first.eventId, /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i);
  assert.notEqual(first.eventId, second.eventId);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].keepalive, true);
  assert.equal(requests[0].credentials, "same-origin");
});

test("rapid searches wait for the first cookie response without delaying the caller", async () => {
  let finishFirst!: (response: Response) => void;
  let firstStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    firstStarted = resolve;
  });
  const first = new Promise<Response>((resolve) => {
    finishFirst = resolve;
  });
  const calls: string[] = [];
  const recorder = createSearchRecorder({
    fetcher: async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)).keyword);
      if (calls.length === 1) {
        firstStarted();
        return first;
      }
      return new Response(null, { status: 204 });
    },
  });
  assert.equal(recorder.recordSearch("first music", "en"), undefined);
  assert.equal(recorder.recordSearch("second music", "en"), undefined);
  await started;
  assert.deepEqual(calls, ["first music"]);
  finishFirst(new Response(null, { status: 204 }));
  await recorder.flush();
  assert.deepEqual(calls, ["first music", "second music"]);
});

test("a shared browser lock coordinates first-cookie writes from separate tabs", async () => {
  let lockTail = Promise.resolve();
  const withLock = (write: () => Promise<void>) => {
    const result = lockTail.then(write);
    lockTail = result.catch(() => {});
    return result;
  };
  let finishFirst!: (response: Response) => void;
  let firstStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    firstStarted = resolve;
  });
  const first = new Promise<Response>((resolve) => {
    finishFirst = resolve;
  });
  let cookieStored = false;
  const cookieAtRequest: boolean[] = [];
  const fetcher: typeof fetch = async () => {
    cookieAtRequest.push(cookieStored);
    if (cookieAtRequest.length === 1) {
      firstStarted();
      const result = await first;
      cookieStored = true;
      return result;
    }
    return new Response(null, { status: 204 });
  };
  const tabOne = createSearchRecorder({ fetcher, withLock });
  const tabTwo = createSearchRecorder({ fetcher, withLock });
  tabOne.recordSearch("shared topic", "en");
  tabTwo.recordSearch("shared topic", "en");
  await started;
  assert.deepEqual(cookieAtRequest, [false]);
  finishFirst(new Response(null, { status: 204 }));
  await Promise.all([tabOne.flush(), tabTwo.flush()]);
  assert.deepEqual(cookieAtRequest, [false, true]);
});

test("bounded writes release their queue after timeouts, synchronous failures and error responses", async () => {
  let calls = 0;
  let signal: AbortSignal | null | undefined;
  const recorder = createSearchRecorder({
    timeoutMs: 10,
    fetcher: (_input, init) => {
      calls += 1;
      if (calls === 1) {
        signal = init?.signal;
        // Even an implementation that ignores abort cannot hold the queue.
        return new Promise(() => {});
      }
      if (calls === 2) throw new Error("Network blocked");
      return Promise.resolve(
        new Response(null, { status: calls === 3 ? 503 : 204 }),
      );
    },
  });
  for (let index = 0; index < 25; index += 1) {
    recorder.recordSearch(`topic number ${index}`, "en");
  }
  await recorder.flush();
  assert.equal(signal?.aborted, true);
  assert.equal(calls, 20);
  recorder.recordSearch("queue recovered", "en");
  await recorder.flush();
  assert.equal(calls, 21);
});
