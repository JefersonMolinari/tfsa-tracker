import { db } from "@/lib/db";

import {
  validateTfsaBackup,
  type TfsaBackupV1,
} from "./backup";

export async function importTfsaBackup(backup: TfsaBackupV1): Promise<void> {
  const validated = validateTfsaBackup(backup);

  await db.$transaction(async (tx) => {
    if (validated.settings) {
      const { id, createdAt, updatedAt, ...settings } = validated.settings;
      const data = {
        ...settings,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt),
      };

      await tx.userSettings.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }

    for (const account of validated.accounts) {
      const { id, createdAt, updatedAt, ...fields } = account;
      const data = {
        ...fields,
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt),
      };

      await tx.account.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }

    for (const transaction of validated.transactions) {
      const { id, occurredAt, createdAt, updatedAt, ...fields } = transaction;
      const data = {
        ...fields,
        occurredAt: new Date(occurredAt),
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt),
      };

      await tx.transaction.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }
  });
}
