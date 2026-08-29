import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { TransactionCsvImportRow } from "./importTransactionsCsv";
import * as importPersistence from "@/lib/tfsa/importPersistence";

const { importTransactionsCsvRows } = importPersistence;

const failureTriggerName = "force_import_transaction_foreign_key_failure";

function importRow(
  overrides: Partial<TransactionCsvImportRow> = {},
): TransactionCsvImportRow {
  return {
    transactionId: "txn_1",
    accountId: "acct_1",
    accountName: "Imported account",
    institution: "Imported institution",
    type: "CONTRIBUTION",
    amountCents: 250000,
    occurredAt: new Date("2026-02-01T00:00:00.000Z"),
    notes: "Imported transaction",
    createdAt: new Date("2026-02-01T01:00:00.000Z"),
    updatedAt: new Date("2026-02-01T02:00:00.000Z"),
    ...overrides,
  };
}

function maximumCsvRows(): TransactionCsvImportRow[] {
  return Array.from({ length: 10_000 }, (_, index) =>
    importRow({
      transactionId: `txn_${index}`,
      accountId: `acct_${index % 2_000}`,
      accountName: "A",
      institution: "I",
      amountCents: 1,
      notes: null,
    }),
  );
}

async function dropFailureTrigger() {
  await env.DB.prepare(`DROP TRIGGER IF EXISTS "${failureTriggerName}"`).run();
}

describe("Worker CSV import persistence", () => {
  beforeEach(async () => {
    await dropFailureTrigger();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM "Transaction"'),
      env.DB.prepare('DELETE FROM "Account"'),
    ]);
  });

  afterEach(dropFailureTrigger);

  it("imports one account and transaction in one successful batch", async () => {
    await importTransactionsCsvRows([importRow()]);

    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Account"').first(),
    ).resolves.toMatchObject({ count: 1 });
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Transaction"').first(),
    ).resolves.toMatchObject({ count: 1 });
    await expect(
      env.DB.prepare(
        'SELECT "id", "name", "institution" FROM "Account" WHERE "id" = ?',
      )
        .bind("acct_1")
        .first(),
    ).resolves.toMatchObject({
      id: "acct_1",
      name: "Imported account",
      institution: "Imported institution",
    });
    await expect(
      env.DB.prepare(
        'SELECT "id", "accountId", "type", "amountCents", "notes" FROM "Transaction" WHERE "id" = ?',
      )
        .bind("txn_1")
        .first(),
    ).resolves.toMatchObject({
      id: "txn_1",
      accountId: "acct_1",
      type: "CONTRIBUTION",
      amountCents: 250000,
      notes: "Imported transaction",
    });
  });

  it("treats a header-only CSV import as a real-D1 no-op", async () => {
    await expect(importTransactionsCsvRows([])).resolves.toBeUndefined();

    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Account"').first(),
    ).resolves.toMatchObject({ count: 0 });
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Transaction"').first(),
    ).resolves.toMatchObject({ count: 0 });
  });

  it("builds three real D1 statements for the maximum CSV row and account counts", async () => {
    const buildStatements = (
      importPersistence as typeof importPersistence & {
        buildTransactionCsvStatements?: (
          database: D1Database,
          rows: TransactionCsvImportRow[],
        ) => D1PreparedStatement[];
      }
    ).buildTransactionCsvStatements;

    expect(buildStatements).toBeTypeOf("function");
    if (!buildStatements) return;

    const statements = buildStatements(env.DB, maximumCsvRows());

    expect(statements).toHaveLength(3);
    await expect(env.DB.batch(statements)).resolves.toHaveLength(3);
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Account"').first(),
    ).resolves.toMatchObject({ count: 2_000 });
    await expect(
      env.DB.prepare('SELECT COUNT(*) AS "count" FROM "Transaction"').first(),
    ).resolves.toMatchObject({ count: 10_000 });
  });

  it("rolls back the account upsert when the transaction statement violates a foreign key", async () => {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO "Account" ("id", "name", "institution", "updatedAt") VALUES (?, ?, ?, ?)',
      ).bind(
        "acct_1",
        "Original account",
        "Original institution",
        "2026-01-01T00:00:00.000Z",
      ),
      env.DB.prepare(
        'INSERT INTO "Transaction" ("id", "accountId", "type", "amountCents", "occurredAt", "notes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        "txn_1",
        "acct_1",
        "CONTRIBUTION",
        100,
        "2026-01-01T00:00:00.000Z",
        "Original transaction",
        "2026-01-01T01:00:00.000Z",
        "2026-01-01T02:00:00.000Z",
      ),
    ]);
    await env.DB.prepare(
      `CREATE TRIGGER "${failureTriggerName}"
       AFTER UPDATE ON "Account"
       WHEN NEW."id" = 'acct_1'
       BEGIN
         DELETE FROM "Account" WHERE "id" = NEW."id";
       END`,
    ).run();

    await expect(importTransactionsCsvRows([importRow()])).rejects.toThrow(
      /FOREIGN KEY constraint failed/,
    );

    await expect(
      env.DB.prepare(
        'SELECT "name", "institution" FROM "Account" WHERE "id" = ?',
      )
        .bind("acct_1")
        .first(),
    ).resolves.toMatchObject({
      name: "Original account",
      institution: "Original institution",
    });
    await expect(
      env.DB.prepare(
        'SELECT "accountId", "amountCents", "notes" FROM "Transaction" WHERE "id" = ?',
      )
        .bind("txn_1")
        .first(),
    ).resolves.toMatchObject({
      accountId: "acct_1",
      amountCents: 100,
      notes: "Original transaction",
    });
  });
});
