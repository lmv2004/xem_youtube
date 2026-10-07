import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./locale";
import { translator } from "./i18n";

export async function getLocale() {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ]);
  return resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    requestHeaders.get("accept-language"),
    requestHeaders.get("x-vercel-ip-country"),
  );
}
export async function getTranslator() {
  return translator(await getLocale());
}
