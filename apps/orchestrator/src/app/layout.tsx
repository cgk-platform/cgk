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
        <div className="flex min-h-screen">
          <aside className="w-64 border-r bg-card">
            <div className="p-4">
              <h1 className="text-lg font-bold">Orchestrator</h1>
            </div>
            <nav className="p-4">
              <ul className="space-y-2 text-sm">
                <li><a href="/" className="hover:text-primary">Dashboard</a></li>
                <li><a href="/tenants" className="hover:text-primary">Tenants</a></li>
                <li><a href="/users" className="hover:text-primary">Users</a></li>
                <li><a href="/health" className="hover:text-primary">Health</a></li>
              </ul>
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
