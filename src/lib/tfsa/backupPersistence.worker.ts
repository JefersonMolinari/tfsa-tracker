import { getD1Database } from "@/lib/db.worker";

import {
  validateTfsaBackup,
  type TfsaBackupV1,
} from "./backup";
import { toBoundedD1JsonChunks } from "./d1JsonBatch";

const settingsUpsertSql =
  'INSERT INTO "UserSettings" ("id", "startingYear", "startingContributionRoomCents", "contributionRoomNotes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT("id") DO UPDATE SET "startingYear" = excluded."startingYear", "startingContributionRoomCents" = excluded."startingContributionRoomCents", "contributionRoomNotes" = excluded."contributionRoomNotes", "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"';

const accountUpsertSql =
  'INSERT INTO "Account" ("id", "name", "institution", "notes", "createdAt", "updatedAt") SELECT json_extract(value, \'$.id\'), json_extract(value, \'$.name\'), json_extract(value, \'$.institution\'), json_extract(value, \'$.notes\'), json_extract(value, \'$.createdAt\'), json_extract(value, \'$.updatedAt\') FROM json_each(?) WHERE true ON CONFLICT("id") DO UPDATE SET "name" = excluded."name", "institution" = excluded."institution", "notes" = excluded."notes", "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"';

const transactionUpsertSql =
  'INSERT INTO "Transaction" ("id", "accountId", "type", "amountCents", "occurredAt", "notes", "createdAt", "updatedAt") SELECT json_extract(value, \'$.id\'), json_extract(value, \'$.accountId\'), json_extract(value, \'$.type\'), json_extract(value, \'$.amountCents\'), json_extract(value, \'$.occurredAt\'), json_extract(value, \'$.notes\'), json_extract(value, \'$.createdAt\'), json_extract(value, \'$.updatedAt\') FROM json_each(?) WHERE true ON CONFLICT("id") DO UPDATE SET "accountId" = excluded."accountId", "type" = excluded."type", "amountCents" = excluded."amountCents", "occurredAt" = excluded."occurredAt", "notes" = excluded."notes", "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"';
const noOpSql = "SELECT 1";

export function buildTfsaBackupStatements(
  database: D1Database,
  backup: TfsaBackupV1,
): D1PreparedStatement[] {
  const validated = validateTfsaBackup(backup);
  const statements: D1PreparedStatement[] = [];

  if (validated.settings) {
    const settings = validated.settings;
    statements.push(
      database
        .prepare(settingsUpsertSql)
        .bind(
          settings.id,
          settings.startingYear,
          settings.startingContributionRoomCents,
          settings.contributionRoomNotes,
          settings.createdAt,
          settings.updatedAt,
        ),
    );
  }

  for (const accountsJson of toBoundedD1JsonChunks(validated.accounts)) {
    statements.push(
      database.prepare(accountUpsertSql).bind(accountsJson),
    );
  }

  for (const transactionsJson of toBoundedD1JsonChunks(
    validated.transactions,
  )) {
    statements.push(
      database.prepare(transactionUpsertSql).bind(transactionsJson),
    );
  }

  if (statements.length === 0) {
    statements.push(database.prepare(noOpSql));
  }

  return statements;
}

export async function importTfsaBackup(backup: TfsaBackupV1): Promise<void> {
  const database = getD1Database();
  await database.batch(buildTfsaBackupStatements(database, backup));
}
