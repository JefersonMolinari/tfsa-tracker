"use client";

import { Fragment, useState } from "react";

import { Field, IconButton, SecondaryButton, TextArea } from "@/components/ui";
import { formatCents } from "@/lib/format";

type AccountRow = {
  id: string;
  name: string;
  institution: string;
  notes: string | null;
  balanceCents: number;
  transactionCount: number;
};

type AccountAction = (formData: FormData) => void | Promise<void>;

export function AccountsTable({
  accounts,
  updateAccountAction,
  deleteAccountAction,
  initialExpandedAccountId,
}: {
  accounts: AccountRow[];
  updateAccountAction: AccountAction;
  deleteAccountAction: AccountAction;
  initialExpandedAccountId?: string;
}) {
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(
    initialExpandedAccountId ?? null,
  );

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-slate-100/90 text-sm uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-4 font-medium" scope="col">
                Name
              </th>
              <th className="px-4 py-4 font-medium" scope="col">
                Institution
              </th>
              <th className="px-4 py-4 font-medium" scope="col">
                Balance
              </th>
              <th className="px-4 py-4 font-medium" scope="col">
                Transactions
              </th>
              <th className="px-4 py-4" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white/90">
            {accounts.map((account) => {
              const isExpanded = expandedAccountId === account.id;

              return (
                <Fragment key={account.id}>
                  <tr className={isExpanded ? "bg-emerald-50/50" : "hover:bg-slate-50/80"}>
                    <td className="px-4 py-4 align-middle text-sm font-medium text-slate-950">
                      {account.name}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-slate-600">
                      {account.institution}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm font-semibold text-slate-950">
                      {formatCents(account.balanceCents)}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-slate-600">
                      {account.transactionCount}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex justify-end gap-2">
                        <IconButton
                          label={isExpanded ? "Close account editor" : "Edit account"}
                          onClick={() =>
                            setExpandedAccountId((currentId) =>
                              currentId === account.id ? null : account.id,
                            )
                          }
                          type="button"
                        >
                          <EditIcon />
                        </IconButton>
                        <form action={deleteAccountAction}>
                          <input name="accountId" type="hidden" value={account.id} />
                          <IconButton label="Delete account" tone="danger" type="submit">
                            <DeleteIcon />
                          </IconButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="bg-emerald-50/50">
                      <td className="px-4 pb-5 pt-1" colSpan={5}>
                        <form action={updateAccountAction} className="grid gap-4">
                          <input name="accountId" type="hidden" value={account.id} />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field defaultValue={account.name} label="Name" name="name" required />
                            <Field
                              defaultValue={account.institution}
                              label="Institution"
                              name="institution"
                              required
                            />
                          </div>
                          <TextArea
                            defaultValue={account.notes}
                            label="Notes"
                            name="notes"
                            rows={3}
                          />
                          <div className="flex flex-wrap gap-3">
                            <SecondaryButton>Save changes</SecondaryButton>
                            <IconButton
                              label="Close account editor"
                              onClick={() => setExpandedAccountId(null)}
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
      <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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
