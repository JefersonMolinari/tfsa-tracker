import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { db, getD1Database } from "./db.worker";

describe("Worker database runtime", () => {
  it("uses the Worker D1 binding through Prisma", async () => {
    expect(getD1Database()).toBe(env.DB);
    await expect(db.annualLimit.findMany()).resolves.toBeInstanceOf(Array);
  });
});
