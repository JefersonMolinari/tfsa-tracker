import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionType } from "@/generated/prisma/client";

const database = vi.hoisted(() => ({
  account: { findMany: vi.fn() },
  annualLimit: { findMany: vi.fn() },
  transaction: { findMany: vi.fn() },
  userSettings: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: database }));

import {
  parseTfsaBackup,
  serializeTfsaBackup,
  type TfsaBackupV1,
} from "./backup";
import { getFullBackupData } from "./data";

const settingsSource = {
  id: 1 as const,
  startingYear: 2024,
  startingContributionRoomCents: 1250000,
  contributionRoomNotes: "Verified with CRA",
  createdAt: new Date("2026-01-01T01:00:00.000Z"),
  updatedAt: new Date("2026-02-01T02:00:00.000Z"),
};

const accountSource = {
  id: "acct_1",
  name: "Main TFSA",
  institution: "Local Bank",
  notes: null,
  createdAt: new Date("2026-01-02T01:00:00.000Z"),
  updatedAt: new Date("2026-02-02T02:00:00.000Z"),
};

const transactionSource = {
  id: "txn_1",
  accountId: "acct_1",
  type: "CONTRIBUTION" as TransactionType,
  amountCents: 250000,
  occurredAt: new Date("2026-01-15T12:30:00.000Z"),
  notes: "January contribution",
  createdAt: new Date("2026-01-15T12:31:00.000Z"),
  updatedAt: new Date("2026-01-15T12:32:00.000Z"),
};

const validBackup: TfsaBackupV1 = {
  version: 1,
  settings: {
    ...settingsSource,
    createdAt: "2026-01-01T01:00:00.000Z",
    updatedAt: "2026-02-01T02:00:00.000Z",
  },
  accounts: [
    {
      ...accountSource,
      createdAt: "2026-01-02T01:00:00.000Z",
      updatedAt: "2026-02-02T02:00:00.000Z",
    },
  ],
  transactions: [
    {
      ...transactionSource,
      occurredAt: "2026-01-15T12:30:00.000Z",
      createdAt: "2026-01-15T12:31:00.000Z",
      updatedAt: "2026-01-15T12:32:00.000Z",
    },
  ],
};

function parse(value: unknown) {
  return parseTfsaBackup(JSON.stringify(value));
}

