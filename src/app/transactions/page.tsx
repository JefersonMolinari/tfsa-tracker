import type { TransactionType } from "@/generated/prisma/client";

import Link from "next/link";

import {
  createTransaction,
  deleteTransaction,
  importTransactionsCsv,
  updateTransaction,
} from "@/app/actions";
import { DashboardAddTransactionModal } from "@/app/DashboardAddTransactionModal";
import { TransactionsImportButton } from "@/app/transactions/TransactionsImportButton";
import { TransactionsTable } from "@/app/transactions/TransactionsTable";
import {
  Card,
  EmptyState,
  PageIntro,
  PrimaryButton,
  SectionTitle,
  SelectField,
} from "@/components/ui";
import { formatCents } from "@/lib/format";
import { requireSession } from "@/lib/auth/session";
import { getTransactionsPageData } from "@/lib/tfsa/data";
import { buildTransactionSubtotals } from "@/lib/tfsa/transactionSubtotals";
import { transactionTypeLabels, transactionTypes } from "@/lib/tfsa/transactionTypes";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  accountId?: string;
  imported?: string;
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

function buildTransactionsPath(filters: {
  accountId?: string;
  year?: string;
  type?: string;
}) {
  const params = new URLSearchParams();

  if (filters.accountId) {
    params.set("accountId", filters.accountId);
  }

  if (filters.year) {
    params.set("year", filters.year);
  }

  if (filters.type) {
    params.set("type", filters.type);
  }

  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSession();
  const filters = await searchParams;
  const accountId = filters.accountId || undefined;
  const importedCount = filters.imported ? Number(filters.imported) : undefined;
  const hasImportStatus =
    importedCount !== undefined && Number.isInteger(importedCount) && importedCount >= 0;
  const year = filters.year ? Number(filters.year) : undefined;
  const type = filters.type ? (filters.type as TransactionType) : undefined;

  const { accounts, transactions } = await getTransactionsPageData({
    accountId,
    year: Number.isFinite(year) ? year : undefined,
    type,
  });
  const redirectTo = buildTransactionsPath(filters);
  const subtotalSummary = buildTransactionSubtotals(transactions);

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
  const transactionAccountOptions = accountOptions.filter((option) => option.value !== "");

  return (
    <div className="space-y-6">
      <PageIntro
        title="Transactions"
        description="Record contributions, withdrawals, transfers, fees, and balance events. Filters let you focus on one slice at a time."
        aside={
          <div className="flex flex-wrap gap-3">
            <DashboardAddTransactionModal
              accountOptions={transactionAccountOptions}
              createTransactionAction={createTransaction}
              modalDescription="Record TFSA activity without leaving Transactions. Amounts are entered in dollars and stored as integer cents."
              redirectTo={redirectTo}
            />
            <Link
              href="/transactions/export"
              className="inline-flex rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
            >
              Export
            </Link>
            <TransactionsImportButton importAction={importTransactionsCsv} />
          </div>
        }
      />

      {hasImportStatus ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-900">
          Imported {importedCount} transaction{importedCount === 1 ? "" : "s"} from CSV.
        </div>
      ) : null}

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

      <Card>
        <SectionTitle
          title="Transaction list"
          description="Review filtered activity in a compact table, edit rows inline, and keep subtotal math consistent across the page."
        />

        {transactions.length === 0 ? (
          <EmptyState
            title="No matching transactions"
            description="Add a transaction or widen your filters to see TFSA activity here."
          />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800/80">
                  Filtered total
                </p>
                <p className="mt-3 font-serif text-3xl tracking-tight text-slate-950">
                  {formatCents(subtotalSummary.grandTotalCents)}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Subtotals by type
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {subtotalSummary.subtotals.map((subtotal) => (
                    <div
                      key={subtotal.type}
                      className="rounded-full border border-white/70 bg-white px-4 py-2 text-sm text-slate-700"
                    >
                      <span className="font-medium text-slate-900">
                        {transactionTypeLabels[subtotal.type]}
                      </span>{" "}
                      <span>{formatCents(subtotal.amountCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <TransactionsTable
              accountOptions={transactionAccountOptions}
              deleteTransactionAction={deleteTransaction}
              redirectTo={redirectTo}
              transactions={transactions.map((transaction) => ({
                id: transaction.id,
                accountId: transaction.accountId,
                accountLabel: `${transaction.account.name} · ${transaction.account.institution}`,
                type: transaction.type,
                amountCents: transaction.amountCents,
                occurredAt: transaction.occurredAt.toISOString(),
                notes: transaction.notes,
              }))}
              updateTransactionAction={updateTransaction}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
