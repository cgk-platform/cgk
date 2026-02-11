import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Admin Portal',
  description: 'White-labeled brand administration portal',
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
