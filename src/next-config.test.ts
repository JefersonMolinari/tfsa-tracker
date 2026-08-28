import { describe, expect, it } from "vitest";

import {
  loadNextConfig,
  resolveNextConfig,
} from "vinext/internal/config/next-config";

describe("Server Action upload limit", () => {
  it("allows multipart overhead while the backup codec enforces its 5 MiB file cap", async () => {
    const config = await loadNextConfig(process.cwd());
    const resolved = await resolveNextConfig(config, process.cwd());

    expect(resolved.serverActionsBodySizeLimit).toBe(6 * 1024 * 1024);
    expect(resolved.serverActionsBodySizeLimitLabel).toBe("6mb");
  });
});
