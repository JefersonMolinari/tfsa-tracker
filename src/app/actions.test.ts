import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn();
const importTransactionsCsvRows = vi.fn();
const backupActionCalls: string[] = [];
const importTfsaBackup = vi.fn(async () => {
  backupActionCalls.push("persist");
});
const requireSession = vi.fn(async () => {
  backupActionCalls.push("session");
  return { exp: 1_800_000_000 };
});
const db = {
  account: {
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  transaction: {
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  userSettings: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (client: unknown) => unknown) => callback(db)),
};

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession,
}));

vi.mock("@/lib/tfsa/importPersistence", () => ({
  importTransactionsCsvRows,
}));

vi.mock("@/lib/tfsa/backupPersistence", () => ({ importTfsaBackup }));

const validBackup = {
  version: 1,
  settings: {
    id: 1,
    startingYear: 2024,
    startingContributionRoomCents: 950_000,
    contributionRoomNotes: "Imported settings",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
  },
  accounts: [
    {
      id: "acct_1",
      name: "Main TFSA",
      institution: "Local Bank",
      notes: null,
      createdAt: "2026-02-03T00:00:00.000Z",
      updatedAt: "2026-02-04T00:00:00.000Z",
    },
  ],
  transactions: [
    {
      id: "txn_1",
      accountId: "acct_1",
      type: "CONTRIBUTION",
      amountCents: 250_000,
      occurredAt: "2026-02-05T00:00:00.000Z",
      notes: "Imported transaction",
      createdAt: "2026-02-06T00:00:00.000Z",
      updatedAt: "2026-02-07T00:00:00.000Z",
    },
  ],
} as const;

function backupFormData(contents: unknown = validBackup) {
  const formData = new FormData();
  formData.set(
    "backupFile",
    new File([JSON.stringify(contents)], "tfsa-full-backup-2026-05-09.json", {
      type: "application/json",
    }),
  );
  return formData;
}

