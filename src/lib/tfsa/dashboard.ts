import type { AnnualLimit, Transaction, TransactionType, UserSettings } from "@prisma/client";

import {
  estimateTfsaContributionRoom,
  type TfsaCalculationTransaction,
} from "./estimateContributionRoom";

export type DashboardSummary = {
  estimatedContributionRoomCents: number;
  contributionsThisYearCents: number;
  withdrawalsThisYearCents: number;
  totalTfsaBalanceCents: number;
  isOvercontributed: boolean;
  warningLevel: "safe" | "low" | "over";
};

type BalanceTransaction = Pick<Transaction, "amountCents" | "occurredAt" | "type">;

export function calculateTransactionBalanceDelta(transaction: BalanceTransaction): number | null {
  switch (transaction.type) {
    case "CONTRIBUTION":
    case "DIVIDEND":
    case "INTEREST":
      return transaction.amountCents;
    case "WITHDRAWAL":
    case "FEE":
      return -transaction.amountCents;
    case "QUALIFYING_TRANSFER":
      return 0;
    case "MARKET_ADJUSTMENT":
      return transaction.amountCents;
    case "BALANCE_SNAPSHOT":
      return null;
    default: {
      const exhaustiveCheck: never = transaction.type;
      return exhaustiveCheck;
    }
  }
}

export function estimateTfsaBalance(transactions: BalanceTransaction[]): number {
  const orderedTransactions = [...transactions].sort(
    (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
  );

  let balance = 0;

  for (const transaction of orderedTransactions) {
    if (transaction.type === "BALANCE_SNAPSHOT") {
      balance = transaction.amountCents;
      continue;
    }

    balance += calculateTransactionBalanceDelta(transaction) ?? 0;
  }

  return balance;
}

export function calculateAccountBalances<
  T extends Pick<Transaction, "accountId" | "amountCents" | "occurredAt" | "type">,
>(transactions: T[]): Map<string, number> {
  const groupedTransactions = new Map<string, T[]>();

  for (const transaction of transactions) {
    const existing = groupedTransactions.get(transaction.accountId) ?? [];
    existing.push(transaction);
    groupedTransactions.set(transaction.accountId, existing);
  }

  const balances = new Map<string, number>();

  for (const [accountId, accountTransactions] of groupedTransactions) {
    balances.set(accountId, estimateTfsaBalance(accountTransactions));
  }

  return balances;
}

export function buildDashboardSummary(input: {
  asOf?: Date;
  annualLimits: AnnualLimit[];
  settings: Pick<UserSettings, "startingContributionRoomCents" | "startingYear">;
  transactions: TfsaCalculationTransaction[];
}) {
  const estimate = estimateTfsaContributionRoom({
    asOf: input.asOf ?? new Date(),
    annualLimits: input.annualLimits,
    transactions: input.transactions,
    settings: input.settings,
  });

  const totalTfsaBalanceCents = estimateTfsaBalance(
    input.transactions.map((transaction) => ({
      amountCents: transaction.amountCents,
      occurredAt:
        transaction.occurredAt instanceof Date
          ? transaction.occurredAt
          : new Date(transaction.occurredAt),
      type: transaction.type as TransactionType,
    })),
  );

  const warningLevel =
    estimate.availableContributionRoomCents < 0
      ? "over"
      : estimate.availableContributionRoomCents < 50000
        ? "low"
        : "safe";

  return {
    estimatedContributionRoomCents: estimate.availableContributionRoomCents,
    contributionsThisYearCents: estimate.contributionsThisYearCents,
    withdrawalsThisYearCents: estimate.withdrawalsThisYearCents,
    totalTfsaBalanceCents,
    isOvercontributed: estimate.isOvercontributed,
    warningLevel,
  } satisfies DashboardSummary;
}
