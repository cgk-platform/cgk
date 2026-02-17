'use client'

import Link from 'next/link'
import {
  FolderKanban,
  FileText,
  CreditCard,
  Settings,
} from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  description: string
  href: string
  icon: React.ReactNode
  iconBgClass: string
}

const actions: QuickAction[] = [
  {
    id: 'projects',
    label: 'View Projects',
    description: 'See your active and past projects',
    href: '/projects',
    icon: <FolderKanban className="h-5 w-5" />,
    iconBgClass: 'bg-primary/10 text-primary',
  },
  {
    id: 'request-payment',
    label: 'Request Payment',
    description: 'Submit a new payment request',
    href: '/request-payment',
    icon: <FileText className="h-5 w-5" />,
    iconBgClass: 'bg-success/10 text-success',
  },
  {
    id: 'payments',
    label: 'Payment History',
    description: 'View your earnings and payouts',
    href: '/payments',
    icon: <CreditCard className="h-5 w-5" />,
    iconBgClass: 'bg-gold/10 text-gold',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Manage payout methods and tax info',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
    iconBgClass: 'bg-muted text-muted-foreground',
  },
]

/**
 * Quick action buttons for contractor dashboard
 */
export function QuickActions(): React.JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-all duration-normal hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className={`rounded-lg p-2.5 ${action.iconBgClass}`}>
            {action.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{action.label}</span>
            <span className="text-xs text-muted-foreground">
              {action.description}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
