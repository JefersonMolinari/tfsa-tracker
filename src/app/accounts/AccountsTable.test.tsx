import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AccountsTable } from "./AccountsTable";

const accounts = [
  {
    id: "acct_1",
    name: "Main TFSA",
    institution: "Local Bank",
    notes: "Primary account",
    balanceCents: 123456,
    transactionCount: 4,
  },
];

describe("AccountsTable", () => {
  it("renders the requested headers in order", () => {
    const html = renderToStaticMarkup(
      <AccountsTable
        accounts={accounts}
        deleteAccountAction={vi.fn()}
        updateAccountAction={vi.fn()}
      />,
    );

    expect(html).toContain("<th class=\"px-4 py-4 font-medium\" scope=\"col\">Name</th>");
    expect(html).toContain(
      "<th class=\"px-4 py-4 font-medium\" scope=\"col\">Institution</th>",
    );
    expect(html).toContain("<th class=\"px-4 py-4 font-medium\" scope=\"col\">Balance</th>");
    expect(html).toContain(
      "<th class=\"px-4 py-4 font-medium\" scope=\"col\">Transactions</th>",
    );
  });

  it("shows the expanded editor row for the selected account", () => {
    const html = renderToStaticMarkup(
      <AccountsTable
        accounts={accounts}
        deleteAccountAction={vi.fn()}
        initialExpandedAccountId="acct_1"
        updateAccountAction={vi.fn()}
      />,
    );

    expect(html).toContain("Save changes");
    expect(html).toContain("Primary account");
    expect(html).toContain("name=\"accountId\" value=\"acct_1\"");
  });
});
