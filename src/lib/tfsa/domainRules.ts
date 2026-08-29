import type { TransactionType } from "@/generated/prisma/client";

import { allowsNegativeAmount } from "./transactionTypes";

export const MIN_TFSA_STARTING_YEAR = 2009;
export const MAX_TFSA_STARTING_YEAR = 2100;

export function isValidTfsaTransactionAmount(
  type: TransactionType,
  amountCents: number,
) {
  return amountCents >= 0 || allowsNegativeAmount(type);
}
