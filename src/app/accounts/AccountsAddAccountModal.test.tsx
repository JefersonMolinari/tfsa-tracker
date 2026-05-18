import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AccountsAddAccountModal } from "./AccountsAddAccountModal";

describe("AccountsAddAccountModal", () => {
  it("renders the add account button when closed", () => {
    const html = renderToStaticMarkup(
      <AccountsAddAccountModal createAccountAction={vi.fn()} />,
    );

    expect(html).toContain("Add account");
    expect(html).not.toContain("name=\"name\"");
    expect(html).not.toContain("Create account");
  });

  it("renders the account form inside the modal when open", () => {
    const html = renderToStaticMarkup(
      <AccountsAddAccountModal createAccountAction={vi.fn()} initialOpen />,
    );

    expect(html).toContain("Add account");
    expect(html).toContain("Use one account per TFSA container you want to track.");
    expect(html).toContain("name=\"name\"");
    expect(html).toContain("name=\"institution\"");
    expect(html).toContain("name=\"notes\"");
    expect(html).toContain("Create account");
  });
});
