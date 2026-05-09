import path from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = `file:${path.resolve("prisma/dev.db")}`;
const result = spawnSync(
  "npx",
  ["prisma", "db", "push", "--url", databaseUrl],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
