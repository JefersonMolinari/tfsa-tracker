import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TransactionsImportButton } from "./TransactionsImportButton";

describe("TransactionsImportButton", () => {
  it("renders one visible import button with a hidden CSV file input", () => {
    const html = renderToStaticMarkup(
      <TransactionsImportButton importAction={vi.fn()} />,
    );

    expect(html).toContain("Import");
    expect(html).toContain('name="transactionsCsv"');
    expect(html).toContain('accept=".csv,text/csv"');
    expect(html).toContain('type="file"');
    expect(html).toContain('class="sr-only"');
  });
});
