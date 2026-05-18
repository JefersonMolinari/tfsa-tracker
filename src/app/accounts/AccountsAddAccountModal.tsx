"use client";

import { useState } from "react";

import { Field, IconButton, PrimaryButton, TextArea } from "@/components/ui";

type AccountAction = (formData: FormData) => void | Promise<void>;

export function AccountsAddAccountModal({
  createAccountAction,
  initialOpen = false,
}: {
  createAccountAction: AccountAction;
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
        Add account
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
                  Add account
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Use one account per TFSA container you want to track.
                </p>
              </div>
              <IconButton
                label="Close add account modal"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <CloseIcon />
              </IconButton>
            </div>

            <form action={createAccountAction} className="grid gap-4">
              <Field
                label="Account name"
                name="name"
                placeholder="Self-directed TFSA"
                required
              />
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
          </div>
        </div>
      ) : null}
    </>
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
