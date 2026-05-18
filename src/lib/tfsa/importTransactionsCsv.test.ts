import { describe, expect, it } from "vitest";

import { serializeTransactionsToCsv } from "./exportTransactionsCsv";
import { parseTransactionsCsvImport } from "./importTransactionsCsv";

describe("parseTransactionsCsvImport", () => {
  it("parses a transactions CSV produced by the export serializer", () => {
    const csv = serializeTransactionsToCsv([
      {
        id: "txn_1",
        accountId: "acct_1",
        type: "CONTRIBUTION",
        amountCents: 123456,
        occurredAt: new Date("2026-02-01T00:00:00.000Z"),
        notes: "Spring contribution",
        createdAt: new Date("2026-02-01T01:00:00.000Z"),
        updatedAt: new Date("2026-02-01T02:00:00.000Z"),
        account: {
          name: "Main TFSA",
          institution: "Local Bank",
        },
      },
    ]);

    expect(parseTransactionsCsvImport(csv)).toEqual([
      {
        transactionId: "txn_1",
        accountId: "acct_1",
        accountName: "Main TFSA",
        institution: "Local Bank",
        type: "CONTRIBUTION",
        amountCents: 123456,
        occurredAt: new Date("2026-02-01T00:00:00.000Z"),
        notes: "Spring contribution",
        createdAt: new Date("2026-02-01T01:00:00.000Z"),
        updatedAt: new Date("2026-02-01T02:00:00.000Z"),
      },
    ]);
  });

  it("handles quoted commas, quotes, and newlines", () => {
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

    const [row] = parseTransactionsCsvImport(csv);

    expect(row.accountName).toBe("Growth, TFSA");
    expect(row.institution).toBe("Credit \"Union\"");
    expect(row.notes).toBe("Line one,\nwith \"quotes\"");
  });

  it("rejects reordered headers", () => {
    const csv =
      "account_id,transaction_id,account_name,institution,transaction_type,amount_cents,amount_cad,occurred_at,notes,created_at,updated_at\r\n" +
      "acct_1,txn_1,Main TFSA,Local Bank,CONTRIBUTION,100,1.00,2026-02-01T00:00:00.000Z,,2026-02-01T01:00:00.000Z,2026-02-01T02:00:00.000Z\r\n";

    expect(() => parseTransactionsCsvImport(csv)).toThrow(
      "CSV headers must match the exported transactions CSV format.",
    );
  });

  it("rejects invalid transaction types, cents, and dates", () => {
    const validLine =
      "transaction_id,account_id,account_name,institution,transaction_type,amount_cents,amount_cad,occurred_at,notes,created_at,updated_at\r\n";

    expect(() =>
      parseTransactionsCsvImport(
        `${validLine}txn_1,acct_1,Main TFSA,Local Bank,NOPE,100,1.00,2026-02-01T00:00:00.000Z,,2026-02-01T01:00:00.000Z,2026-02-01T02:00:00.000Z\r\n`,
      ),
    ).toThrow("invalid transaction_type");

    expect(() =>
      parseTransactionsCsvImport(
        `${validLine}txn_1,acct_1,Main TFSA,Local Bank,CONTRIBUTION,1.25,1.25,2026-02-01T00:00:00.000Z,,2026-02-01T01:00:00.000Z,2026-02-01T02:00:00.000Z\r\n`,
      ),
    ).toThrow("invalid amount_cents");

    expect(() =>
      parseTransactionsCsvImport(
        `${validLine}txn_1,acct_1,Main TFSA,Local Bank,CONTRIBUTION,100,1.00,2026-02-01,,2026-02-01T01:00:00.000Z,2026-02-01T02:00:00.000Z\r\n`,
      ),
    ).toThrow("invalid occurred_at date");
  });

  it("ignores amount_cad and uses integer cents", () => {
    const csv =
      "transaction_id,account_id,account_name,institution,transaction_type,amount_cents,amount_cad,occurred_at,notes,created_at,updated_at\r\n" +
      "txn_1,acct_1,Main TFSA,Local Bank,CONTRIBUTION,250000,0.01,2026-02-01T00:00:00.000Z,,2026-02-01T01:00:00.000Z,2026-02-01T02:00:00.000Z\r\n";

    expect(parseTransactionsCsvImport(csv)[0].amountCents).toBe(250000);
  });
});
