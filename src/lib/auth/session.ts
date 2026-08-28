import { getAuthSecrets } from "@/lib/auth/runtime";

export type AuthSecrets = { password: string; sessionSecret: string };

export const SESSION_COOKIE_NAME = "tfsa_session";
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;

const textEncoder = new TextEncoder();

type SessionPayload = {
  v: 1;
  exp: number;
};

function copyToArrayBuffer(value: Uint8Array) {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function encodeBase64Url(value: Uint8Array) {
  let binary = "";

  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    return null;
  }

  const padding = "=".repeat((4 - (value.length % 4)) % 4);

  try {
    const binary = atob(`${value.replaceAll("-", "+").replaceAll("_", "/")}${padding}`);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: Uint8Array, sessionSecret: string) {
  const key = await importHmacKey(sessionSecret);
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, copyToArrayBuffer(payload)),
  );
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    record.v === 1 &&
    Number.isInteger(record.exp)
  );
}

export async function verifyPassword(input: string, secrets: AuthSecrets) {
  const [inputDigest, passwordDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", textEncoder.encode(input)),
    crypto.subtle.digest("SHA-256", textEncoder.encode(secrets.password)),
  ]);
  const inputBytes = new Uint8Array(inputDigest);
  const passwordBytes = new Uint8Array(passwordDigest);
  let difference = 0;

  for (let index = 0; index < inputBytes.length; index += 1) {
    difference |= inputBytes[index] ^ passwordBytes[index];
  }

  return difference === 0;
}

export async function createSessionCookie(
  secrets: AuthSecrets,
  now = new Date(),
) {
  const payload: SessionPayload = {
    v: 1,
    exp: Math.floor(now.getTime() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = textEncoder.encode(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload, secrets.sessionSecret);

  return `${encodeBase64Url(encodedPayload)}.${encodeBase64Url(signature)}`;
}

export async function readSession(
  value: string | undefined,
  secrets: AuthSecrets,
  now = new Date(),
): Promise<{ exp: number } | null> {
  const parts = value?.split(".");

  if (parts?.length !== 2) {
    return null;
  }

  const payloadBytes = decodeBase64Url(parts[0]);
  const signatureBytes = decodeBase64Url(parts[1]);

  if (!payloadBytes || !signatureBytes) {
    return null;
  }

  const key = await importHmacKey(secrets.sessionSecret);
  const validSignature = await crypto.subtle.verify(
    "HMAC",
    key,
    copyToArrayBuffer(signatureBytes),
    copyToArrayBuffer(payloadBytes),
  );

  if (!validSignature) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(new TextDecoder().decode(payloadBytes));

    if (
      !isSessionPayload(payload) ||
      payload.exp <= Math.floor(now.getTime() / 1000)
    ) {
      return null;
    }

    return { exp: payload.exp };
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const { cookies } = await import("next/headers");
  const cookieValue = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return null;
  }

  return readSession(cookieValue, getAuthSecrets());
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  return session;
}
