'use client'

import { Badge, Button, Checkbox, cn } from '@cgk/ui'
import { AlertCircle, Check, Clock, Eye, MoreHorizontal, RefreshCcw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { CreatorQueueEntry, QueueStatus } from '@/lib/creator-communications/types'

interface QueueTableProps {
  entries: CreatorQueueEntry[]
}

export function QueueTable({ entries }: QueueTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)))
    }
  }

  const handleBulkAction = async (action: 'retry' | 'cancel') => {
    if (selectedIds.size === 0) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/admin/creators/communications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, emailIds: Array.from(selectedIds) }),
      })

      if (response.ok) {
        setSelectedIds(new Set())
        startTransition(() => {
          router.refresh()
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: QueueStatus) => {
    const variants: Record<QueueStatus, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-slate-100 text-slate-700', icon: <Clock className="h-3 w-3" /> },
      scheduled: { color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-3 w-3" /> },
      processing: { color: 'bg-amber-100 text-amber-700', icon: <RefreshCcw className="h-3 w-3 animate-spin" /> },
      sent: { color: 'bg-emerald-100 text-emerald-700', icon: <Check className="h-3 w-3" /> },
      failed: { color: 'bg-rose-100 text-rose-700', icon: <X className="h-3 w-3" /> },
      bounced: { color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="h-3 w-3" /> },
      cancelled: { color: 'bg-slate-100 text-slate-500', icon: <X className="h-3 w-3" /> },
    }

    const variant = variants[status]
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
          variant.color,
        )}
      >
        {variant.icon}
        {status}
      </span>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('retry')}
              disabled={isProcessing}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Retry Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('cancel')}
              disabled={isProcessing}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="grid grid-cols-[40px,1fr,1fr,120px,140px,100px,40px] items-center gap-4 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div>
          <Checkbox
            checked={selectedIds.size === entries.length && entries.length > 0}
            onCheckedChange={toggleSelectAll}
          />
        </div>
        <div>Recipient</div>
        <div>Subject</div>
        <div>Status</div>
        <div>Scheduled</div>
        <div>Opens</div>
        <div></div>
      </div>

      {/* Table body */}
      <div className="divide-y">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              'grid grid-cols-[40px,1fr,1fr,120px,140px,100px,40px] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30',
              selectedIds.has(entry.id) && 'bg-primary/5',
            )}
          >
            <div>
              <Checkbox
                checked={selectedIds.has(entry.id)}
                onCheckedChange={() => toggleSelect(entry.id)}
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {entry.creator_name || entry.creator_email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {entry.creator_email}
              </p>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm">{entry.subject || '-'}</p>
              {entry.template_name && (
                <p className="truncate text-xs text-muted-foreground">
                  Template: {entry.template_name}
                </p>
              )}
            </div>

            <div>{getStatusBadge(entry.status)}</div>

            <div className="text-sm text-muted-foreground">
              {formatDate(entry.scheduled_for || entry.created_at)}
            </div>

            <div className="text-sm">
              {entry.opened_at ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Eye className="h-3.5 w-3.5" />
                  Opened
                </span>
              ) : entry.status === 'sent' ? (
                <span className="text-muted-foreground">Not opened</span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>

            <div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
