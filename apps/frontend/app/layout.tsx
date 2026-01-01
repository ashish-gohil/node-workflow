import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import Header from '../components/ui/header'
import { ReactFlowProvider } from '@xyflow/react'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'N8N',
  description: 'Automated workflow app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
        >
          <div className={`fixed top-0 left-0 right-0 z-50`}>
            <Header />
          </div>
          <ReactFlowProvider>
            <main className="pt-20 h-full bg-bg">{children}</main>
          </ReactFlowProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
