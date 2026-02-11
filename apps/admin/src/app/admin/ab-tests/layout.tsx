import Link from 'next/link'

import { cn } from '@cgk/ui'

const tabs = [
  { name: 'All Tests', href: '/admin/ab-tests' },
  { name: 'Data Quality', href: '/admin/ab-tests/data-quality' },
]

export default function ABTestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <TabLink key={tab.href} href={tab.href}>
            {tab.name}
          </TabLink>
        ))}
      </nav>
      {children}
    </div>
  )
}

function TabLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'px-4 py-3 text-sm font-medium text-slate-600',
        'border-b-2 border-transparent',
        'hover:text-slate-900 hover:border-slate-300',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2'
      )}
    >
      {children}
    </Link>
  )
}
