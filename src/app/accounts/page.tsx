import { createAccount, deleteAccount, updateAccount } from "@/app/actions";
import {
  Card,
  DangerButton,
  EmptyState,
  Field,
  PageIntro,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  TextArea,
} from "@/components/ui";
import { formatCents } from "@/lib/format";
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
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/60 p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-950">{account.name}</h3>
                      <p className="text-sm text-slate-600">{account.institution}</p>
                    </div>
                    <div className="flex flex-col items-start gap-1 text-sm md:items-end">
                      <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
                        Balance {formatCents(balances.get(account.id) ?? 0)}
                      </span>
                      <span className="text-slate-500">
                        {account._count.transactions} transactions
                      </span>
                    </div>
                  </div>

                  {account.notes ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{account.notes}</p>
                  ) : null}

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
                    <form action={updateAccount} className="grid gap-4">
                      <input name="accountId" type="hidden" value={account.id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          defaultValue={account.name}
                          label="Name"
                          name="name"
                          required
                        />
                        <Field
                          defaultValue={account.institution}
                          label="Institution"
                          name="institution"
                          required
                        />
                      </div>
                      <TextArea defaultValue={account.notes} label="Notes" name="notes" rows={3} />
                      <div>
                        <SecondaryButton>Save changes</SecondaryButton>
                      </div>
                    </form>

                    <form action={deleteAccount} className="self-end">
                      <input name="accountId" type="hidden" value={account.id} />
                      <DangerButton>Delete account</DangerButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
