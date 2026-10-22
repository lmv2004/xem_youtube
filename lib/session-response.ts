import type { Session } from "next-auth";

/** A transport failure is unknown, never a confirmed signed-out session. */
export async function readConfirmedSession(
  response: Response,
): Promise<Session | null> {
  if (!response.ok) throw new Error("Session temporarily unavailable");
  const data: unknown = await response.json();
  if (Array.isArray(data)) throw new Error("Invalid session response");
  if (
    data === null ||
    (typeof data === "object" && data && Object.keys(data).length === 0)
  )
    return null;
  if (
    typeof data !== "object" ||
    !data ||
    !("user" in data) ||
    !data.user ||
    typeof data.user !== "object" ||
    Array.isArray(data.user) ||
    !("expires" in data) ||
    typeof data.expires !== "string" ||
    !Number.isFinite(Date.parse(data.expires))
  ) {
    throw new Error("Invalid session response");
  }
  return data as Session;
}
