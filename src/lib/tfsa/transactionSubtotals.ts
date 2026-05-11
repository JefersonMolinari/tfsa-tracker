import type { TransactionType } from "@prisma/client";

import { transactionTypes } from "@/lib/tfsa/transactionTypes";

const GRAND_TOTAL_NEGATIVE_TYPES = new Set<TransactionType>(["WITHDRAWAL"]);

export type TransactionSubtotal = {
  type: TransactionType;
  amountCents: number;
};

export function buildTransactionSubtotals(
  transactions: Array<{ type: TransactionType; amountCents: number }>,
) {
  const totals = new Map<TransactionType, number>();
  let grandTotalCents = 0;

  for (const transaction of transactions) {
    grandTotalCents += GRAND_TOTAL_NEGATIVE_TYPES.has(transaction.type)
      ? -transaction.amountCents
      : transaction.amountCents;
    totals.set(transaction.type, (totals.get(transaction.type) ?? 0) + transaction.amountCents);
  }

  const subtotals: TransactionSubtotal[] = transactionTypes
    .filter((type) => totals.has(type))
    .map((type) => ({
      type,
      amountCents: totals.get(type) ?? 0,
    }));

  return {
    grandTotalCents,
    subtotals,
  };
}
