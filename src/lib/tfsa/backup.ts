import { z } from "zod";

import { TransactionType } from "@/generated/prisma/client";
import {
  MAX_TFSA_STARTING_YEAR,
  MIN_TFSA_STARTING_YEAR,
  isValidTfsaTransactionAmount,
} from "./domainRules";
import {
  MAX_TFSA_IMPORT_ACCOUNTS,
  MAX_TFSA_IMPORT_BYTES,
  MAX_TFSA_IMPORT_TRANSACTIONS,
} from "./importLimits";

export const MAX_TFSA_BACKUP_BYTES = MAX_TFSA_IMPORT_BYTES;

const isoTimestampSchema = z.string().datetime({ offset: true });

const settingsSchema = z
  .object({
    id: z.literal(1),
    startingYear: z
      .number()
      .int()
      .min(MIN_TFSA_STARTING_YEAR)
      .max(MAX_TFSA_STARTING_YEAR),
    startingContributionRoomCents: z.number().int().nonnegative(),
    contributionRoomNotes: z.string().nullable(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .strict();

const accountSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    institution: z.string(),
    notes: z.string().nullable(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .strict();

const transactionSchema = z
  .object({
    id: z.string(),
    accountId: z.string(),
    type: z.enum(TransactionType),
    amountCents: z.number().int(),
    occurredAt: isoTimestampSchema,
    notes: z.string().nullable(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .strict()
  .refine(
    (transaction) =>
      isValidTfsaTransactionAmount(
        transaction.type,
        transaction.amountCents,
      ),
    {
      message: "Transaction amount is invalid for its type.",
      path: ["amountCents"],
    },
  );

const tfsaBackupV1Schema = z
  .object({
    version: z.literal(1),
    settings: settingsSchema.nullable(),
    accounts: z.array(accountSchema).max(MAX_TFSA_IMPORT_ACCOUNTS),
    transactions: z.array(transactionSchema).max(MAX_TFSA_IMPORT_TRANSACTIONS),
  })
  .strict()
  .superRefine((backup, context) => {
    const accountIds = new Set(backup.accounts.map((account) => account.id));

    backup.transactions.forEach((transaction, index) => {
      if (!accountIds.has(transaction.accountId)) {
        context.addIssue({
          code: "custom",
          message: `Transaction references missing account ${transaction.accountId}.`,
          path: ["transactions", index, "accountId"],
        });
      }
    });
  });

export type TfsaBackupV1 = z.infer<typeof tfsaBackupV1Schema>;

export type TfsaBackupSource = {
  settings: {
    id: number;
    startingYear: number;
    startingContributionRoomCents: number;
    contributionRoomNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  accounts: Array<{
    id: string;
    name: string;
    institution: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  transactions: Array<{
    id: string;
    accountId: string;
    type: TransactionType;
    amountCents: number;
    occurredAt: Date;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export function validateTfsaBackup(value: unknown): TfsaBackupV1 {
  return tfsaBackupV1Schema.parse(value);
}

export function parseTfsaBackup(json: string): TfsaBackupV1 {
  if (new TextEncoder().encode(json).byteLength > MAX_TFSA_BACKUP_BYTES) {
    throw new Error("TFSA backup must be 5 MiB or smaller.");
  }

  return validateTfsaBackup(JSON.parse(json) as unknown);
}

export function serializeTfsaBackup(source: TfsaBackupSource): string {
  const backup = validateTfsaBackup({
    version: 1,
    settings: source.settings
      ? {
          ...source.settings,
          createdAt: source.settings.createdAt.toISOString(),
          updatedAt: source.settings.updatedAt.toISOString(),
        }
      : null,
    accounts: source.accounts.map((account) => ({
      ...account,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    })),
    transactions: source.transactions.map((transaction) => ({
      ...transaction,
      occurredAt: transaction.occurredAt.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    })),
  });

  return JSON.stringify(backup, null, 2);
}
