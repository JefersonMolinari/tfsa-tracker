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
    expect(html).toContain("Filter transactions");
  });
});
