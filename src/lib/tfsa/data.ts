import type { Prisma, UserSettings } from "@prisma/client";

import { db } from "@/lib/db";

export const defaultSettings = (year = new Date().getUTCFullYear()) =>
  ({
    id: 1,
    startingYear: year,
    startingContributionRoomCents: 0,
    contributionRoomNotes: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  }) satisfies UserSettings;

export async function getAppData() {
  const [accounts, annualLimits, settings, transactions] = await Promise.all([
    db.account.findMany({
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [{ institution: "asc" }, { name: "asc" }],
    }),
    db.annualLimit.findMany({
      orderBy: { year: "asc" },
    }),
    db.userSettings.findUnique({
      where: { id: 1 },
    }),
    db.transaction.findMany({
      include: { account: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return {
    accounts,
    annualLimits,
    settings: settings ?? defaultSettings(),
    transactions,
  };
}

export async function getTransactionsPageData(filters: {
  accountId?: string;
  year?: number;
  type?: Prisma.TransactionWhereInput["type"];
}) {
  const where: Prisma.TransactionWhereInput = {};

  if (filters.accountId) {
    where.accountId = filters.accountId;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.year) {
    where.occurredAt = {
      gte: new Date(Date.UTC(filters.year, 0, 1)),
      lt: new Date(Date.UTC(filters.year + 1, 0, 1)),
    };
  }

  const [accounts, transactions] = await Promise.all([
    db.account.findMany({
      orderBy: [{ institution: "asc" }, { name: "asc" }],
    }),
    db.transaction.findMany({
      where,
      include: { account: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return {
    accounts,
    transactions,
  };
}
