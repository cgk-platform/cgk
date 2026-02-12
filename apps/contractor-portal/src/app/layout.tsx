import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Contractor Portal',
  description: 'Manage your payments, tax documents, and work requests',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
