/** Join by video ID: search may contain entries without a videoId. */
export function matchVideoSnippet<T>(
  id: string,
  searchItems: Array<{ id?: { videoId?: string }; snippet?: T }>,
  detail?: { snippet?: T },
): T | undefined {
  return (
    detail?.snippet ??
    searchItems.find((item) => item.id?.videoId === id)?.snippet
  );
}
