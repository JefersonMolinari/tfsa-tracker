import { createAccount, deleteAccount, updateAccount } from "@/app/actions";
import { AccountsTable } from "@/app/accounts/AccountsTable";
import {
  Card,
  EmptyState,
  Field,
  PageIntro,
  PrimaryButton,
  SectionTitle,
  TextArea,
} from "@/components/ui";
import { getAppData } from "@/lib/tfsa/data";
import { calculateAccountBalances } from "@/lib/tfsa/dashboard";

export default async function AccountsPage() {
  const { accounts, transactions } = await getAppData();
  const balances = calculateAccountBalances(transactions);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div>
        <PageIntro
          title="Accounts"
          description="Keep your TFSA accounts organized with simple manual records. Deleting an account also removes its transactions."
        />

        <Card>
          <SectionTitle
            title="Add account"
            description="Use one account per TFSA container you want to track."
          />
          <form action={createAccount} className="grid gap-4">
            <Field label="Account name" name="name" placeholder="Self-directed TFSA" required />
            <Field label="Institution" name="institution" placeholder="Questrade" required />
            <TextArea
              label="Notes"
              name="notes"
              placeholder="Optional reminders, account nickname, or context."
            />
            <div>
              <PrimaryButton>Create account</PrimaryButton>
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-5">
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
    </div>
  );
}
