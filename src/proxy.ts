import { NextResponse, type NextRequest } from "next/server";

import { getAuthSecrets } from "@/lib/auth/runtime";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const publicPathPattern = /^\/(?:login(?:\/|$)|_next(?:\/|$)|favicon\.ico$)/u;
const publicAssetPattern = /\.[^/]+$/u;

function isDocumentNavigation(request: NextRequest) {
  return (
    request.method === "GET" &&
    request.headers.get("sec-fetch-mode") === "navigate" &&
    request.headers.get("sec-fetch-dest") === "document"
  );
}

export async function proxy(request: NextRequest) {
  if (
    publicPathPattern.test(request.nextUrl.pathname) ||
    publicAssetPattern.test(request.nextUrl.pathname) ||
    !isDocumentNavigation(request)
  ) {
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
  matcher: [
    {
      source:
        "/((?!login(?:/|$)|_next(?:/|$)|favicon\\.ico$|.*\\.[^/]+$).*)",
      has: [
        { type: "header", key: "sec-fetch-mode", value: "navigate" },
        { type: "header", key: "sec-fetch-dest", value: "document" },
      ],
    },
  ],
};
