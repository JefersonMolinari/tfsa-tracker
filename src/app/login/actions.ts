"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthSecrets } from "@/lib/auth/runtime";
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  verifyPassword,
} from "@/lib/auth/session";

export async function login(formData: FormData) {
  const secrets = getAuthSecrets();
  const submittedPassword = formData.get("password");
  const password = typeof submittedPassword === "string" ? submittedPassword : "";
  const passwordIsValid = await verifyPassword(password, secrets);

  if (!passwordIsValid) {
    redirect("/login?error=invalid");
  }

  const cookieValue = await createSessionCookie(secrets);
  (await cookies()).set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: true,
  });

  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
