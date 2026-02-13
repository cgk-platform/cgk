'use client'

import { cn } from '@cgk-platform/ui'
import Link from 'next/link'
import type { SupportTicket } from '@cgk-platform/support'

import { DataTable, type Column } from '@/components/commerce/data-table'
import { TicketStatusBadge } from './ticket-status-badge'
import { TicketPriorityBadge } from './ticket-priority-badge'
import { SLAIndicatorCompact } from './sla-indicator'

interface TicketListProps {
  tickets: SupportTicket[]
  currentFilters: Record<string, string | number | undefined>
  currentSort?: string
  currentDir?: 'asc' | 'desc'
}

function formatDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function TicketList({
  tickets,
  currentFilters,
  currentSort,
  currentDir,
}: TicketListProps) {
  const columns: Column<SupportTicket>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket',
      sortable: true,
      className: 'w-[120px]',
      render: (ticket) => (
        <Link
          href={`/admin/support/tickets/${ticket.id}`}
          className="font-mono text-sm font-medium text-primary hover:underline"
        >
          {ticket.ticketNumber}
        </Link>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (ticket) => (
        <div className="max-w-[300px]">
          <Link
            href={`/admin/support/tickets/${ticket.id}`}
            className="font-medium hover:text-primary"
          >
            {ticket.subject}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {ticket.customerEmail}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'w-[100px]',
      render: (ticket) => <TicketStatusBadge status={ticket.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      className: 'w-[100px]',
      render: (ticket) => <TicketPriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'sla_deadline',
      header: 'SLA',
      sortable: true,
      className: 'w-[90px]',
      render: (ticket) => (
        <SLAIndicatorCompact
          deadline={ticket.slaDeadline}
          createdAt={ticket.createdAt}
          breached={ticket.slaBreached}
        />
      ),
    },
    {
      key: 'assigned',
      header: 'Assigned',
      className: 'w-[150px]',
      render: (ticket) =>
        ticket.assignedAgent ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full shrink-0',
                ticket.assignedAgent.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
              )}
            />
            <span className="truncate text-sm">{ticket.assignedAgent.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      className: 'w-[100px]',
      render: (ticket) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(new Date(ticket.createdAt))}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={tickets}
      keyFn={(ticket) => ticket.id}
      basePath="/admin/support/tickets"
      currentFilters={currentFilters}
      currentSort={currentSort}
      currentDir={currentDir}
    />
  )
}
