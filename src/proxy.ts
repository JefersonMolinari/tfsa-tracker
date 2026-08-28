import { NextResponse, type NextRequest } from "next/server";

import { getAuthSecrets } from "@/lib/auth/runtime";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const publicPathPattern = /^\/(?:login(?:\/|$)|_next(?:\/|$)|favicon\.ico$)/u;

export async function proxy(request: NextRequest) {
  if (publicPathPattern.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = cookieValue
    ? await readSession(cookieValue, getAuthSecrets())
    : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login(?:/|$)|_next(?:/|$)|favicon\\.ico$).*)"],
};
