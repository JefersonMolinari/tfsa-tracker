"use client";

import type { ChangeEvent, MouseEvent } from "react";

export function BackupImportButton({
  importAction,
}: {
  importAction: (formData: FormData) => void | Promise<void>;
}) {
  function openFilePicker(event: MouseEvent<HTMLButtonElement>) {
    const input = event.currentTarget.form?.elements.namedItem("backupFile");

    if (input instanceof HTMLInputElement) input.click();
  }

  function submitSelectedFile(event: ChangeEvent<HTMLInputElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form action={importAction}>
      <input
        accept=".json,application/json"
        aria-label="Full backup JSON file"
        className="sr-only"
        name="backupFile"
        onChange={submitSelectedFile}
        required
        tabIndex={-1}
        type="file"
      />
      <button
        className="inline-flex rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
        onClick={openFilePicker}
        type="button"
      >
        Import full backup
      </button>
    </form>
  );
}
