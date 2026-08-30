import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TfsaBackupV1 } from "./backup";

const persistence = vi.hoisted(() => {
  const operations: string[] = [];
  const transactionClient = {
    userSettings: {
      upsert: vi.fn(async () => {
        operations.push("settings");
      }),
    },
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

import { importTfsaBackup } from "@/lib/tfsa/backupPersistence";

const backup: TfsaBackupV1 = {
  version: 1,
  settings: {
    id: 1,
    startingYear: 2024,
    startingContributionRoomCents: 950000,
    contributionRoomNotes: "Imported settings",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
  },
  accounts: [
    {
      id: "acct_1",
      name: "Main TFSA",
      institution: "Local Bank",
      notes: "Imported account",
      createdAt: "2026-02-03T00:00:00.000Z",
      updatedAt: "2026-02-04T00:00:00.000Z",
    },
  ],
  transactions: [
    {
      id: "txn_1",
      accountId: "acct_1",
      type: "CONTRIBUTION",
      amountCents: 250000,
      occurredAt: "2026-02-05T00:00:00.000Z",
      notes: "Imported transaction",
      createdAt: "2026-02-06T00:00:00.000Z",
      updatedAt: "2026-02-07T00:00:00.000Z",
    },
  ],
};

describe("local full-backup persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistence.operations.length = 0;
  });

  it("validates and upserts settings, accounts, then transactions in one Prisma transaction", async () => {
    await importTfsaBackup(backup);

    expect(persistence.db.$transaction).toHaveBeenCalledTimes(1);
    expect(persistence.operations).toEqual(["settings", "account", "transaction"]);
    expect(persistence.transactionClient.userSettings.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      update: {
        startingYear: 2024,
        startingContributionRoomCents: 950000,
        contributionRoomNotes: "Imported settings",
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-02T00:00:00.000Z"),
      },
      create: {
        id: 1,
        startingYear: 2024,
        startingContributionRoomCents: 950000,
        contributionRoomNotes: "Imported settings",
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-02T00:00:00.000Z"),
      },
    });
  });

  it("rejects invalid input before opening a Prisma transaction", async () => {
    const invalid = { ...backup, version: 2 } as unknown as TfsaBackupV1;

    await expect(importTfsaBackup(invalid)).rejects.toThrow();
    expect(persistence.db.$transaction).not.toHaveBeenCalled();
  });
});
