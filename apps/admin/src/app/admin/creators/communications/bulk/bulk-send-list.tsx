'use client'

import { Badge, Button, Card, CardContent, cn, Progress } from '@cgk/ui'
import { Calendar, Check, Clock, MoreHorizontal, Send, Users, X } from 'lucide-react'
import Link from 'next/link'

import type { BulkSend, BulkSendStatus } from '@/lib/creator-communications/types'

interface BulkSendListProps {
  bulkSends: BulkSend[]
  totalCount: number
  page: number
}

export function BulkSendList({ bulkSends, totalCount, page }: BulkSendListProps) {
  const getStatusBadge = (status: BulkSendStatus) => {
    const variants: Record<BulkSendStatus, { color: string; icon: React.ReactNode; label: string }> = {
      draft: {
        color: 'bg-slate-100 text-slate-700',
        icon: <Clock className="h-3 w-3" />,
        label: 'Draft',
      },
      scheduled: {
        color: 'bg-blue-100 text-blue-700',
        icon: <Calendar className="h-3 w-3" />,
        label: 'Scheduled',
      },
      sending: {
        color: 'bg-amber-100 text-amber-700',
        icon: <Send className="h-3 w-3 animate-pulse" />,
        label: 'Sending',
      },
      completed: {
        color: 'bg-emerald-100 text-emerald-700',
        icon: <Check className="h-3 w-3" />,
        label: 'Completed',
      },
      cancelled: {
        color: 'bg-rose-100 text-rose-700',
        icon: <X className="h-3 w-3" />,
        label: 'Cancelled',
      },
    }

    const variant = variants[status]
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
          variant.color,
        )}
      >
        {variant.icon}
        {variant.label}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {bulkSends.map((bulkSend) => {
        const progress = bulkSend.recipient_count > 0
          ? Math.round((bulkSend.sent_count / bulkSend.recipient_count) * 100)
          : 0

        return (
          <Card key={bulkSend.id} className="transition-all hover:border-primary/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="truncate font-medium">
                      {bulkSend.name || bulkSend.subject}
                    </h3>
                    {getStatusBadge(bulkSend.status)}
                  </div>

                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {bulkSend.subject}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {bulkSend.recipient_count} recipients
                    </span>

                    {bulkSend.scheduled_for && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {formatDate(bulkSend.scheduled_for)}
                      </span>
                    )}

                    {bulkSend.status === 'completed' && (
                      <>
                        <span className="text-emerald-600">
                          {bulkSend.sent_count} sent
                        </span>
                        {bulkSend.failed_count > 0 && (
                          <span className="text-rose-600">
                            {bulkSend.failed_count} failed
                          </span>
                        )}
                        <span>
                          {bulkSend.open_count} opens ({Math.round((bulkSend.open_count / bulkSend.sent_count) * 100) || 0}%)
                        </span>
                      </>
                    )}
                  </div>

                  {bulkSend.status === 'sending' && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/creators/communications/bulk/${bulkSend.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {totalCount > 20 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {bulkSends.length} of {totalCount} campaigns
        </div>
      )}
    </div>
  )
}
