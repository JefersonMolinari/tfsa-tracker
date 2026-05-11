import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const getAppData = vi.fn();
const buildDashboardSummary = vi.fn();

vi.mock("@/app/actions", () => ({
  createTransaction: vi.fn(),
}));

vi.mock("@/lib/tfsa/data", () => ({
  getAppData,
}));

vi.mock("@/lib/tfsa/dashboard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tfsa/dashboard")>(
    "@/lib/tfsa/dashboard",
  );

  return {
    ...actual,
    buildDashboardSummary,
  };
});

describe("Dashboard page", () => {
  it("renders the add transaction button in the page intro", async () => {
    getAppData.mockResolvedValue({
      accounts: [
        {
          id: "acct_1",
          name: "Main TFSA",
          institution: "Local Bank",
          notes: null,
          _count: { transactions: 0 },
        },
      ],
      annualLimits: [],
      settings: {
        id: 1,
        startingYear: 2026,
        startingContributionRoomCents: 0,
        contributionRoomNotes: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      transactions: [],
    });
    buildDashboardSummary.mockReturnValue({
      estimatedContributionRoomCents: 0,
      contributionsThisYearCents: 0,
      withdrawalsThisYearCents: 0,
      totalTfsaBalanceCents: 0,
      warningLevel: "safe",
    });

    const { default: Home } = await import("./page");
    const view = await Home();
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Dashboard");
    expect(html).toContain("Add transaction");
  });
});
