import { db } from "@/lib/db";

import type { TfsaBackupSource } from "./backup";

export async function getFullBackupData(): Promise<TfsaBackupSource> {
  return db.$transaction(async (snapshot) => {
    const settings = await snapshot.userSettings.findUnique({
      where: { id: 1 },
    });
    const accounts = await snapshot.account.findMany({
      orderBy: { id: "asc" },
    });
    const transactions = await snapshot.transaction.findMany({
      orderBy: { id: "asc" },
    });

    return { settings, accounts, transactions };
  });
}
