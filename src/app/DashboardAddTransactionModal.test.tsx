import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardAddTransactionModal } from "./DashboardAddTransactionModal";

describe("DashboardAddTransactionModal", () => {
  it("renders the transaction form inside the modal when accounts exist", () => {
    const html = renderToStaticMarkup(
      <DashboardAddTransactionModal
        accountOptions={[{ label: "Main TFSA · Local Bank", value: "acct_1" }]}
        createTransactionAction={vi.fn()}
        initialOpen
      />,
    );

    expect(html).toContain("Add transaction");
    expect(html).toContain("name=\"accountId\"");
    expect(html).toContain("name=\"type\"");
    expect(html).toContain("type=\"hidden\" name=\"redirectTo\" value=\"/\"");
  });

  it("renders guidance instead of the form when no accounts exist", () => {
    const html = renderToStaticMarkup(
      <DashboardAddTransactionModal
        accountOptions={[]}
        createTransactionAction={vi.fn()}
        initialOpen
      />,
    );

    expect(html).toContain("Create an account first");
    expect(html).toContain("Go to accounts");
    expect(html).not.toContain("name=\"accountId\"");
  });
});
