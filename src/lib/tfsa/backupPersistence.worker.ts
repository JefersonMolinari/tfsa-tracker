import { getD1Database } from "@/lib/db.worker";

import {
  validateTfsaBackup,
  type TfsaBackupV1,
} from "./backup";

const settingsUpsertSql =
  'INSERT INTO "UserSettings" ("id", "startingYear", "startingContributionRoomCents", "contributionRoomNotes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT("id") DO UPDATE SET "startingYear" = excluded."startingYear", "startingContributionRoomCents" = excluded."startingContributionRoomCents", "contributionRoomNotes" = excluded."contributionRoomNotes", "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"';

const accountUpsertSql =
  'INSERT INTO "Account" ("id", "name", "institution", "notes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT("id") DO UPDATE SET "name" = excluded."name", "institution" = excluded."institution", "notes" = excluded."notes", "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"';

const transactionUpsertSql =
  'INSERT INTO "Transaction" ("id", "accountId", "type", "amountCents", "occurredAt", "notes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT("id") DO UPDATE SET "accountId" = excluded."accountId", "type" = excluded."type", "amountCents" = excluded."amountCents", "occurredAt" = excluded."occurredAt", "notes" = excluded."notes", "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"';

export async function importTfsaBackup(backup: TfsaBackupV1): Promise<void> {
  const validated = validateTfsaBackup(backup);
  const database = getD1Database();
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

  for (const account of validated.accounts) {
    statements.push(
      database
        .prepare(accountUpsertSql)
        .bind(
          account.id,
          account.name,
          account.institution,
          account.notes,
          account.createdAt,
          account.updatedAt,
        ),
    );
  }

  for (const transaction of validated.transactions) {
    statements.push(
      database
        .prepare(transactionUpsertSql)
        .bind(
          transaction.id,
          transaction.accountId,
          transaction.type,
          transaction.amountCents,
          transaction.occurredAt,
          transaction.notes,
          transaction.createdAt,
          transaction.updatedAt,
        ),
    );
  }

  await database.batch(statements);
}
