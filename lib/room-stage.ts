export type StageParticipant = {
  clientId: string;
  userId?: string | null;
  name: string;
  image?: string | null;
  isHost?: boolean;
  catId: string;
  catGifUrl: string;
  catName: string;
  joinedAt: number;
};

export type StageRequest = {
  clientId: string;
  userId?: string | null;
  name: string;
  image?: string | null;
  isHost?: boolean;
  catId: string;
  catGifUrl: string;
  catName: string;
  requestedAt: number;
};

export type RoomStageState = {
  enabled: boolean;
  maxParticipants: number;
  participants: StageParticipant[];
  requests: StageRequest[];
  lastUpdatedAt: number;
};

const DEFAULT_MAX_PARTICIPANTS = 6;

declare global {
  // eslint-disable-next-line no-var
  var __ROOM_STAGE_STORE__: Map<string, RoomStageState> | undefined;
}

function getStore(): Map<string, RoomStageState> {
  if (!globalThis.__ROOM_STAGE_STORE__) {
    globalThis.__ROOM_STAGE_STORE__ = new Map<string, RoomStageState>();
  }
  return globalThis.__ROOM_STAGE_STORE__;
}

export function getStageState(code: string): RoomStageState {
  const store = getStore();
  const normalized = code.toUpperCase();
  let state = store.get(normalized);
  if (!state) {
    state = {
      enabled: false,
      maxParticipants: DEFAULT_MAX_PARTICIPANTS,
      participants: [],
      requests: [],
      lastUpdatedAt: Date.now(),
    };
    store.set(normalized, state);
  }
  return state;
}

export function toggleStage(code: string, enabled: boolean): RoomStageState {
  const state = getStageState(code);
  state.enabled = enabled;
  state.lastUpdatedAt = Date.now();
  return state;
}

export function setStageLimit(code: string, maxParticipants: number): RoomStageState {
  const state = getStageState(code);
  const clamped = Math.max(1, Math.min(12, Math.floor(maxParticipants)));
  state.maxParticipants = clamped;
  // If participants exceed new limit, slice
  if (state.participants.length > clamped) {
    state.participants = state.participants.slice(0, clamped);
  }
  state.lastUpdatedAt = Date.now();
  return state;
}

export function requestStageJoin(
  code: string,
  req: Omit<StageRequest, "requestedAt">,
  isHost = false,
): RoomStageState {
  const state = getStageState(code);
  if (!state.enabled) return state;

  // If already on stage, update their cat selection
  const existingIdx = state.participants.findIndex((p) => p.clientId === req.clientId);
  if (existingIdx !== -1) {
    state.participants[existingIdx] = {
      ...state.participants[existingIdx],
      catId: req.catId,
      catGifUrl: req.catGifUrl,
      catName: req.catName,
      name: req.name,
      image: req.image,
    };
    state.lastUpdatedAt = Date.now();
    return state;
  }

  // If host wants to join stage, they bypass request and join immediately if room has space
  if (isHost) {
    if (state.participants.length < state.maxParticipants) {
      state.participants.push({
        clientId: req.clientId,
        userId: req.userId,
        name: req.name,
        image: req.image,
        isHost: true,
        catId: req.catId,
        catGifUrl: req.catGifUrl,
        catName: req.catName,
        joinedAt: Date.now(),
      });
      // Remove any pending request
      state.requests = state.requests.filter((r) => r.clientId !== req.clientId);
      state.lastUpdatedAt = Date.now();
      return state;
    }
  }

  // Otherwise add or update in pending requests
  const reqIdx = state.requests.findIndex((r) => r.clientId === req.clientId);
  if (reqIdx !== -1) {
    state.requests[reqIdx] = {
      ...state.requests[reqIdx],
      catId: req.catId,
      catGifUrl: req.catGifUrl,
      catName: req.catName,
      name: req.name,
      image: req.image,
      requestedAt: Date.now(),
    };
  } else {
    state.requests.push({
      clientId: req.clientId,
      userId: req.userId,
      name: req.name,
      image: req.image,
      isHost,
      catId: req.catId,
      catGifUrl: req.catGifUrl,
      catName: req.catName,
      requestedAt: Date.now(),
    });
  }
  state.lastUpdatedAt = Date.now();
  return state;
}

export function cancelStageRequest(code: string, clientId: string): RoomStageState {
  const state = getStageState(code);
  state.requests = state.requests.filter((r) => r.clientId !== clientId);
  state.lastUpdatedAt = Date.now();
  return state;
}

export function approveStageRequest(code: string, clientId: string): RoomStageState {
  const state = getStageState(code);
  const reqIndex = state.requests.findIndex((r) => r.clientId === clientId);
  if (reqIndex === -1) return state;

  const req = state.requests[reqIndex];
  state.requests.splice(reqIndex, 1);

  if (state.participants.length < state.maxParticipants) {
    // Remove if already on stage
    state.participants = state.participants.filter((p) => p.clientId !== clientId);
    state.participants.push({
      clientId: req.clientId,
      userId: req.userId,
      name: req.name,
      image: req.image,
      isHost: req.isHost,
      catId: req.catId,
      catGifUrl: req.catGifUrl,
      catName: req.catName,
      joinedAt: Date.now(),
    });
  }
  state.lastUpdatedAt = Date.now();
  return state;
}

export function rejectStageRequest(code: string, clientId: string): RoomStageState {
  const state = getStageState(code);
  state.requests = state.requests.filter((r) => r.clientId !== clientId);
  state.lastUpdatedAt = Date.now();
  return state;
}

export function approveAllStageRequests(code: string): RoomStageState {
  const state = getStageState(code);
  while (state.requests.length > 0 && state.participants.length < state.maxParticipants) {
    const req = state.requests.shift()!;
    state.participants.push({
      clientId: req.clientId,
      userId: req.userId,
      name: req.name,
      image: req.image,
      isHost: req.isHost,
      catId: req.catId,
      catGifUrl: req.catGifUrl,
      catName: req.catName,
      joinedAt: Date.now(),
    });
  }
  state.lastUpdatedAt = Date.now();
  return state;
}

export function leaveStage(code: string, clientId: string): RoomStageState {
  const state = getStageState(code);
  state.participants = state.participants.filter((p) => p.clientId !== clientId);
  state.requests = state.requests.filter((r) => r.clientId !== clientId);
  state.lastUpdatedAt = Date.now();
  return state;
}

export function clearStage(code: string): RoomStageState {
  const state = getStageState(code);
  state.participants = [];
  state.requests = [];
  state.lastUpdatedAt = Date.now();
  return state;
}
