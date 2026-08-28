import type { Metadata } from "next";
import { AppShell } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth/session";

import "./globals.css";

export const metadata: Metadata = {
  title: "TFSA Tracker",
  description: "A local-first personal TFSA contribution room tracker.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  return (
    <html lang="en" className="min-h-full antialiased">
      <body className="min-h-full">
        <AppShell authenticated={session !== null}>{children}</AppShell>
      </body>
    </html>
  );
}
