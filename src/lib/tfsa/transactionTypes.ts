import type { TransactionType } from "@prisma/client";

export const transactionTypes: TransactionType[] = [
  "CONTRIBUTION",
  "WITHDRAWAL",
  "QUALIFYING_TRANSFER",
  "FEE",
  "DIVIDEND",
  "INTEREST",
  "MARKET_ADJUSTMENT",
  "BALANCE_SNAPSHOT",
];

export const transactionTypeLabels: Record<TransactionType, string> = {
  CONTRIBUTION: "Contribution",
  WITHDRAWAL: "Withdrawal",
  QUALIFYING_TRANSFER: "Qualifying transfer",
  FEE: "Fee",
  DIVIDEND: "Dividend",
  INTEREST: "Interest",
  MARKET_ADJUSTMENT: "Market adjustment",
  BALANCE_SNAPSHOT: "Balance snapshot",
};

export function allowsNegativeAmount(type: TransactionType): boolean {
  return type === "MARKET_ADJUSTMENT";
}
