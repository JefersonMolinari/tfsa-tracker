import { describe, expect, it } from "vitest";

import {
  buildTransactionsCsvFilename,
  serializeTransactionsToCsv,
} from "./exportTransactionsCsv";

describe("serializeTransactionsToCsv", () => {
  it("writes the expected header order and machine-safe values", () => {
    const csv = serializeTransactionsToCsv([
      {
        id: "txn_1",
        accountId: "acct_1",
        type: "CONTRIBUTION",
        amountCents: 123456,
        occurredAt: new Date("2026-02-01T00:00:00.000Z"),
        notes: null,
        createdAt: new Date("2026-02-01T01:00:00.000Z"),
        updatedAt: new Date("2026-02-01T02:00:00.000Z"),
        account: {
          name: "Main TFSA",
          institution: "Local Bank",
        },
      },
    ]);

    expect(csv).toBe(
      "transaction_id,account_id,account_name,institution,transaction_type,amount_cents,amount_cad,occurred_at,notes,created_at,updated_at\r\n" +
        "txn_1,acct_1,Main TFSA,Local Bank,CONTRIBUTION,123456,1234.56,2026-02-01T00:00:00.000Z,,2026-02-01T01:00:00.000Z,2026-02-01T02:00:00.000Z\r\n",
    );
  });

  it("escapes commas, quotes, and newlines in text fields", () => {
    const csv = serializeTransactionsToCsv([
      {
        id: "txn_2",
        accountId: "acct_2",
        type: "WITHDRAWAL",
        amountCents: 500,
        occurredAt: new Date("2026-03-01T00:00:00.000Z"),
        notes: "Line one,\nwith \"quotes\"",
        createdAt: new Date("2026-03-01T01:00:00.000Z"),
        updatedAt: new Date("2026-03-01T02:00:00.000Z"),
        account: {
          name: "Growth, TFSA",
          institution: "Credit \"Union\"",
        },
      },
    ]);

    expect(csv).toContain("\"Growth, TFSA\"");
    expect(csv).toContain("\"Credit \"\"Union\"\"\"");
    expect(csv).toContain("\"Line one,\nwith \"\"quotes\"\"\"");
  });

  it("formats negative and small-cent amounts as decimal CAD strings", () => {
    const csv = serializeTransactionsToCsv([
      {
        id: "txn_3",
        accountId: "acct_3",
        type: "MARKET_ADJUSTMENT",
        amountCents: -45,
        occurredAt: new Date("2026-04-01T00:00:00.000Z"),
        notes: "",
        createdAt: new Date("2026-04-01T01:00:00.000Z"),
        updatedAt: new Date("2026-04-01T02:00:00.000Z"),
        account: {
          name: "Trading TFSA",
          institution: "Broker",
        },
      },
    ]);

    expect(csv).toContain(",-45,-0.45,2026-04-01T00:00:00.000Z,");
  });
});

describe("buildTransactionsCsvFilename", () => {
  it("uses the local calendar date in the filename", () => {
    expect(
      buildTransactionsCsvFilename(new Date("2026-05-09T18:45:00.000Z")),
    ).toBe("tfsa-transactions-2026-05-09.csv");
  });
});
