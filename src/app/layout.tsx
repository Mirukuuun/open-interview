import type { Metadata } from "next";

import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Open Interview",
    template: "%s | Open Interview",
  },
  description:
    "Open Interview is a local-first workbench for interview notes, question review, grounded QA, and resume deep dives.",
};

const themeBootstrap = `(function(){try{var t=localStorage.getItem('openInterviewTheme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
