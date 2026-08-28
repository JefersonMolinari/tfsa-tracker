import { getD1Database } from "@/lib/db.worker";

import type { TransactionCsvImportRow } from "./importTransactionsCsv";

const accountUpsertSql =
  'INSERT INTO "Account" ("id", "name", "institution", "updatedAt") VALUES (?, ?, ?, ?) ON CONFLICT("id") DO UPDATE SET "name" = excluded."name", "institution" = excluded."institution", "updatedAt" = excluded."updatedAt"';

const transactionUpsertSql =
  'INSERT INTO "Transaction" ("id", "accountId", "type", "amountCents", "occurredAt", "notes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT("id") DO UPDATE SET "accountId" = excluded."accountId", "type" = excluded."type", "amountCents" = excluded."amountCents", "occurredAt" = excluded."occurredAt", "notes" = excluded."notes", "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"';

export async function importTransactionsCsvRows(
  rows: TransactionCsvImportRow[],
): Promise<void> {
  const database = getD1Database();
  const accountUpdatedAt = new Date().toISOString();
  const accountsById = new Map(
    rows.map((row) => [
      row.accountId,
      {
        id: row.accountId,
        name: row.accountName,
        institution: row.institution,
      },
    ]),
  );
  const statements: D1PreparedStatement[] = [];

  for (const account of accountsById.values()) {
    statements.push(
      database
        .prepare(accountUpsertSql)
        .bind(
          account.id,
          account.name,
          account.institution,
          accountUpdatedAt,
        ),
    );
  }

  for (const row of rows) {
    statements.push(
      database
        .prepare(transactionUpsertSql)
        .bind(
          row.transactionId,
          row.accountId,
          row.type,
          row.amountCents,
          row.occurredAt.toISOString(),
          row.notes,
          row.createdAt.toISOString(),
          row.updatedAt.toISOString(),
        ),
    );
  }

  await database.batch(statements);
}
