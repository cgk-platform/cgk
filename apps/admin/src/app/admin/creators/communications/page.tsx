import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cgk/ui'
import { ArrowRight, Inbox, Mail, MessageSquare, Send, Settings } from 'lucide-react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { getQueueStats, getUnreadCount } from '@/lib/creator-communications/db'

export default function CreatorCommunicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communications</h1>
        <p className="text-muted-foreground">
          Manage all creator communications, templates, and messaging settings.
        </p>
      </div>

      <Suspense fallback={<CommunicationsGridSkeleton />}>
        <CommunicationsGrid />
      </Suspense>
    </div>
  )
}

async function CommunicationsGrid() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  let unreadCount = 0
  let queueStats = { total_pending: 0, sent_today: 0, failed_count: 0 }

  if (tenantSlug) {
    [unreadCount, queueStats] = await Promise.all([
      getUnreadCount(tenantSlug),
      getQueueStats(tenantSlug),
    ])
  }

  const cards = [
    {
      title: 'Inbox',
      description: 'View and respond to creator messages',
      href: '/admin/creators/communications/inbox',
      icon: Inbox,
      stat: unreadCount > 0 ? `${unreadCount} unread` : 'All caught up',
      statHighlight: unreadCount > 0,
    },
    {
      title: 'Email Queue',
      description: 'Monitor scheduled and sent emails',
      href: '/admin/creators/communications/queue',
      icon: Send,
      stat: `${queueStats.total_pending} pending`,
      statHighlight: queueStats.failed_count > 0,
      statExtra: queueStats.failed_count > 0 ? `${queueStats.failed_count} failed` : undefined,
    },
    {
      title: 'Templates',
      description: 'Customize email templates',
      href: '/admin/creators/communications/templates',
      icon: Mail,
      stat: 'Edit templates',
    },
    {
      title: 'Bulk Send',
      description: 'Send messages to multiple creators',
      href: '/admin/creators/communications/bulk',
      icon: MessageSquare,
      stat: 'Create campaign',
    },
    {
      title: 'Settings',
      description: 'Configure notification preferences',
      href: '/admin/creators/communications/settings',
      icon: Settings,
      stat: 'Configure',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.href} href={card.href} className="group">
          <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-muted p-2.5">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <CardTitle className="mt-3 text-lg">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${card.statHighlight ? 'text-amber-600' : 'text-muted-foreground'}`}
                >
                  {card.stat}
                </span>
                {card.statExtra && (
                  <span className="text-sm text-rose-600">{card.statExtra}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function CommunicationsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="h-full">
          <CardHeader className="pb-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
            <div className="mt-3 h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
