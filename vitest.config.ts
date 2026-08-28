import path from "node:path";

import { configDefaults, defineConfig } from "vitest/config";

const localAuthRuntimePath = path.resolve(
  import.meta.dirname,
  "src/lib/auth/runtime.local.ts",
);

export default defineConfig({
  resolve: {
    alias: {
      "@/lib/auth/runtime": localAuthRuntimePath,
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "src/**/*.worker.test.{ts,tsx}"],
  },
});
