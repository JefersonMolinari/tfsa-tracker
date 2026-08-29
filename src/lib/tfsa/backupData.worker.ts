import type { TransactionType } from "@/generated/prisma/client";
import { getD1Database } from "@/lib/db.worker";

import type { TfsaBackupSource } from "./backup";

type D1SettingsRow = {
  id: number;
  startingYear: number;
  startingContributionRoomCents: number;
  contributionRoomNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

type D1AccountRow = {
  id: string;
  name: string;
  institution: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type D1TransactionRow = {
  id: string;
  accountId: string;
  type: TransactionType;
  amountCents: number;
  occurredAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseD1Date(value: string, field: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`D1 contains an invalid ${field} timestamp.`);
  }

  return date;
}

export async function getFullBackupData(): Promise<TfsaBackupSource> {
  const database = getD1Database();
  const results = await database.batch<D1SettingsRow | D1AccountRow | D1TransactionRow>([
    database.prepare('SELECT * FROM "UserSettings" WHERE "id" = 1'),
    database.prepare('SELECT * FROM "Account" ORDER BY "id" ASC'),
    database.prepare('SELECT * FROM "Transaction" ORDER BY "id" ASC'),
  ]);
  const settingsRow = results[0].results[0] as D1SettingsRow | undefined;
  const accountRows = results[1].results as D1AccountRow[];
  const transactionRows = results[2].results as D1TransactionRow[];

  return {
    settings: settingsRow
      ? {
          ...settingsRow,
          id: 1,
          createdAt: parseD1Date(settingsRow.createdAt, "settings createdAt"),
          updatedAt: parseD1Date(settingsRow.updatedAt, "settings updatedAt"),
        }
      : null,
    accounts: accountRows.map((account) => ({
      ...account,
      createdAt: parseD1Date(account.createdAt, "account createdAt"),
      updatedAt: parseD1Date(account.updatedAt, "account updatedAt"),
    })),
    transactions: transactionRows.map((transaction) => ({
      ...transaction,
      occurredAt: parseD1Date(transaction.occurredAt, "transaction occurredAt"),
      createdAt: parseD1Date(transaction.createdAt, "transaction createdAt"),
      updatedAt: parseD1Date(transaction.updatedAt, "transaction updatedAt"),
    })),
  };
}
