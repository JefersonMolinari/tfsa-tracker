import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/ui";

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

vi.mock("./actions", () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

describe("login page", () => {
  it("renders only a password field and a generic invalid-credential error", async () => {
    const { default: LoginPage } = await import("./page");
    const page = await LoginPage({
      searchParams: Promise.resolve({ error: "invalid" }),
    });
    const html = renderToStaticMarkup(
      <AppShell authenticated={false}>{page}</AppShell>,
    );

    expect(html).toContain('name="password"');
    expect(html).toContain('type="password"');
    expect(html).toContain("The password was not accepted.");
    expect(html).not.toContain('name="email"');
    expect(html).not.toContain("Dashboard");
    expect(html).not.toContain("Transactions");
    expect(html).not.toContain("Logout");
    expect(html).not.toContain("TFSA_PASSWORD");
  });

  it("renders protected navigation and logout only for an authenticated shell", () => {
    const html = renderToStaticMarkup(
      <AppShell authenticated>
        <p>Protected content</p>
      </AppShell>,
    );

    expect(html).toContain("Dashboard");
    expect(html).toContain("Accounts");
    expect(html).toContain("Transactions");
    expect(html).toContain("Settings");
    expect(html).toContain("Logout");
  });
});
