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
