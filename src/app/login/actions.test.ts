import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readSession,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/session";

const cookieValues = new Map<string, string>();
const cookieStore = {
  get: vi.fn((name: string) => {
    const value = cookieValues.get(name);
    return value === undefined ? undefined : { name, value };
  }),
  set: vi.fn((name: string, value: string) => {
    cookieValues.set(name, value);
  }),
  delete: vi.fn((name: string) => {
    cookieValues.delete(name);
  }),
};
const cookies = vi.fn(async () => cookieStore);
const redirect = vi.fn((path: string): never => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock("next/headers", () => ({ cookies }));
vi.mock("next/navigation", () => ({ redirect }));

const secrets = {
  password: crypto.randomUUID(),
  sessionSecret: crypto.randomUUID(),
};

function replaceFirstCharacter(value: string) {
  return `${value[0] === "A" ? "B" : "A"}${value.slice(1)}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieValues.clear();
  process.env.TFSA_PASSWORD = secrets.password;
  process.env.TFSA_SESSION_SECRET = secrets.sessionSecret;
});

describe("login", () => {
  it("sets a secure eight-hour signed session and redirects home", async () => {
    const { login } = await import("./actions");
    const formData = new FormData();
    formData.set("password", secrets.password);

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT:/");

    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.any(String),
      {
        httpOnly: true,
        maxAge: SESSION_DURATION_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: true,
      },
    );
    await expect(
      readSession(cookieValues.get(SESSION_COOKIE_NAME), secrets),
    ).resolves.toEqual({ exp: expect.any(Number) });
  });

  it("uses one generic redirect and does not set a cookie for invalid credentials", async () => {
    const { login } = await import("./actions");
    const formData = new FormData();
    formData.set("password", replaceFirstCharacter(secrets.password));

    await expect(login(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/login?error=invalid",
    );

    expect(cookieValues.has(SESSION_COOKIE_NAME)).toBe(false);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("clears the session cookie and redirects to login", async () => {
    cookieValues.set(SESSION_COOKIE_NAME, crypto.randomUUID());
    const { logout } = await import("./actions");

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(cookieValues.has(SESSION_COOKIE_NAME)).toBe(false);
  });
});
