import { env } from "cloudflare:workers";

import type { AuthSecrets } from "./session";

type AuthWorkerEnvironment = typeof env & {
  TFSA_PASSWORD?: string;
  TFSA_SESSION_SECRET?: string;
};

function readRequiredEnvironmentVariable(
  workerEnvironment: AuthWorkerEnvironment,
  name: "TFSA_PASSWORD" | "TFSA_SESSION_SECRET",
) {
  const value = workerEnvironment[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAuthSecrets(): AuthSecrets {
  const workerEnvironment = env as AuthWorkerEnvironment;

  return {
    password: readRequiredEnvironmentVariable(workerEnvironment, "TFSA_PASSWORD"),
    sessionSecret: readRequiredEnvironmentVariable(
      workerEnvironment,
      "TFSA_SESSION_SECRET",
    ),
  };
}
