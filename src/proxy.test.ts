import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

import { createSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { config, proxy } from "./proxy";

const password = "test-password-not-a-secret";
const sessionSecret = "test-session-signing-key-not-a-secret";

beforeAll(() => {
  process.env.TFSA_PASSWORD = password;
  process.env.TFSA_SESSION_SECRET = sessionSecret;
});

function request(path: string, cookieValue?: string) {
  const headers = new Headers();

  if (cookieValue) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${cookieValue}`);
  }

  return new NextRequest(`https://tfsa.example${path}`, { headers });
}

describe("authentication proxy", () => {
  it.each(["/login", "/_next/static/chunk.js", "/favicon.ico"])(
    "allows the public path %s without a session",
    async (path) => {
      const response = await proxy(request(path));

      expect(response.headers.get("location")).toBeNull();
    },
  );

  it.each(["/", "/accounts", "/transactions", "/settings"])(
    "redirects the protected path %s to login without a session",
    async (path) => {
      const response = await proxy(request(path));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://tfsa.example/login");
    },
  );

  it("allows a protected path with a valid signed session", async () => {
    const cookieValue = await createSessionCookie(
      { password, sessionSecret },
      new Date(),
    );
    const response = await proxy(request("/transactions", cookieValue));

    expect(response.headers.get("location")).toBeNull();
  });

  it("uses a static matcher that excludes login and framework assets", () => {
    expect(config).toEqual({
      matcher: ["/((?!login(?:/|$)|_next(?:/|$)|favicon\\.ico$).*)"],
    });
  });
});
