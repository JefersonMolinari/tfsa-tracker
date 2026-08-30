import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const getAppData = vi.fn().mockResolvedValue({
  settings: {
    startingYear: 2024,
    startingContributionRoomCents: 1_250_000,
    contributionRoomNotes: null,
  },
});

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
  importTfsaBackupAction: vi.fn(),
  saveSettings: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn().mockResolvedValue({ exp: 1_800_000_000 }),
}));

vi.mock("@/lib/tfsa/data", () => ({ getAppData }));

describe("SettingsPage full backup controls", () => {
  it("offers a full-backup download and JSON import without rendering a data preview", async () => {
    const { default: SettingsPage } = await import("./page");
    const view = await SettingsPage();
    const html = renderToStaticMarkup(view);

    expect(html).toContain('href="/backup/export"');
    expect(html).toContain("Download full backup");
    expect(html).toContain("Import full backup");
    expect(html).toContain('accept=".json,application/json"');
    expect(html).not.toContain("Backup contents preview");
    expect(html).not.toContain("TFSA_PASSWORD");
    expect(html).not.toContain("TFSA_SESSION_SECRET");
  });

  it("confirms a successful restore only for the success redirect", async () => {
    const { default: SettingsPage } = await import("./page");
    const view = await SettingsPage({
      searchParams: Promise.resolve({ backupImported: "1" }),
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Full backup imported successfully.");
  });
});
