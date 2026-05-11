import { describe, expect, it } from "vitest";

import { buildTransactionSubtotals } from "./transactionSubtotals";

describe("buildTransactionSubtotals", () => {
  it("treats withdrawals as negative in the grand total", () => {
    const summary = buildTransactionSubtotals([
      { type: "CONTRIBUTION", amountCents: 200000 },
      { type: "WITHDRAWAL", amountCents: 50000 },
    ]);

    expect(summary.grandTotalCents).toBe(150000);
  });

  it("groups subtotals by transaction type", () => {
    const summary = buildTransactionSubtotals([
      { type: "CONTRIBUTION", amountCents: 200000 },
      { type: "CONTRIBUTION", amountCents: 300000 },
      { type: "WITHDRAWAL", amountCents: 50000 },
    ]);

    expect(summary.subtotals).toEqual([
      { type: "CONTRIBUTION", amountCents: 500000 },
      { type: "WITHDRAWAL", amountCents: 50000 },
    ]);
  });

  it("keeps negative market adjustments in the totals", () => {
    const summary = buildTransactionSubtotals([
      { type: "MARKET_ADJUSTMENT", amountCents: -45 },
      { type: "INTEREST", amountCents: 1200 },
    ]);

    expect(summary.grandTotalCents).toBe(1155);
    expect(summary.subtotals).toEqual([
      { type: "INTEREST", amountCents: 1200 },
      { type: "MARKET_ADJUSTMENT", amountCents: -45 },
    ]);
  });

  it("returns zero and no subtotal groups for empty input", () => {
    const summary = buildTransactionSubtotals([]);

    expect(summary.grandTotalCents).toBe(0);
    expect(summary.subtotals).toEqual([]);
  });
});
