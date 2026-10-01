/** Build from the video ID so saved URLs and their query strings cannot corrupt playback. */
export function youtubeEmbedUrl(id: string, loop = false): string {
  const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(id)}`);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  if (loop) {
    url.searchParams.set("loop", "1");
    url.searchParams.set("playlist", id);
  }
  return url.toString();
}
