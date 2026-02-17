'use client'

import { Sidebar } from '@/components/nav/Sidebar'
import { MobileNav } from '@/components/nav/MobileNav'

/**
 * Portal layout with sidebar navigation for authenticated contractor pages
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main content */}
      <main className="flex-1 pt-14 lg:pt-0">
        <div className="mx-auto max-w-6xl p-6 lg:p-8 animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}
