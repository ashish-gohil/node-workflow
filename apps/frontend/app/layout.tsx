import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { ReactFlowProvider } from "@xyflow/react";

import { TooltipProvider } from "@/components/ui/tooltip";

import Header from "../components/ui/header";

import "./globals.css";

export const metadata: Metadata = {
  title: "FLOW",
  description: "Visual workflow automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark">
          <div className="fixed top-0 right-0 left-0 z-50">
            <Header />
          </div>

          <ReactFlowProvider>
            <main className="bg-bg-canvas h-full pt-14">
              <TooltipProvider>{children}</TooltipProvider>
            </main>
          </ReactFlowProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
