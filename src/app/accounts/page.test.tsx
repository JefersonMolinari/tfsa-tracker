import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const getAppData = vi.fn();
const calculateAccountBalances = vi.fn();

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
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock("@/lib/tfsa/data", () => ({
  getAppData,
}));

vi.mock("@/lib/tfsa/dashboard", () => ({
  calculateAccountBalances,
}));

describe("AccountsPage", () => {
  it("renders the empty state when there are no accounts", async () => {
    getAppData.mockResolvedValue({
      accounts: [],
      transactions: [],
    });
    calculateAccountBalances.mockReturnValue(new Map());

    const { default: AccountsPage } = await import("./page");
    const view = await AccountsPage();
    const html = renderToStaticMarkup(view);

    expect(html).toContain("No accounts yet");
    expect(html).toContain("Add account");
  });
});
