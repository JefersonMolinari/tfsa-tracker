import { createAccount, deleteAccount, updateAccount } from "@/app/actions";
import { AccountsAddAccountModal } from "@/app/accounts/AccountsAddAccountModal";
import { AccountsTable } from "@/app/accounts/AccountsTable";
import { Card, EmptyState, PageIntro, SectionTitle } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { getAppData } from "@/lib/tfsa/data";
import { calculateAccountBalances } from "@/lib/tfsa/dashboard";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  await requireSession();
  const { accounts, transactions } = await getAppData();
  const balances = calculateAccountBalances(transactions);

  return (
    <div className="space-y-6">
      <PageIntro
        title="Accounts"
        description="Keep your TFSA accounts organized with simple manual records. Deleting an account also removes its transactions."
        aside={<AccountsAddAccountModal createAccountAction={createAccount} />}
      />

      <Card>
        <SectionTitle
          title="Account list"
          description="Balances are estimated from recorded transactions and any balance snapshots."
        />

        {accounts.length === 0 ? (
          <EmptyState
            title="No accounts yet"
            description="Create your first TFSA account to start organizing transactions."
          />
        ) : (
          <AccountsTable
            accounts={accounts.map((account) => ({
              id: account.id,
              name: account.name,
              institution: account.institution,
              notes: account.notes,
              balanceCents: balances.get(account.id) ?? 0,
              transactionCount: account._count.transactions,
            }))}
            deleteAccountAction={deleteAccount}
            updateAccountAction={updateAccount}
          />
        )}
      </Card>
    </div>
  );
}
