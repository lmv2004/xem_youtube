import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((_req) => {
  // no-op pass-through
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|history|favorites|account).*)"],
};
