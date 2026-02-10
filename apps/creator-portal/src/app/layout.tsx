import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Creator Portal',
  description: 'Manage your projects, earnings, and payouts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen">
          <aside className="w-64 border-r">
            <div className="p-4 border-b">
              <h1 className="text-lg font-bold">Creator Portal</h1>
            </div>
            <nav className="p-4">
              <ul className="space-y-2 text-sm">
                <li><a href="/" className="hover:text-primary">Dashboard</a></li>
                <li><a href="/projects" className="hover:text-primary">Projects</a></li>
                <li><a href="/earnings" className="hover:text-primary">Earnings</a></li>
                <li><a href="/payouts" className="hover:text-primary">Payouts</a></li>
                <li><a href="/settings" className="hover:text-primary">Settings</a></li>
              </ul>
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