describe("transaction actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (callback: (client: unknown) => unknown) =>
      callback(db),
    );
  });

  it("redirects updates back to the current filtered transactions URL", async () => {
    const { updateTransaction } = await import("./actions");
    const formData = new FormData();
    formData.set("transactionId", "txn_1");
    formData.set("accountId", "acct_1");
    formData.set("type", "CONTRIBUTION");
    formData.set("occurredAt", "2026-05-10");
    formData.set("amount", "2500.00");
    formData.set("notes", "Spring contribution");
    formData.set("redirectTo", "/transactions?accountId=acct_1&type=CONTRIBUTION");

    await updateTransaction(formData);

    expect(db.transaction.update).toHaveBeenCalledWith({
      where: { id: "txn_1" },
      data: expect.objectContaining({
        accountId: "acct_1",
        type: "CONTRIBUTION",
        amountCents: 250000,
      }),
    });
    expect(redirect).toHaveBeenCalledWith(
      "/transactions?accountId=acct_1&type=CONTRIBUTION",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("redirects deletes back to the current filtered transactions URL", async () => {
    const { deleteTransaction } = await import("./actions");
    const formData = new FormData();
    formData.set("transactionId", "txn_2");
    formData.set("redirectTo", "/transactions?year=2026&type=WITHDRAWAL");

    await deleteTransaction(formData);

    expect(db.transaction.delete).toHaveBeenCalledWith({
      where: { id: "txn_2" },
    });
    expect(redirect).toHaveBeenCalledWith("/transactions?year=2026&type=WITHDRAWAL");
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
  });

  it("redirects creates back to the dashboard when redirectTo is set to /", async () => {
    const { createTransaction } = await import("./actions");
    const formData = new FormData();
    formData.set("accountId", "acct_1");
    formData.set("type", "CONTRIBUTION");
    formData.set("occurredAt", "2026-05-10");
    formData.set("amount", "2500.00");
    formData.set("notes", "Dashboard contribution");
    formData.set("redirectTo", "/");

    await createTransaction(formData);

    expect(db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: "acct_1",
        type: "CONTRIBUTION",
        amountCents: 250000,
      }),
    });
    expect(redirect).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("imports exported transactions with stable account and transaction IDs", async () => {
    const { importTransactionsCsv } = await import("./actions");
    const formData = new FormData();
    formData.set(
      "transactionsCsv",
      new File(
        [
          "transaction_id,account_id,account_name,institution,transaction_type,amount_cents,amount_cad,occurred_at,notes,created_at,updated_at\r\n" +
            "txn_1,acct_1,Main TFSA,Local Bank,CONTRIBUTION,250000,0.01,2026-02-01T00:00:00.000Z,Imported,2026-02-01T01:00:00.000Z,2026-02-01T02:00:00.000Z\r\n",
        ],
        "tfsa-transactions-2026-05-09.csv",
        { type: "text/csv" },
      ),
    );

    await importTransactionsCsv(formData);

    expect(importTransactionsCsvRows).toHaveBeenCalledWith([
      expect.objectContaining({
        transactionId: "txn_1",
        accountId: "acct_1",
        amountCents: 250000,
        notes: "Imported",
        type: "CONTRIBUTION",
      }),
    ]);
    expect(redirect).toHaveBeenCalledWith("/transactions?imported=1");
  });

  it("does not revalidate or redirect when CSV persistence fails", async () => {
    importTransactionsCsvRows.mockRejectedValueOnce(new Error("Import failed"));
    const { importTransactionsCsv } = await import("./actions");
    const formData = new FormData();
    formData.set(
      "transactionsCsv",
      new File(
        [
          "transaction_id,account_id,account_name,institution,transaction_type,amount_cents,amount_cad,occurred_at,notes,created_at,updated_at\r\n" +
            "txn_1,acct_1,Main TFSA,Local Bank,CONTRIBUTION,250000,0.01,2026-02-01T00:00:00.000Z,Imported,2026-02-01T01:00:00.000Z,2026-02-01T02:00:00.000Z\r\n",
        ],
        "tfsa-transactions.csv",
        { type: "text/csv" },
      ),
    );

    await expect(importTransactionsCsv(formData)).rejects.toThrow("Import failed");

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("account actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backupActionCalls.length = 0;
  });

  it("redirects account updates back to /accounts", async () => {
    const { updateAccount } = await import("./actions");
    const formData = new FormData();
    formData.set("accountId", "acct_1");
    formData.set("name", "Main TFSA");
    formData.set("institution", "Local Bank");
    formData.set("notes", "Primary account");

    await updateAccount(formData);

    expect(db.account.update).toHaveBeenCalledWith({
      where: { id: "acct_1" },
      data: {
        name: "Main TFSA",
        institution: "Local Bank",
        notes: "Primary account",
      },
    });
    expect(redirect).toHaveBeenCalledWith("/accounts");
    expect(revalidatePath).toHaveBeenCalledWith("/accounts");
  });

  it("redirects account deletes back to /accounts", async () => {
    const { deleteAccount } = await import("./actions");
    const formData = new FormData();
    formData.set("accountId", "acct_1");

    await deleteAccount(formData);

    expect(db.account.delete).toHaveBeenCalledWith({
      where: { id: "acct_1" },
    });
    expect(redirect).toHaveBeenCalledWith("/accounts");
    expect(revalidatePath).toHaveBeenCalledWith("/accounts");
  });
});

describe("full-backup import action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backupActionCalls.length = 0;
  });

  it("validates the selected backup, persists it once, then refreshes and redirects", async () => {
    const { importTfsaBackupAction } = await import("./actions");

    await importTfsaBackupAction(backupFormData());

    expect(requireSession).toHaveBeenCalledTimes(1);
    expect(backupActionCalls).toEqual(["session", "persist"]);
    expect(importTfsaBackup).toHaveBeenCalledTimes(1);
    expect(importTfsaBackup).toHaveBeenCalledWith(validBackup);
    expect(revalidatePath.mock.calls).toEqual([
      ["/"],
      ["/accounts"],
      ["/transactions"],
      ["/settings"],
    ]);
    expect(redirect).toHaveBeenCalledWith("/settings?backupImported=1");
  });

  it("rejects an invalid backup before persistence, revalidation, or redirect", async () => {
    const { importTfsaBackupAction } = await import("./actions");

    await expect(
      importTfsaBackupAction(backupFormData({ ...validBackup, version: 2 })),
    ).rejects.toThrow();

    expect(importTfsaBackup).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not revalidate or redirect when atomic persistence fails", async () => {
    importTfsaBackup.mockRejectedValueOnce(new Error("Restore failed"));
    const { importTfsaBackupAction } = await import("./actions");

    await expect(importTfsaBackupAction(backupFormData())).rejects.toThrow(
      "Restore failed",
    );

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
