// Shared logger surface used by both server and client. The actual file-writing
// lives in lib/logger.ts (server only); the client uses console + /api/client-log.

export type Level = "debug" | "info" | "warn" | "error";

export const log = {
  debug(scope: string, msg: string, data?: unknown) {
    // eslint-disable-next-line no-console
    if (typeof console !== "undefined") console.debug(`[${scope}]`, msg, data ?? "");
  },
  info(scope: string, msg: string, data?: unknown) {
    // eslint-disable-next-line no-console
    if (typeof console !== "undefined") console.info(`[${scope}]`, msg, data ?? "");
  },
  warn(scope: string, msg: string, data?: unknown) {
    // eslint-disable-next-line no-console
    if (typeof console !== "undefined") console.warn(`[${scope}]`, msg, data ?? "");
  },
  error(scope: string, msg: string, data?: unknown) {
    // eslint-disable-next-line no-console
    if (typeof console !== "undefined") console.error(`[${scope}]`, msg, data ?? "");
  },
};
