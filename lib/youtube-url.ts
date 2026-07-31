// Pure helper for extracting a YouTube video id from arbitrary user input.
// Imported by both the watch page (server) and the URL input form (client).
// Accepts: bare 11-char id, full watch URLs, share links, embed URLs, Shorts.

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Bare id (e.g. "dQw4w9WgXcQ").
  if (ID_PATTERN.test(raw)) return raw;

  // Try to parse as a URL. Help users who paste "youtube.com/..." without scheme.
  const url = parseLooseUrl(raw);
  if (!url) return null;

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
  const path = url.pathname;

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = path.replace(/^\/+/, "").split("/")[0];
    return ID_PATTERN.test(id) ? id : null;
  }

  // youtube.com / youtube-nocookie.com
  if (
    host === "youtube.com" ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube.com") ||
    host.endsWith(".youtube-nocookie.com")
  ) {
    // ?v=<id>
    const v = url.searchParams.get("v");
    if (v && ID_PATTERN.test(v)) return v;

    // /embed/<id> / /shorts/<id> / /v/<id> / /live/<id>
    const match = path.match(/^\/(?:embed|shorts|v|live)\/([^/?#]+)/);
    if (match && ID_PATTERN.test(match[1])) return match[1];
  }

  return null;
}

function parseLooseUrl(raw: string): URL | null {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}
