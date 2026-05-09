"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TransactionType, type Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  getOptionalString,
  getString,
  parseCurrencyInputToCents,
  parseDateInput,
} from "@/lib/forms";
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

export async function createAccount(formData: FormData) {
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
  const input = getTransactionInput(formData);

  await db.transaction.create({
    data: input,
  });

  revalidateAppPages();
  redirect("/transactions");
}

export async function updateTransaction(formData: FormData) {
  const transactionId = getString(formData, "transactionId");
  const input = getTransactionInput(formData);

  await db.transaction.update({
    where: { id: transactionId },
    data: input,
  });

  revalidateAppPages();
  redirect("/transactions");
}

export async function deleteTransaction(formData: FormData) {
  const transactionId = getString(formData, "transactionId");

  await db.transaction.delete({
    where: { id: transactionId },
  });

  revalidateAppPages();
  redirect("/transactions");
}

export async function saveSettings(formData: FormData) {
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
