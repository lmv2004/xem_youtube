export function authReturnPath(value: string | null): string {
  if (!value?.startsWith("/")) return "/";
  try {
    const url = new URL(value, "https://app.invalid");
    return url.origin === "https://app.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
}
