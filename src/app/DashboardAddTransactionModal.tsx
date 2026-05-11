"use client";

import { useState } from "react";

import Link from "next/link";
import type { TransactionType } from "@prisma/client";

import { EmptyState, Field, IconButton, PrimaryButton, SelectField, TextArea } from "@/components/ui";
import { transactionTypeLabels, transactionTypes } from "@/lib/tfsa/transactionTypes";

type TransactionAction = (formData: FormData) => void | Promise<void>;

type AccountOption = {
  label: string;
  value: string;
};

export function DashboardAddTransactionModal({
  accountOptions,
  createTransactionAction,
  initialOpen = false,
}: {
  accountOptions: AccountOption[];
  createTransactionAction: TransactionAction;
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <>
      <button
        className="inline-flex rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Add transaction
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8"
          onClick={() => setIsOpen(false)}
        >
          <div
            aria-modal="true"
            className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.24)] backdrop-blur"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-serif text-2xl tracking-tight text-slate-950">
                  Add transaction
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Record TFSA activity without leaving the Dashboard. Amounts are entered
                  in dollars and stored as integer cents.
                </p>
              </div>
              <IconButton
                label="Close add transaction modal"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <CloseIcon />
              </IconButton>
            </div>

            {accountOptions.length === 0 ? (
              <div className="space-y-4">
                <EmptyState
                  title="Create an account first"
                  description="Transactions belong to accounts, so add at least one TFSA account before recording activity here."
                />
                <Link
                  className="inline-flex rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
                  href="/accounts"
                >
                  Go to accounts
                </Link>
              </div>
            ) : (
              <form action={createTransactionAction} className="grid gap-4">
                <input name="redirectTo" type="hidden" value="/" />
                <SelectField
                  label="Account"
                  name="accountId"
                  options={accountOptions}
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Transaction type"
                    name="type"
                    options={buildTransactionTypeOptions()}
                    required
                  />
                  <Field label="Date" name="occurredAt" required type="date" />
                </div>
                <Field
                  label="Amount (CAD)"
                  name="amount"
                  placeholder="2000.00"
                  required
                  step="0.01"
                  type="number"
                />
                <TextArea
                  label="Notes"
                  name="notes"
                  placeholder="Optional details about the transaction."
                />
                <div>
                  <PrimaryButton>Add transaction</PrimaryButton>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function buildTransactionTypeOptions() {
  return [
    { label: "Choose a type", value: "" },
    ...transactionTypes.map((type: TransactionType) => ({
      label: transactionTypeLabels[type],
      value: type,
    })),
  ];
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
