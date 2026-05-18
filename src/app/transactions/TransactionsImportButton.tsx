"use client";

import { useRef } from "react";

export function TransactionsImportButton({
  importAction,
}: {
  importAction: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={importAction} ref={formRef}>
      <input
        accept=".csv,text/csv"
        className="sr-only"
        name="transactionsCsv"
        onChange={() => formRef.current?.requestSubmit()}
        ref={inputRef}
        required
        tabIndex={-1}
        type="file"
      />
      <button
        className="inline-flex rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        Import
      </button>
    </form>
  );
}
