"use client";

import { Fragment, useState } from "react";
import type { TransactionType } from "@prisma/client";

import {
  Field,
  IconButton,
  SecondaryButton,
  SelectField,
  TextArea,
} from "@/components/ui";
import { formatCents, formatDate, formatDateInput } from "@/lib/format";
import { transactionTypeLabels, transactionTypes } from "@/lib/tfsa/transactionTypes";

type TransactionRow = {
  id: string;
  accountId: string;
  accountLabel: string;
  type: TransactionType;
  amountCents: number;
  occurredAt: string;
  notes: string | null;
};

type TransactionAction = (formData: FormData) => void | Promise<void>;

export function TransactionsTable({
  accountOptions,
  redirectTo,
  transactions,
  updateTransactionAction,
  deleteTransactionAction,
  initialExpandedTransactionId,
}: {
  accountOptions: Array<{ label: string; value: string }>;
  redirectTo: string;
  transactions: TransactionRow[];
  updateTransactionAction: TransactionAction;
  deleteTransactionAction: TransactionAction;
  initialExpandedTransactionId?: string;
}) {
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(
    initialExpandedTransactionId ?? null,
  );

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-slate-100/90 text-sm uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-4 font-medium" scope="col">
                Account
              </th>
              <th className="px-4 py-4 font-medium" scope="col">
                Type
              </th>
              <th className="px-4 py-4 font-medium" scope="col">
                Amount (CAD)
              </th>
              <th className="px-4 py-4 font-medium" scope="col">
                Date
              </th>
              <th className="px-4 py-4" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white/90">
            {transactions.map((transaction) => {
              const isExpanded = expandedTransactionId === transaction.id;
              const occurredAt = new Date(transaction.occurredAt);

              return (
                <Fragment key={transaction.id}>
                  <tr
                    className={isExpanded ? "bg-emerald-50/50" : "hover:bg-slate-50/80"}
                  >
                    <td className="px-4 py-4 align-middle text-sm font-medium text-slate-950">
                      {transaction.accountLabel}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-slate-600">
                      {transactionTypeLabels[transaction.type]}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm font-semibold text-slate-950">
                      {formatCents(transaction.amountCents)}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-slate-600">
                      {formatDate(occurredAt)}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex justify-end gap-2">
                        <IconButton
                          label={
                            isExpanded ? "Close transaction editor" : "Edit transaction"
                          }
                          onClick={() =>
                            setExpandedTransactionId((currentId) =>
                              currentId === transaction.id ? null : transaction.id,
                            )
                          }
                          type="button"
                        >
                          <EditIcon />
                        </IconButton>
                        <form action={deleteTransactionAction}>
                          <input name="transactionId" type="hidden" value={transaction.id} />
                          <input name="redirectTo" type="hidden" value={redirectTo} />
                          <IconButton label="Delete transaction" tone="danger" type="submit">
                            <DeleteIcon />
                          </IconButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="bg-emerald-50/50">
                      <td className="px-4 pb-5 pt-1" colSpan={5}>
                        <form action={updateTransactionAction} className="grid gap-4">
                          <input name="transactionId" type="hidden" value={transaction.id} />
                          <input name="redirectTo" type="hidden" value={redirectTo} />
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <SelectField
                              defaultValue={transaction.accountId}
                              label="Account"
                              name="accountId"
                              options={accountOptions}
                              required
                            />
                            <SelectField
                              defaultValue={transaction.type}
                              label="Type"
                              name="type"
                              options={buildTransactionTypeOptions()}
                              required
                            />
                            <Field
                              defaultValue={formatDateInput(occurredAt)}
                              label="Date"
                              name="occurredAt"
                              required
                              type="date"
                            />
                            <Field
                              defaultValue={(transaction.amountCents / 100).toString()}
                              label="Amount (CAD)"
                              name="amount"
                              required
                              step="0.01"
                              type="number"
                            />
                          </div>
                          <TextArea
                            defaultValue={transaction.notes}
                            label="Notes"
                            name="notes"
                            rows={3}
                          />
                          <div className="flex flex-wrap gap-3">
                            <SecondaryButton>Save changes</SecondaryButton>
                            <IconButton
                              label="Close transaction editor"
                              onClick={() => setExpandedTransactionId(null)}
                              type="button"
                            >
                              <CloseIcon />
                            </IconButton>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildTransactionTypeOptions() {
  return transactionTypes.map((type) => ({
    label: transactionTypeLabels[type],
    value: type,
  }));
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 7V4h6v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M7 7l1 12h8l1-12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M10 11v5M14 11v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
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
