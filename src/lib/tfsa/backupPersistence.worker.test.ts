import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { TfsaBackupV1 } from "./backup";
import * as backupPersistence from "@/lib/tfsa/backupPersistence";

const { importTfsaBackup } = backupPersistence;

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
const failureTriggerName = "force_backup_account_failure";

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

function maximumCountBackup(): TfsaBackupV1 {
  const createdAt = "2026-02-01T00:00:00.000Z";
  const updatedAt = "2026-02-02T00:00:00.000Z";

  return {
    version: 1,
    settings: {
      id: 1,
      startingYear: 2024,
      startingContributionRoomCents: 0,
      contributionRoomNotes: null,
      createdAt,
      updatedAt,
    },
    accounts: Array.from({ length: 2_000 }, (_, index) => ({
      id: `acct_${index}`,
      name: "A",
      institution: "I",
      notes: null,
      createdAt,
      updatedAt,
    })),
    transactions: Array.from({ length: 10_000 }, (_, index) => ({
      id: `txn_${index}`,
      accountId: `acct_${index % 2_000}`,
      type: "CONTRIBUTION",
      amountCents: 1,
      occurredAt: createdAt,
      notes: null,
      createdAt,
      updatedAt,
    })),
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

async function dropFailureTrigger() {
  await env.DB.prepare(`DROP TRIGGER IF EXISTS "${failureTriggerName}"`).run();
}

describe("Worker full-backup persistence", () => {
  beforeEach(async () => {
    await dropFailureTrigger();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM "Transaction"'),
      env.DB.prepare('DELETE FROM "Account"'),
      env.DB.prepare('DELETE FROM "UserSettings"'),
    ]);
  });

  afterEach(dropFailureTrigger);

  it("rolls back every preseeded field when a bulk account upsert fails", async () => {
    await seedOriginalRows();
    const before = await readRows();
    const backup = validBackup();
    await env.DB.prepare(
      `CREATE TRIGGER "${failureTriggerName}"
       BEFORE UPDATE ON "Account"
       WHEN NEW."id" = 'acct_existing'
       BEGIN
         SELECT RAISE(ABORT, 'forced backup failure');
       END`,
    ).run();

    await expect(importTfsaBackup(backup)).rejects.toThrow(
      /forced backup failure/,
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

  it("builds four real D1 statements for the maximum account and transaction counts", async () => {
    const buildStatements = (
      backupPersistence as typeof backupPersistence & {
        buildTfsaBackupStatements?: (
          database: D1Database,
          backup: TfsaBackupV1,
        ) => D1PreparedStatement[];
      }
    ).buildTfsaBackupStatements;

    expect(buildStatements).toBeTypeOf("function");
    if (!buildStatements) return;

    const statements = buildStatements(env.DB, maximumCountBackup());

    expect(statements).toHaveLength(4);
    await expect(env.DB.batch(statements)).resolves.toHaveLength(4);
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Account"').first(),
    ).resolves.toMatchObject({ count: 2_000 });
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Transaction"').first(),
    ).resolves.toMatchObject({ count: 10_000 });
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
