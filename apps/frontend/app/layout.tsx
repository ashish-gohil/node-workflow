import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { ReactFlowProvider } from "@xyflow/react";

import Header from "../components/ui/header";
import { TooltipProvider } from "@/components/ui/tooltip";


import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "N8N",
  description: "Automated workflow app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
        >
          <div className={"fixed left-0 right-0 top-0 z-50"}>
            <Header />
          </div>

          <ReactFlowProvider>
            <main className="bg-bg h-full pt-20">
              <TooltipProvider>{children}</TooltipProvider>
            </main>
          </ReactFlowProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
