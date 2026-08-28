import { describe, expect, it } from "vitest";

import {
  createSessionCookie,
  readSession,
  verifyPassword,
  type AuthSecrets,
} from "./session";

const secrets: AuthSecrets = {
  password: "test-password-not-a-secret",
  sessionSecret: "test-session-signing-key-not-a-secret",
};

const issuedAt = new Date("2026-08-27T12:00:00.000Z");

function replaceFirstCharacter(value: string) {
  return `${value[0] === "A" ? "B" : "A"}${value.slice(1)}`;
}

describe("password verification", () => {
  it("accepts the configured password", async () => {
    await expect(verifyPassword(secrets.password, secrets)).resolves.toBe(true);
  });

  it("rejects a password with a one-byte difference", async () => {
    await expect(
      verifyPassword("test-password-not-a-secreu", secrets),
    ).resolves.toBe(false);
  });
});

describe("signed sessions", () => {
  it("accepts a signed session before its eight-hour expiry", async () => {
    const cookieValue = await createSessionCookie(secrets, issuedAt);

    await expect(
      readSession(cookieValue, secrets, new Date("2026-08-27T19:59:59.000Z")),
    ).resolves.toEqual({ exp: 1_787_860_800 });
  });

  it("rejects a valid payload paired with another session's signature", async () => {
    const firstCookie = await createSessionCookie(secrets, issuedAt);
    const secondCookie = await createSessionCookie(
      secrets,
      new Date("2026-08-27T13:00:00.000Z"),
    );
    const [, firstSignature] = firstCookie.split(".");
    const [secondPayload] = secondCookie.split(".");

    await expect(
      readSession(
        `${secondPayload}.${firstSignature}`,
        secrets,
        new Date("2026-08-27T13:00:01.000Z"),
      ),
    ).resolves.toBeNull();
  });

  it("rejects a modified signature", async () => {
    const cookieValue = await createSessionCookie(secrets, issuedAt);
    const [payload, signature] = cookieValue.split(".");

    await expect(
      readSession(
        `${payload}.${replaceFirstCharacter(signature)}`,
        secrets,
        new Date("2026-08-27T12:00:01.000Z"),
      ),
    ).resolves.toBeNull();
  });

  it("rejects a session at its expiry", async () => {
    const cookieValue = await createSessionCookie(secrets, issuedAt);

    await expect(
      readSession(cookieValue, secrets, new Date("2026-08-27T20:00:00.000Z")),
    ).resolves.toBeNull();
  });
});
