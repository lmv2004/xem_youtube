// Lightweight logger.
// - Local dev: writes one JSON line per event to logs/YYYY-MM-DD.log (UTC).
// - Vercel/Serverless: no filesystem, so we fall back to console.* which
//   Vercel captures into function logs.
// Never throws — must not break the app.

import { promises as fs } from "node:fs";
import path from "node:path";

const ON_VERCEL = process.env.VERCEL === "1";
const LOG_DIR = path.resolve(process.cwd(), "logs");

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const envLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
const MIN_LEVEL = LEVEL_RANK[envLevel] ?? LEVEL_RANK.info;

function shouldLog(level: Level): boolean {
  return LEVEL_RANK[level] >= MIN_LEVEL;
}

function dayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function writeFile(level: Level, scope: string, message: string, data?: unknown): Promise<void> {
  if (!shouldLog(level)) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(data && typeof data === "object" ? { data } : {}),
  });
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(path.join(LOG_DIR, `${dayStamp()}.log`), line + "\n", "utf8");
  } catch {
    /* ignore */
  }
}

function writeConsole(level: Level, scope: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;
  const payload = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(data && typeof data === "object" ? { data } : {}),
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else if (level === "debug") console.debug(payload);
  else console.info(payload);
}

async function write(level: Level, scope: string, message: string, data?: unknown): Promise<void> {
  if (ON_VERCEL) writeConsole(level, scope, message, data);
  else await writeFile(level, scope, message, data);
}

export const log = {
  debug: (scope: string, msg: string, data?: unknown) => void write("debug", scope, msg, data),
  info: (scope: string, msg: string, data?: unknown) => void write("info", scope, msg, data),
  warn: (scope: string, msg: string, data?: unknown) => void write("warn", scope, msg, data),
  error: (scope: string, msg: string, data?: unknown) => void write("error", scope, msg, data),
};

export type Logger = typeof log;