describe("TFSA backup codec", () => {
  it("serializes Prisma dates to JSON-safe ISO timestamps and round-trips version 1", () => {
    const serialized = serializeTfsaBackup({
      settings: settingsSource,
      accounts: [accountSource],
      transactions: [transactionSource],
    });

    expect(JSON.parse(serialized)).toEqual(validBackup);
    expect(parseTfsaBackup(serialized)).toEqual(validBackup);
  });

  it("rejects an unknown backup version", () => {
    expect(() => parse({ ...validBackup, version: 2 })).toThrow();
  });

  it("rejects unknown structure instead of silently stripping it", () => {
    expect(() => parse({ ...validBackup, annualLimits: [] })).toThrow();
    expect(() =>
      parse({
        ...validBackup,
        accounts: [{ ...validBackup.accounts[0], secret: "not allowed" }],
      }),
    ).toThrow();
  });

  it.each([
    ["settings.createdAt", (backup: TfsaBackupV1) => {
      if (backup.settings) backup.settings.createdAt = "2026-01-01T01:00:00";
    }],
    ["settings.updatedAt", (backup: TfsaBackupV1) => {
      if (backup.settings) backup.settings.updatedAt = "2026-02-01T02:00:00";
    }],
    ["accounts.createdAt", (backup: TfsaBackupV1) => {
      backup.accounts[0].createdAt = "2026-01-02T01:00:00";
    }],
    ["accounts.updatedAt", (backup: TfsaBackupV1) => {
      backup.accounts[0].updatedAt = "2026-02-02T02:00:00";
    }],
    ["transactions.occurredAt", (backup: TfsaBackupV1) => {
      backup.transactions[0].occurredAt = "2026-01-15T12:30:00";
    }],
    ["transactions.createdAt", (backup: TfsaBackupV1) => {
      backup.transactions[0].createdAt = "2026-01-15T12:31:00";
    }],
    ["transactions.updatedAt", (backup: TfsaBackupV1) => {
      backup.transactions[0].updatedAt = "2026-01-15T12:32:00";
    }],
  ])("rejects %s without an ISO offset", (_field, mutate) => {
    const backup = structuredClone(validBackup);
    mutate(backup);

    expect(() => parse(backup)).toThrow();
  });

  it("rejects an unknown transaction type", () => {
    expect(() =>
      parse({
        ...validBackup,
        transactions: [
          { ...validBackup.transactions[0], type: "UNKNOWN_TRANSACTION" },
        ],
      }),
    ).toThrow();
  });

  it.each([2008, 2101])(
    "rejects starting year %s outside the settings range",
    (startingYear) => {
      expect(() =>
        parse({
          ...validBackup,
          settings: { ...validBackup.settings, startingYear },
        }),
      ).toThrow();
    },
  );

  it("rejects negative starting contribution room", () => {
    expect(() =>
      parse({
        ...validBackup,
        settings: {
          ...validBackup.settings,
          startingContributionRoomCents: -1,
        },
      }),
    ).toThrow();
  });

  it.each([
    "CONTRIBUTION",
    "WITHDRAWAL",
    "QUALIFYING_TRANSFER",
    "FEE",
    "DIVIDEND",
    "INTEREST",
    "BALANCE_SNAPSHOT",
  ] as const)("rejects a negative %s transaction", (type) => {
    expect(() =>
      parse({
        ...validBackup,
        transactions: [
          { ...validBackup.transactions[0], type, amountCents: -1 },
        ],
      }),
    ).toThrow();
  });

  it("accepts a negative market adjustment transaction", () => {
    expect(
      parse({
        ...validBackup,
        transactions: [
          {
            ...validBackup.transactions[0],
            type: "MARKET_ADJUSTMENT",
            amountCents: -1,
          },
        ],
      }).transactions[0],
    ).toMatchObject({ type: "MARKET_ADJUSTMENT", amountCents: -1 });
  });

  it("rejects an imported transaction whose account is absent", () => {
    expect(() =>
      parse({
        ...validBackup,
        transactions: [
          { ...validBackup.transactions[0], accountId: "acct_missing" },
        ],
      }),
    ).toThrow("missing account");
  });

  it("refuses to serialize an exported transaction whose account is absent", () => {
    expect(() =>
      serializeTfsaBackup({
        settings: settingsSource,
        accounts: [accountSource],
        transactions: [
          { ...transactionSource, accountId: "acct_missing" },
        ],
      }),
    ).toThrow("missing account");
  });

  it("rejects a backup larger than 5 MiB", () => {
    const oversized = JSON.stringify({
      ...validBackup,
      settings: {
        ...validBackup.settings,
        contributionRoomNotes: "x".repeat(5 * 1024 * 1024),
      },
    });

    expect(() => parseTfsaBackup(oversized)).toThrow();
  });

  it("rejects more than 2,000 accounts", () => {
    expect(() =>
      parse({
        ...validBackup,
        accounts: Array.from({ length: 2_001 }, (_, index) => ({
          ...validBackup.accounts[0],
          id: `acct_${index}`,
        })),
      }),
    ).toThrow();
  });

  it("rejects more than 10,000 transactions", () => {
    expect(() =>
      parse({
        ...validBackup,
        transactions: Array.from({ length: 10_001 }, (_, index) => ({
          ...validBackup.transactions[0],
          id: `txn_${index}`,
        })),
      }),
    ).toThrow();
  });
});

describe("getFullBackupData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.$transaction.mockImplementation(
      async (read: (snapshot: typeof database) => unknown) => read(database),
    );
    database.userSettings.findUnique.mockResolvedValue(settingsSource);
    database.account.findMany.mockResolvedValue([accountSource]);
    database.transaction.findMany.mockResolvedValue([transactionSource]);
  });

  it("reads settings, accounts, and transactions by stable ID without annual limits", async () => {
    await expect(getFullBackupData()).resolves.toEqual({
      settings: settingsSource,
      accounts: [accountSource],
      transactions: [transactionSource],
    });

    expect(database.userSettings.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(database.account.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
    });
    expect(database.transaction.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
    });
    expect(database.annualLimit.findMany).not.toHaveBeenCalled();
  });

  it("returns one coherent snapshot when live tables change between reads", async () => {
    const snapshotDatabase = {
      userSettings: { findUnique: vi.fn().mockResolvedValue(settingsSource) },
      account: { findMany: vi.fn().mockResolvedValue([accountSource]) },
      transaction: { findMany: vi.fn().mockResolvedValue([transactionSource]) },
    };
    database.$transaction.mockImplementationOnce(
      async (read: (snapshot: typeof snapshotDatabase) => unknown) =>
        read(snapshotDatabase),
    );
    database.account.findMany.mockImplementationOnce(async () => {
      database.transaction.findMany.mockResolvedValueOnce([
        { ...transactionSource, accountId: "acct_new" },
      ]);
      return [accountSource];
    });

    await expect(getFullBackupData()).resolves.toEqual({
      settings: settingsSource,
      accounts: [accountSource],
      transactions: [transactionSource],
    });
  });
});
