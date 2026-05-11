import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TransactionsTable } from "./TransactionsTable";

const accountOptions = [{ label: "Main TFSA · Local Bank", value: "acct_1" }];
const transactions = [
  {
    id: "txn_1",
    accountId: "acct_1",
    accountLabel: "Main TFSA · Local Bank",
    type: "CONTRIBUTION" as const,
    amountCents: 123456,
    occurredAt: "2026-03-01T00:00:00.000Z",
    notes: "March contribution",
  },
];

describe("TransactionsTable", () => {
  it("renders the requested headers in order", () => {
    const html = renderToStaticMarkup(
      <TransactionsTable
        accountOptions={accountOptions}
        deleteTransactionAction={vi.fn()}
        redirectTo="/transactions"
        transactions={transactions}
        updateTransactionAction={vi.fn()}
      />,
    );

    expect(html).toContain("<th class=\"px-4 py-4 font-medium\" scope=\"col\">Account</th>");
    expect(html).toContain("<th class=\"px-4 py-4 font-medium\" scope=\"col\">Type</th>");
    expect(html).toContain(
      "<th class=\"px-4 py-4 font-medium\" scope=\"col\">Amount (CAD)</th>",
    );
    expect(html).toContain("<th class=\"px-4 py-4 font-medium\" scope=\"col\">Date</th>");
  });

  it("shows the expanded editor row for the selected transaction", () => {
    const html = renderToStaticMarkup(
      <TransactionsTable
        accountOptions={accountOptions}
        deleteTransactionAction={vi.fn()}
        initialExpandedTransactionId="txn_1"
        redirectTo="/transactions?type=CONTRIBUTION"
        transactions={transactions}
        updateTransactionAction={vi.fn()}
      />,
    );

    expect(html).toContain("Save changes");
    expect(html).toContain(
      "type=\"hidden\" name=\"redirectTo\" value=\"/transactions?type=CONTRIBUTION\"",
    );
    expect(html).toContain("March contribution");
  });
});
