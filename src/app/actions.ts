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
  startingYear: z.coerce.number().int().min(2009).max(2100),
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

  const rows = parseTransactionsCsvImport(await file.text());
  const accountsById = new Map(
    rows.map((row) => [
      row.accountId,
      {
        id: row.accountId,
        name: row.accountName,
        institution: row.institution,
      },
    ]),
  );

  await db.$transaction(async (tx) => {
    for (const account of accountsById.values()) {
      await tx.account.upsert({
        where: { id: account.id },
        update: {
          name: account.name,
          institution: account.institution,
        },
        create: {
          id: account.id,
          name: account.name,
          institution: account.institution,
        },
      });
    }

    for (const row of rows) {
      await tx.transaction.upsert({
        where: { id: row.transactionId },
        update: {
          accountId: row.accountId,
          type: row.type,
          amountCents: row.amountCents,
          occurredAt: row.occurredAt,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        create: {
          id: row.transactionId,
          accountId: row.accountId,
          type: row.type,
          amountCents: row.amountCents,
          occurredAt: row.occurredAt,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
    }
  });

  revalidateAppPages();
  redirect(`/transactions?imported=${rows.length}`);
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
