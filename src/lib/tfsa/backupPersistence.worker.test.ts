import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import type { TfsaBackupV1 } from "./backup";
import { importTfsaBackup } from "@/lib/tfsa/backupPersistence";

const originalSettings = {
  id: 1,
  startingYear: 2020,
  startingContributionRoomCents: 100,
  contributionRoomNotes: "Original settings",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const originalAccount = {
  id: "acct_existing",
  name: "Original account",
  institution: "Original institution",
  notes: "Original account notes",
  createdAt: "2026-01-03T00:00:00.000Z",
  updatedAt: "2026-01-04T00:00:00.000Z",
};

const originalTransaction = {
  id: "txn_existing",
  accountId: "acct_existing",
  type: "CONTRIBUTION",
  amountCents: 100,
  occurredAt: "2026-01-05T00:00:00.000Z",
  notes: "Original transaction notes",
  createdAt: "2026-01-06T00:00:00.000Z",
  updatedAt: "2026-01-07T00:00:00.000Z",
};

function validBackup(): TfsaBackupV1 {
  return {
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
        id: "acct_existing",
        name: "Imported account",
        institution: "Imported institution",
        notes: "Imported account notes",
        createdAt: "2026-02-03T00:00:00.000Z",
        updatedAt: "2026-02-04T00:00:00.000Z",
      },
    ],
    transactions: [
      {
        id: "txn_existing",
        accountId: "acct_existing",
        type: "WITHDRAWAL",
        amountCents: 27500,
        occurredAt: "2026-02-05T00:00:00.000Z",
        notes: "Imported transaction notes",
        createdAt: "2026-02-06T00:00:00.000Z",
        updatedAt: "2026-02-07T00:00:00.000Z",
      },
    ],
  };
}

async function seedOriginalRows() {
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO "UserSettings" ("id", "startingYear", "startingContributionRoomCents", "contributionRoomNotes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(...Object.values(originalSettings)),
    env.DB.prepare(
      'INSERT INTO "Account" ("id", "name", "institution", "notes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(...Object.values(originalAccount)),
    env.DB.prepare(
      'INSERT INTO "Transaction" ("id", "accountId", "type", "amountCents", "occurredAt", "notes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(...Object.values(originalTransaction)),
  ]);
}

async function readRows() {
  const [settings, account, transaction] = await Promise.all([
    env.DB.prepare('SELECT * FROM "UserSettings" WHERE "id" = 1').first(),
    env.DB.prepare('SELECT * FROM "Account" WHERE "id" = ?')
      .bind(originalAccount.id)
      .first(),
    env.DB.prepare('SELECT * FROM "Transaction" WHERE "id" = ?')
      .bind(originalTransaction.id)
      .first(),
  ]);

  return { settings, account, transaction };
}

describe("Worker full-backup persistence", () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM "Transaction"'),
      env.DB.prepare('DELETE FROM "Account"'),
      env.DB.prepare('DELETE FROM "UserSettings"'),
    ]);
  });

  it("rolls back every preseeded field when the final transaction has a missing account", async () => {
    await seedOriginalRows();
    const before = await readRows();
    const backup = validBackup();
    backup.transactions.push({
      ...backup.transactions[0],
      id: "txn_missing_account",
      accountId: "acct_missing",
    });

    await expect(importTfsaBackup(backup)).rejects.toThrow(
      /FOREIGN KEY constraint failed/,
    );

    expect(await readRows()).toEqual(before);
  });

  it("imports the same backup twice with one row per stable ID", async () => {
    const backup = validBackup();

    await importTfsaBackup(backup);
    await importTfsaBackup(backup);

    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "UserSettings"').first(),
    ).resolves.toMatchObject({ count: 1 });
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Account"').first(),
    ).resolves.toMatchObject({ count: 1 });
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Transaction"').first(),
    ).resolves.toMatchObject({ count: 1 });
    await expect(readRows()).resolves.toEqual({
      settings: backup.settings,
      account: backup.accounts[0],
      transaction: backup.transactions[0],
    });
  });

  it("imports a valid empty backup and leaves every user-data table empty", async () => {
    const backup: TfsaBackupV1 = {
      version: 1,
      settings: null,
      accounts: [],
      transactions: [],
    };

    await expect(importTfsaBackup(backup)).resolves.toBeUndefined();

    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "UserSettings"').first(),
    ).resolves.toMatchObject({ count: 0 });
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Account"').first(),
    ).resolves.toMatchObject({ count: 0 });
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Transaction"').first(),
    ).resolves.toMatchObject({ count: 0 });
  });

  it("rejects invalid structure before changing D1", async () => {
    await seedOriginalRows();
    const before = await readRows();
    const backup = {
      ...validBackup(),
      transactions: [
        { ...validBackup().transactions[0], type: "UNKNOWN_TRANSACTION" },
      ],
    } as unknown as TfsaBackupV1;

    await expect(importTfsaBackup(backup)).rejects.toThrow();
    expect(await readRows()).toEqual(before);
  });
});
