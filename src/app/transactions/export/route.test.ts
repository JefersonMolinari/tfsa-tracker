import { afterEach, describe, expect, it, vi } from "vitest";

const getTransactionsCsvExportData = vi.fn();

vi.mock("../../../lib/tfsa/data", () => ({
  getTransactionsCsvExportData,
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GET /transactions/export", () => {
  it("returns a downloadable CSV with stable headers", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T18:45:00.000Z"));

    getTransactionsCsvExportData.mockResolvedValue([
      {
        id: "txn_1",
        accountId: "acct_1",
        type: "CONTRIBUTION",
        amountCents: 200000,
        occurredAt: new Date("2026-01-15T00:00:00.000Z"),
        notes: "Seed contribution",
        createdAt: new Date("2026-01-15T00:15:00.000Z"),
        updatedAt: new Date("2026-01-15T00:15:00.000Z"),
        account: {
          name: "Main TFSA",
          institution: "Bank",
        },
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="tfsa-transactions-2026-05-09.csv"',
    );

    await expect(response.text()).resolves.toContain(
      "transaction_id,account_id,account_name,institution,transaction_type,amount_cents,amount_cad,occurred_at,notes,created_at,updated_at",
    );
  });
});
