import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Open Interview",
    template: "%s | Open Interview",
  },
  description:
    "Open Interview is a local-first workbench for interview notes, question review, grounded QA, and resume deep dives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
