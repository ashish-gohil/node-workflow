import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { ReactFlowProvider } from "@xyflow/react";

import Header from "../components/ui/header";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable}`}
    >
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
