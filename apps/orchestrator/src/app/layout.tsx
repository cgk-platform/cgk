import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'CGK Orchestrator',
  description: 'Super Admin Dashboard - Internal Platform Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
