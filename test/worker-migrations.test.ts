import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("D1 migrations", () => {
  it("applies the TFSA schema and annual-limit seed without user records", async () => {
    const columns = await env.DB.prepare("PRAGMA table_info('Account')").all<{ name: string }>();

    expect(columns.results.map((column) => column.name)).toEqual(
      expect.arrayContaining(["id", "name", "institution", "notes", "createdAt", "updatedAt"]),
    );
    expect(
      await env.DB.prepare("SELECT limitCents FROM AnnualLimit WHERE year = ?").bind(2009).first(),
    ).toMatchObject({ limitCents: 500000 });
    expect(
      await env.DB.prepare("SELECT limitCents FROM AnnualLimit WHERE year = ?").bind(2026).first(),
    ).toMatchObject({ limitCents: 700000 });
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM UserSettings").first<{ count: number }>()).toMatchObject({
      count: 0,
    });
  });
});
