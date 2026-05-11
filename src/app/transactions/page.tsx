import type { TransactionType } from "@prisma/client";

import Link from "next/link";

import { createTransaction, deleteTransaction, updateTransaction } from "@/app/actions";
import {
  Card,
  DangerButton,
  EmptyState,
  Field,
  PageIntro,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  SelectField,
  TextArea,
} from "@/components/ui";
import { formatCents, formatDate, formatDateInput } from "@/lib/format";
import { getTransactionsPageData } from "@/lib/tfsa/data";
import { transactionTypeLabels, transactionTypes } from "@/lib/tfsa/transactionTypes";

type SearchParams = Promise<{
  accountId?: string;
  year?: string;
  type?: string;
}>;

function buildTransactionTypeOptions() {
  return [
    { label: "Choose a type", value: "" },
    ...transactionTypes.map((type) => ({
      label: transactionTypeLabels[type],
      value: type,
    })),
  ];
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = await searchParams;
  const accountId = filters.accountId || undefined;
  const year = filters.year ? Number(filters.year) : undefined;
  const type = filters.type ? (filters.type as TransactionType) : undefined;

  const { accounts, transactions } = await getTransactionsPageData({
    accountId,
    year: Number.isFinite(year) ? year : undefined,
    type,
  });

  const availableYears = Array.from(
    new Set(transactions.map((transaction) => transaction.occurredAt.getUTCFullYear())),
  ).sort((left, right) => right - left);

  const accountOptions = [
    { label: "All accounts", value: "" },
    ...accounts.map((account) => ({
      label: `${account.name} · ${account.institution}`,
      value: account.id,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        title="Transactions"
        description="Record contributions, withdrawals, transfers, fees, and balance events. Filters let you focus on one slice at a time."
        aside={
          <Link
            href="/transactions/export"
            className="inline-flex rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            Export CSV
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionTitle
            title="Add transaction"
            description="Amounts are entered in dollars, stored as integer cents, and used for estimates on the dashboard."
          />
          {accounts.length === 0 ? (
            <EmptyState
              title="Create an account first"
              description="Transactions belong to accounts, so add at least one account before recording TFSA activity."
            />
          ) : (
            <form action={createTransaction} className="grid gap-4">
              <SelectField
                label="Account"
                name="accountId"
                options={accountOptions.filter((option) => option.value !== "")}
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
        </Card>

        <Card>
          <SectionTitle
            title="Filter transactions"
            description="Use one or more filters to narrow the list."
          />
          <form action="/transactions" className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <SelectField
              defaultValue={accountId}
              label="Account"
              name="accountId"
              options={accountOptions}
            />
            <SelectField
              defaultValue={year ? String(year) : ""}
              label="Year"
              name="year"
              options={[
                { label: "All years", value: "" },
                ...availableYears.map((item) => ({
                  label: String(item),
                  value: String(item),
                })),
              ]}
            />
            <SelectField
              defaultValue={type}
              label="Transaction type"
              name="type"
              options={[{ label: "All types", value: "" }, ...buildTransactionTypeOptions().slice(1)]}
            />
            <div className="self-end">
              <PrimaryButton>Apply filters</PrimaryButton>
            </div>
          </form>
        </Card>
      </div>

      <Card>
        <SectionTitle
          title="Transaction list"
          description="Edit any row in place. Contribution room calculations continue to come from the shared utility."
        />

        {transactions.length === 0 ? (
          <EmptyState
            title="No matching transactions"
            description="Add a transaction or widen your filters to see TFSA activity here."
          />
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {transaction.account.name} · {transaction.account.institution}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {transactionTypeLabels[transaction.type]} on{" "}
                      {formatDate(transaction.occurredAt)}
                    </p>
                  </div>
                  <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                    {formatCents(transaction.amountCents)}
                  </div>
                </div>

                {transaction.notes ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{transaction.notes}</p>
                ) : null}

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <form action={updateTransaction} className="grid gap-4">
                    <input name="transactionId" type="hidden" value={transaction.id} />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <SelectField
                        defaultValue={transaction.accountId}
                        label="Account"
                        name="accountId"
                        options={accountOptions.filter((option) => option.value !== "")}
                        required
                      />
                      <SelectField
                        defaultValue={transaction.type}
                        label="Type"
                        name="type"
                        options={buildTransactionTypeOptions().slice(1)}
                        required
                      />
                      <Field
                        defaultValue={formatDateInput(transaction.occurredAt)}
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
                    <TextArea defaultValue={transaction.notes} label="Notes" name="notes" rows={3} />
                    <div>
                      <SecondaryButton>Save changes</SecondaryButton>
                    </div>
                  </form>

                  <form action={deleteTransaction} className="self-end">
                    <input name="transactionId" type="hidden" value={transaction.id} />
                    <DangerButton>Delete transaction</DangerButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
