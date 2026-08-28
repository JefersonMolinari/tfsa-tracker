import path from "node:path";

import { configDefaults, defineConfig } from "vitest/config";

const localAuthRuntimePath = path.resolve(
  import.meta.dirname,
  "src/lib/auth/runtime.local.ts",
);
const localImportPersistencePath = path.resolve(
  import.meta.dirname,
  "src/lib/tfsa/importPersistence.local.ts",
);

export default defineConfig({
  resolve: {
    alias: {
      "@/lib/tfsa/importPersistence": localImportPersistencePath,
      "@/lib/auth/runtime": localAuthRuntimePath,
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "src/**/*.worker.test.{ts,tsx}"],
  },
});
