import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionCsvImportRow } from "./importTransactionsCsv";

const persistence = vi.hoisted(() => {
  const operations: string[] = [];
  const transactionClient = {
    account: {
      upsert: vi.fn(async () => {
        operations.push("account");
      }),
    },
    transaction: {
      upsert: vi.fn(async () => {
        operations.push("transaction");
      }),
    },
  };
  const db = {
    $transaction: vi.fn(
      async (callback: (client: typeof transactionClient) => Promise<void>) => {
        await callback(transactionClient);
      },
    ),
  };

  return { db, operations, transactionClient };
});

vi.mock("@/lib/db", () => ({ db: persistence.db }));

import { importTransactionsCsvRows } from "@/lib/tfsa/importPersistence";

const row: TransactionCsvImportRow = {
  transactionId: "txn_1",
  accountId: "acct_1",
  accountName: "Main TFSA",
  institution: "Local Bank",
  type: "CONTRIBUTION",
  amountCents: 250000,
  occurredAt: new Date("2026-02-01T00:00:00.000Z"),
  notes: "Imported",
  createdAt: new Date("2026-02-01T01:00:00.000Z"),
  updatedAt: new Date("2026-02-01T02:00:00.000Z"),
};

describe("local CSV import persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistence.operations.length = 0;
  });

  it("upserts accounts before transactions inside one Prisma transaction", async () => {
    await importTransactionsCsvRows([row]);

    expect(persistence.db.$transaction).toHaveBeenCalledTimes(1);
    expect(persistence.operations).toEqual(["account", "transaction"]);
    expect(persistence.transactionClient.account.upsert).toHaveBeenCalledWith({
      where: { id: "acct_1" },
      update: {
        name: "Main TFSA",
        institution: "Local Bank",
      },
      create: {
        id: "acct_1",
        name: "Main TFSA",
        institution: "Local Bank",
      },
    });
    expect(persistence.transactionClient.transaction.upsert).toHaveBeenCalledWith({
      where: { id: "txn_1" },
      update: {
        accountId: "acct_1",
        type: "CONTRIBUTION",
        amountCents: 250000,
        occurredAt: new Date("2026-02-01T00:00:00.000Z"),
        notes: "Imported",
        createdAt: new Date("2026-02-01T01:00:00.000Z"),
        updatedAt: new Date("2026-02-01T02:00:00.000Z"),
      },
      create: {
        id: "txn_1",
        accountId: "acct_1",
        type: "CONTRIBUTION",
        amountCents: 250000,
        occurredAt: new Date("2026-02-01T00:00:00.000Z"),
        notes: "Imported",
        createdAt: new Date("2026-02-01T01:00:00.000Z"),
        updatedAt: new Date("2026-02-01T02:00:00.000Z"),
      },
    });
  });
});
