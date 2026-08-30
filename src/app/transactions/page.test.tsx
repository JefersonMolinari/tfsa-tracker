import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const getTransactionsPageData = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions", () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  importTransactionsCsv: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn().mockResolvedValue({ exp: 1_800_000_000 }),
}));

vi.mock("@/lib/tfsa/data", () => ({
  getTransactionsPageData,
}));

describe("TransactionsPage", () => {
  it("renders the empty state when no transactions match the filters", async () => {
    getTransactionsPageData.mockResolvedValue({
      accounts: [],
      transactions: [],
    });

    const { default: TransactionsPage } = await import("./page");
    const view = await TransactionsPage({
      searchParams: Promise.resolve({ type: "CONTRIBUTION" }),
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("No matching transactions");
    expect(html).toContain("Add transaction");
    expect(html).toContain("Filter transactions");
    expect(html).toContain("Export");
    expect(html).toContain("Import");
    expect(html).not.toContain(
      "Amounts are entered in dollars, stored as integer cents, and used for estimates on the dashboard.",
    );
    expect(html).not.toContain("Export CSV");
    expect(html).not.toContain("Import CSV");
    expect(html).not.toContain("Use a transactions CSV exported from this app.");
  });

  it("renders import success feedback", async () => {
    getTransactionsPageData.mockResolvedValue({
      accounts: [],
      transactions: [],
    });

    const { default: TransactionsPage } = await import("./page");
    const view = await TransactionsPage({
      searchParams: Promise.resolve({ imported: "2" }),
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Imported 2 transactions from CSV.");
  });
});
