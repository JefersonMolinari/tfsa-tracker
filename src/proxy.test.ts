import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

import { getAuthSecrets } from "@/lib/auth/runtime";
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/session";
import { config, proxy } from "./proxy";

const password = crypto.randomUUID();
const sessionSecret = crypto.randomUUID();

beforeAll(() => {
  process.env.TFSA_PASSWORD = password;
  process.env.TFSA_SESSION_SECRET = sessionSecret;
});

type RequestOptions = {
  cookieValue?: string;
  method?: string;
  navigation?: boolean;
};

function request(
  path: string,
  { cookieValue, method = "GET", navigation = false }: RequestOptions = {},
) {
  const headers = new Headers();

  if (cookieValue) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${cookieValue}`);
  }

  if (navigation) {
    headers.set("sec-fetch-dest", "document");
    headers.set("sec-fetch-mode", "navigate");
  }

  return new NextRequest(`https://tfsa.example${path}`, { headers, method });
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
    "redirects the protected document navigation %s without a session",
    async (path) => {
      const response = await proxy(request(path, { navigation: true }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://tfsa.example/login");
    },
  );

  it("allows a public SVG asset without a session", async () => {
    const response = await proxy(request("/file.svg", { navigation: true }));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows a non-navigation GET to reach its direct guard", async () => {
    const response = await proxy(request("/transactions"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows a POST to reach its direct guard even with navigation headers", async () => {
    const response = await proxy(
      request("/transactions", { method: "POST", navigation: true }),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows a protected document navigation with a valid signed session", async () => {
    const cookieValue = await createSessionCookie(getAuthSecrets(), new Date());
    const response = await proxy(
      request("/transactions", { cookieValue, navigation: true }),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a protected document navigation with a tampered session", async () => {
    const cookieValue = await createSessionCookie(getAuthSecrets(), new Date());
    const [payload, signature] = cookieValue.split(".");
    const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    const response = await proxy(
      request("/transactions", {
        cookieValue: `${payload}.${tamperedSignature}`,
        navigation: true,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://tfsa.example/login");
  });

  it("redirects a protected document navigation with an expired session", async () => {
    const issuedAt = new Date(
      Date.now() - (SESSION_DURATION_SECONDS + 1) * 1000,
    );
    const cookieValue = await createSessionCookie(getAuthSecrets(), issuedAt);
    const response = await proxy(
      request("/transactions", { cookieValue, navigation: true }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://tfsa.example/login");
  });

  it("uses a navigation-only matcher that excludes public assets", () => {
    expect(config).toEqual({
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
    });
  });
});
