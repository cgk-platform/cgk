/**
 * E-Signature Quick Actions
 *
 * Navigation buttons for common e-signature actions.
 */

'use client'

import { Button, cn } from '@cgk-platform/ui'
import {
  FileStack,
  Files,
  Send,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react'
import Link from 'next/link'

interface QuickAction {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  variant?: 'default' | 'outline'
}

const quickActions: QuickAction[] = [
  {
    label: 'Templates',
    description: 'Manage document templates',
    icon: FileStack,
    href: '/admin/esign/templates',
    variant: 'outline',
  },
  {
    label: 'Documents',
    description: 'View all documents',
    icon: Files,
    href: '/admin/esign/documents',
    variant: 'outline',
  },
  {
    label: 'Bulk Send',
    description: 'Send to multiple recipients',
    icon: Send,
    href: '/admin/esign/bulk-send',
    variant: 'outline',
  },
  {
    label: 'Reports',
    description: 'Analytics and insights',
    icon: BarChart3,
    href: '/admin/esign/reports',
    variant: 'outline',
  },
]

export function EsignQuickActions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Quick Actions
        </h2>
        <div className="flex items-center gap-2">
          <Link href="/admin/esign/documents/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Document
            </Button>
          </Link>
          <Link href="/admin/esign/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.label} href={action.href}>
              <button
                className={cn(
                  'group w-full rounded-lg border p-4 text-left',
                  'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                  'transition-all duration-200',
                  'hover:border-slate-300 hover:bg-slate-50',
                  'dark:hover:border-slate-700 dark:hover:bg-slate-800/80',
                  'hover:shadow-sm'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'rounded-md p-2',
                      'bg-slate-100 dark:bg-slate-800',
                      'group-hover:bg-slate-200 dark:group-hover:bg-slate-700',
                      'transition-colors duration-200'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 text-slate-600 dark:text-slate-400',
                        'group-hover:text-slate-700 dark:group-hover:text-slate-300',
                        'transition-colors duration-200'
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {action.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {action.description}
                    </p>
                  </div>
                </div>
              </button>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
