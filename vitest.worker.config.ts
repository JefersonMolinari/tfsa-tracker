import { fileURLToPath } from "node:url";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/lib/tfsa/backupData": fileURLToPath(
        new URL("./src/lib/tfsa/backupData.worker.ts", import.meta.url),
      ),
      "@/lib/tfsa/backupPersistence": fileURLToPath(
        new URL("./src/lib/tfsa/backupPersistence.worker.ts", import.meta.url),
      ),
      "@/lib/tfsa/importPersistence": fileURLToPath(
        new URL("./src/lib/tfsa/importPersistence.worker.ts", import.meta.url),
      ),
      "@/lib/auth/runtime": fileURLToPath(
        new URL("./src/lib/auth/runtime.worker.ts", import.meta.url),
      ),
      "@/lib/db": fileURLToPath(new URL("./src/lib/db.worker.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    cloudflareTest(async () => ({
      main: "./test/worker-entry.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TFSA_PASSWORD: crypto.randomUUID(),
          TFSA_SESSION_SECRET: crypto.randomUUID(),
          TEST_MIGRATIONS: await readD1Migrations("./prisma/d1-migrations"),
        },
      },
    })),
  ],
  test: {
    include: [
      "test/worker-migrations.test.ts",
      "src/**/*.worker.test.{ts,tsx}",
      "src/lib/auth/session.test.ts",
      "src/proxy.test.ts",
    ],
    setupFiles: ["./test/worker.setup.ts"],
  },
});
