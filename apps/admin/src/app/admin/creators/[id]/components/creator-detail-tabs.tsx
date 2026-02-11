'use client'

import { cn } from '@cgk/ui'
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  MessageSquare,
  FileText,
  FileCheck,
} from 'lucide-react'
import Link from 'next/link'

interface CreatorDetailTabsProps {
  creatorId: string
  activeTab: string
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'inbox', label: 'Inbox', icon: MessageSquare },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'tax', label: 'Tax', icon: FileCheck },
]

export function CreatorDetailTabs({ creatorId, activeTab }: CreatorDetailTabsProps) {
  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <Link
              key={tab.id}
              href={`/admin/creators/${creatorId}?tab=${tab.id}`}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
