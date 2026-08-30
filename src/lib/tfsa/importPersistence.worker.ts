import { getD1Database } from "@/lib/db.worker";

import type { TransactionCsvImportRow } from "./importTransactionsCsv";
import { toBoundedD1JsonChunks } from "./d1JsonBatch";

const accountUpsertSql =
  'INSERT INTO "Account" ("id", "name", "institution", "updatedAt") SELECT json_extract(value, \'$.id\'), json_extract(value, \'$.name\'), json_extract(value, \'$.institution\'), json_extract(value, \'$.updatedAt\') FROM json_each(?) WHERE true ON CONFLICT("id") DO UPDATE SET "name" = excluded."name", "institution" = excluded."institution", "updatedAt" = excluded."updatedAt"';

const transactionUpsertSql =
  'INSERT INTO "Transaction" ("id", "accountId", "type", "amountCents", "occurredAt", "notes", "createdAt", "updatedAt") SELECT json_extract(value, \'$.transactionId\'), json_extract(value, \'$.accountId\'), json_extract(value, \'$.type\'), json_extract(value, \'$.amountCents\'), json_extract(value, \'$.occurredAt\'), json_extract(value, \'$.notes\'), json_extract(value, \'$.createdAt\'), json_extract(value, \'$.updatedAt\') FROM json_each(?) WHERE true ON CONFLICT("id") DO UPDATE SET "accountId" = excluded."accountId", "type" = excluded."type", "amountCents" = excluded."amountCents", "occurredAt" = excluded."occurredAt", "notes" = excluded."notes", "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"';

export function buildTransactionCsvStatements(
  database: D1Database,
  rows: TransactionCsvImportRow[],
): D1PreparedStatement[] {
  const accountUpdatedAt = new Date().toISOString();
  const accountsById = new Map(
    rows.map((row) => [
      row.accountId,
      {
        id: row.accountId,
        name: row.accountName,
        institution: row.institution,
        updatedAt: accountUpdatedAt,
      },
    ]),
  );
  const statements: D1PreparedStatement[] = [];

  for (const accountsJson of toBoundedD1JsonChunks([
    ...accountsById.values(),
  ])) {
    statements.push(
      database.prepare(accountUpsertSql).bind(accountsJson),
    );
  }

  for (const rowsJson of toBoundedD1JsonChunks(rows)) {
    statements.push(
      database.prepare(transactionUpsertSql).bind(rowsJson),
    );
  }

  return statements;
}

export async function importTransactionsCsvRows(
  rows: TransactionCsvImportRow[],
): Promise<void> {
  if (rows.length === 0) return;

  const database = getD1Database();
  await database.batch(buildTransactionCsvStatements(database, rows));
}
