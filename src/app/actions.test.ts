import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn();
const db = {
  account: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  transaction: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  userSettings: {
    upsert: vi.fn(),
  },
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

describe("transaction actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

describe("account actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
