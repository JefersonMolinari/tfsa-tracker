import type { AuthSecrets } from "./session";

function readRequiredEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAuthSecrets(): AuthSecrets {
  return {
    password: readRequiredEnvironmentVariable("TFSA_PASSWORD"),
    sessionSecret: readRequiredEnvironmentVariable("TFSA_SESSION_SECRET"),
  };
}
