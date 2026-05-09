export type TfsaTransactionType =
  | "CONTRIBUTION"
  | "WITHDRAWAL"
  | "QUALIFYING_TRANSFER"
  | "FEE"
  | "DIVIDEND"
  | "INTEREST"
  | "MARKET_ADJUSTMENT"
  | "BALANCE_SNAPSHOT";

export type TfsaAnnualLimit = {
  year: number;
  limitCents: number;
};

export type TfsaCalculationTransaction = {
  occurredAt: Date | string;
  type: TfsaTransactionType;
  amountCents: number;
};

export type TfsaUserSettings = {
  startingYear: number;
  startingContributionRoomCents: number;
};

export type TfsaContributionRoomEstimate = {
  asOf: Date;
  availableContributionRoomCents: number;
  contributionsThisYearCents: number;
  withdrawalsThisYearCents: number;
  restoredFromPriorYearWithdrawalsCents: number;
  annualLimitThisYearCents: number;
  isOvercontributed: boolean;
};

const CONTRIBUTION_TYPE = "CONTRIBUTION";
const WITHDRAWAL_TYPE = "WITHDRAWAL";

function getUtcYear(date: Date): number {
  return date.getUTCFullYear();
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of cents.`);
  }
}

export function estimateTfsaContributionRoom(input: {
  asOf: Date | string;
  annualLimits: TfsaAnnualLimit[];
  transactions: TfsaCalculationTransaction[];
  settings: TfsaUserSettings;
}): TfsaContributionRoomEstimate {
  const asOf = toDate(input.asOf);

  if (Number.isNaN(asOf.getTime())) {
    throw new Error("asOf must be a valid date.");
  }

  const startingYearStart = new Date(Date.UTC(input.settings.startingYear, 0, 1));
  if (asOf < startingYearStart) {
    throw new Error("asOf cannot be before the configured starting year.");
  }

  assertNonNegativeInteger(
    input.settings.startingContributionRoomCents,
    "startingContributionRoomCents",
  );

  const annualLimitByYear = new Map<number, number>();
  for (const limit of input.annualLimits) {
    assertNonNegativeInteger(limit.limitCents, `annual limit for ${limit.year}`);
    annualLimitByYear.set(limit.year, limit.limitCents);
  }

  const transactions = input.transactions
    .map((transaction) => ({
      ...transaction,
      occurredAt: toDate(transaction.occurredAt),
    }))
    .map((transaction) => {
      if (Number.isNaN(transaction.occurredAt.getTime())) {
        throw new Error("Transactions must use valid dates.");
      }

      return transaction;
    })
    .filter((transaction) => getUtcYear(transaction.occurredAt) >= input.settings.startingYear)
    .filter((transaction) => transaction.occurredAt <= asOf)
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

  for (const transaction of transactions) {
    assertNonNegativeInteger(
      transaction.amountCents,
      `${transaction.type} transaction amount`,
    );
  }

  const asOfYear = getUtcYear(asOf);
  const withdrawalsByYear = new Map<number, number>();
  const contributionsByYear = new Map<number, number>();

  for (const transaction of transactions) {
    const year = getUtcYear(transaction.occurredAt);

    if (transaction.type === WITHDRAWAL_TYPE) {
      withdrawalsByYear.set(year, (withdrawalsByYear.get(year) ?? 0) + transaction.amountCents);
    }

    if (transaction.type === CONTRIBUTION_TYPE) {
      contributionsByYear.set(
        year,
        (contributionsByYear.get(year) ?? 0) + transaction.amountCents,
      );
    }
  }

  let availableContributionRoomCents = input.settings.startingContributionRoomCents;
  let contributionsThisYearCents = 0;
  let withdrawalsThisYearCents = 0;
  for (let year = input.settings.startingYear; year <= asOfYear; year += 1) {
    const annualLimit = annualLimitByYear.get(year);
    if (annualLimit === undefined) {
      throw new Error(`Missing annual limit for year ${year}.`);
    }

    availableContributionRoomCents += annualLimit;

    if (year > input.settings.startingYear) {
      availableContributionRoomCents += withdrawalsByYear.get(year - 1) ?? 0;
    }

    const yearContributions = contributionsByYear.get(year) ?? 0;
    const yearWithdrawals = withdrawalsByYear.get(year) ?? 0;

    availableContributionRoomCents -= yearContributions;

    if (year === asOfYear) {
      contributionsThisYearCents = yearContributions;
      withdrawalsThisYearCents = yearWithdrawals;
    }
  }

  return {
    asOf,
    availableContributionRoomCents,
    contributionsThisYearCents,
    withdrawalsThisYearCents,
    restoredFromPriorYearWithdrawalsCents:
      asOfYear > input.settings.startingYear ? withdrawalsByYear.get(asOfYear - 1) ?? 0 : 0,
    annualLimitThisYearCents: annualLimitByYear.get(asOfYear) ?? 0,
    isOvercontributed: availableContributionRoomCents < 0,
  };
}
