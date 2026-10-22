/** Browser writes must originate from this deployment, including Vercel previews. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site")
    return false;
  try {
    const requestUrl = new URL(request.url);
    if (!/^https?:$/.test(requestUrl.protocol)) return false;
    // NextRequest can normalize 127.0.0.1 into localhost. The original Host
    // preserves the browser's actual origin, including its exact port.
    const host = request.headers.get("host") ?? requestUrl.host;
    if (!host || /[\s/@\\?#,%]/u.test(host)) return false;
    const expected = new URL(`${requestUrl.protocol}//${host}`);
    if (
      expected.username ||
      expected.password ||
      expected.pathname !== "/" ||
      expected.search ||
      expected.hash
    )
      return false;
    const supplied = new URL(origin);
    if (
      supplied.username ||
      supplied.password ||
      supplied.pathname !== "/" ||
      supplied.search ||
      supplied.hash
    )
      return false;
    return supplied.origin === expected.origin;
  } catch {
    return false;
  }
}
