import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";

const workerDatabasePath = fileURLToPath(new URL("./src/lib/db.worker.ts", import.meta.url));
const workerAuthRuntimePath = fileURLToPath(
  new URL("./src/lib/auth/runtime.worker.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@/lib/db": workerDatabasePath,
      "@/lib/auth/runtime": workerAuthRuntimePath,
    },
  },
  plugins: [
    vinext({
      cache: { cdn: cdnAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
    {
      name: "tfsa-worker-runtime",
      config() {
        // vinext prepends its broad `@` alias, so reassert exact runtime aliases afterward.
        return {
          resolve: {
            alias: {
              "@/lib/db": workerDatabasePath,
              "@/lib/auth/runtime": workerAuthRuntimePath,
            },
          },
        };
      },
      configEnvironment(name, config) {
        if (name !== "rsc" && name !== "ssr") {
          return;
        }

        config.resolve ??= {};
        // `@prisma/adapter-d1` must select its workerd export, never its Node fallback.
        config.resolve.conditions = config.resolve.conditions?.filter(
          (condition) => condition !== "node",
        );
      },
    },
  ],
});
