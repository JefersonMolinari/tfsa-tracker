import { db } from "@/lib/db";

import type { TransactionCsvImportRow } from "./importTransactionsCsv";

export async function importTransactionsCsvRows(
  rows: TransactionCsvImportRow[],
): Promise<void> {
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

  await db.$transaction(async (tx) => {
    for (const account of accountsById.values()) {
      await tx.account.upsert({
        where: { id: account.id },
        update: {
          name: account.name,
          institution: account.institution,
        },
        create: {
          id: account.id,
          name: account.name,
          institution: account.institution,
        },
      });
    }

    for (const row of rows) {
      await tx.transaction.upsert({
        where: { id: row.transactionId },
        update: {
          accountId: row.accountId,
          type: row.type,
          amountCents: row.amountCents,
          occurredAt: row.occurredAt,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        create: {
          id: row.transactionId,
          accountId: row.accountId,
          type: row.type,
          amountCents: row.amountCents,
          occurredAt: row.occurredAt,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
    }
  });
}
