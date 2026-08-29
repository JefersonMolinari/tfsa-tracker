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
const localBackupPersistencePath = path.resolve(
  import.meta.dirname,
  "src/lib/tfsa/backupPersistence.local.ts",
);
const localBackupDataPath = path.resolve(
  import.meta.dirname,
  "src/lib/tfsa/backupData.local.ts",
);

export default defineConfig({
  resolve: {
    alias: {
      "@/lib/tfsa/backupData": localBackupDataPath,
      "@/lib/tfsa/backupPersistence": localBackupPersistencePath,
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
