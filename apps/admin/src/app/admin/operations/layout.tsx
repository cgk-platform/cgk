'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Dashboard', href: '/admin/operations' },
  { label: 'Logs', href: '/admin/operations/logs' },
  { label: 'Errors', href: '/admin/operations/errors' },
  { label: 'Health', href: '/admin/operations/health' },
]

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      {/* Tab navigation */}
      <div className="border-b bg-white dark:bg-gray-900">
        <nav className="flex gap-4 px-6" aria-label="Operations tabs">
          {tabs.map((tab) => {
            const isActive =
              tab.href === '/admin/operations'
                ? pathname === '/admin/operations'
                : pathname.startsWith(tab.href)

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative py-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
