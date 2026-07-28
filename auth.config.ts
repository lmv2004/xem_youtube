import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma here). The middleware uses this so the session
// cookie stays fresh; we deliberately do NOT set `pages.signIn` here because
// the Auth.js wrapper would auto-redirect when the edge-level `auth.user` is
// null (which can happen even when the user IS logged in, e.g. cookie domain
// mismatch). The single source of truth for auth gating is the server-side
// `auth()` call inside each protected page, which runs in the Node runtime
// with the full Prisma adapter.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized() {
      return true;
    },
  },
};
