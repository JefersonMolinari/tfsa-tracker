"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { TransactionType, type Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import {
  getOptionalString,
  getString,
  parseCurrencyInputToCents,
  parseDateInput,
} from "@/lib/forms";
import { parseTfsaBackup } from "@/lib/tfsa/backup";
import { importTfsaBackup } from "@/lib/tfsa/backupPersistence";
import {
  MAX_TFSA_STARTING_YEAR,
  MIN_TFSA_STARTING_YEAR,
} from "@/lib/tfsa/domainRules";
import { MAX_TFSA_IMPORT_BYTES } from "@/lib/tfsa/importLimits";
import { importTransactionsCsvRows } from "@/lib/tfsa/importPersistence";
import { parseTransactionsCsvImport } from "@/lib/tfsa/importTransactionsCsv";
import { allowsNegativeAmount } from "@/lib/tfsa/transactionTypes";

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required."),
  institution: z.string().min(1, "Institution is required."),
  notes: z.string().optional(),
});

const transactionSchema = z.object({
  accountId: z.string().min(1, "Account is required."),
  type: z.nativeEnum(TransactionType),
  occurredAt: z.string().min(1, "Date is required."),
  amount: z.string().min(1, "Amount is required."),
  notes: z.string().optional(),
});

const settingsSchema = z.object({
  startingYear: z.coerce
    .number()
    .int()
    .min(MIN_TFSA_STARTING_YEAR)
    .max(MAX_TFSA_STARTING_YEAR),
  startingContributionRoom: z.string().min(1),
  contributionRoomNotes: z.string().optional(),
});

function revalidateAppPages() {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/settings");
}

function redirectToPath(formData: FormData, fallbackPath: string) {
  return getOptionalString(formData, "redirectTo") ?? fallbackPath;
}

export async function createAccount(formData: FormData) {
  await requireSession();
  const parsed = accountSchema.parse({
    name: getString(formData, "name"),
    institution: getString(formData, "institution"),
    notes: getString(formData, "notes"),
  });

  await db.account.create({
    data: {
      name: parsed.name,
      institution: parsed.institution,
      notes: parsed.notes || null,
    },
  });

  revalidateAppPages();
  redirect("/accounts");
}

export async function updateAccount(formData: FormData) {
  await requireSession();
  const accountId = getString(formData, "accountId");
  const parsed = accountSchema.parse({
    name: getString(formData, "name"),
    institution: getString(formData, "institution"),
    notes: getString(formData, "notes"),
  });

  await db.account.update({
    where: { id: accountId },
    data: {
      name: parsed.name,
      institution: parsed.institution,
      notes: parsed.notes || null,
    },
  });

  revalidateAppPages();
  redirect("/accounts");
}

export async function deleteAccount(formData: FormData) {
  await requireSession();
  const accountId = getString(formData, "accountId");

  await db.account.delete({
    where: { id: accountId },
  });

  revalidateAppPages();
  redirect("/accounts");
}

function getTransactionInput(formData: FormData): Prisma.TransactionUncheckedCreateInput {
  const parsed = transactionSchema.parse({
    accountId: getString(formData, "accountId"),
    type: getString(formData, "type"),
    occurredAt: getString(formData, "occurredAt"),
    amount: getString(formData, "amount"),
    notes: getString(formData, "notes"),
  });

  const amountCents = parseCurrencyInputToCents(parsed.amount, {
    allowNegative: allowsNegativeAmount(parsed.type),
  });

  return {
    accountId: parsed.accountId,
    type: parsed.type,
    occurredAt: parseDateInput(parsed.occurredAt),
    amountCents,
    notes: parsed.notes || null,
  };
}

export async function createTransaction(formData: FormData) {
  await requireSession();
  const input = getTransactionInput(formData);

  await db.transaction.create({
    data: input,
  });

  revalidateAppPages();
  redirect(redirectToPath(formData, "/transactions"));
}

export async function updateTransaction(formData: FormData) {
  await requireSession();
  const transactionId = getString(formData, "transactionId");
  const input = getTransactionInput(formData);

  await db.transaction.update({
    where: { id: transactionId },
    data: input,
  });

  revalidateAppPages();
  redirect(redirectToPath(formData, "/transactions"));
}

export async function deleteTransaction(formData: FormData) {
  await requireSession();
  const transactionId = getString(formData, "transactionId");

  await db.transaction.delete({
    where: { id: transactionId },
  });

  revalidateAppPages();
  redirect(redirectToPath(formData, "/transactions"));
}

export async function importTransactionsCsv(formData: FormData) {
  await requireSession();
  const file = formData.get("transactionsCsv");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a transactions CSV exported from this app.");
  }

  if (file.size > MAX_TFSA_IMPORT_BYTES) {
    throw new Error("Transactions CSV must be 5 MiB or smaller.");
  }

  const rows = parseTransactionsCsvImport(await file.text());
  await importTransactionsCsvRows(rows);

  revalidateAppPages();
  redirect(`/transactions?imported=${rows.length}`);
}

export async function importTfsaBackupAction(formData: FormData) {
  await requireSession();
  const file = formData.get("backupFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a full-backup JSON file exported from this app.");
  }

  const backup = parseTfsaBackup(await file.text());
  await importTfsaBackup(backup);

  revalidateAppPages();
  redirect("/settings?backupImported=1");
}

export async function saveSettings(formData: FormData) {
  await requireSession();
  const parsed = settingsSchema.parse({
    startingYear: getString(formData, "startingYear"),
    startingContributionRoom: getString(formData, "startingContributionRoom"),
    contributionRoomNotes: getString(formData, "contributionRoomNotes"),
  });

  await db.userSettings.upsert({
    where: { id: 1 },
    update: {
      startingYear: parsed.startingYear,
      startingContributionRoomCents: parseCurrencyInputToCents(
        parsed.startingContributionRoom,
      ),
      contributionRoomNotes: getOptionalString(formData, "contributionRoomNotes"),
    },
    create: {
      id: 1,
      startingYear: parsed.startingYear,
      startingContributionRoomCents: parseCurrencyInputToCents(
        parsed.startingContributionRoom,
      ),
      contributionRoomNotes: getOptionalString(formData, "contributionRoomNotes"),
    },
  });

  revalidateAppPages();
  redirect("/settings");
}
