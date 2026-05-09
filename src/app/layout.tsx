import type { Metadata } from "next";
import { AppShell } from "@/components/ui";

import "./globals.css";

export const metadata: Metadata = {
  title: "TFSA Tracker",
  description: "A local-first personal TFSA contribution room tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
