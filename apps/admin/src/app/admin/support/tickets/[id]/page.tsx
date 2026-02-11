import { Card, CardContent, CardHeader, Button, Badge } from '@cgk/ui'
import { getTicket, getComments, getTicketAuditLog } from '@cgk/support'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MessageSquare, Clock, User } from 'lucide-react'

import { TicketStatusBadge } from '@/components/support/ticket-status-badge'
import { TicketPriorityBadge } from '@/components/support/ticket-priority-badge'
import { SLAIndicator } from '@/components/support/sla-indicator'
import { TicketDetailClient } from './ticket-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return <div className="p-8 text-center text-muted-foreground">Tenant not found</div>
  }

  const ticket = await getTicket(tenantId, id)

  if (!ticket) {
    notFound()
  }

  const [commentsResult, auditLog] = await Promise.all([
    getComments(tenantId, id, true),
    getTicketAuditLog(tenantId, id),
  ])

  const channelIcons = {
    email: Mail,
    phone: Phone,
    chat: MessageSquare,
    form: MessageSquare,
    sms: MessageSquare,
  }
  const ChannelIcon = channelIcons[ticket.channel] || MessageSquare

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/support/tickets"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Tickets
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{ticket.ticketNumber}</h1>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
          <p className="text-muted-foreground">{ticket.subject}</p>
        </div>
        <SLAIndicator
          deadline={ticket.slaDeadline}
          createdAt={ticket.createdAt}
          breached={ticket.slaBreached}
          showLabel
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Description</h2>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Comments/Conversation */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Conversation</h2>
            </CardHeader>
            <CardContent>
              <TicketDetailClient
                ticketId={ticket.id}
                initialComments={commentsResult.items}
                initialStatus={ticket.status}
                initialPriority={ticket.priority}
                initialAssignedTo={ticket.assignedTo}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Customer</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {ticket.customerName || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">{ticket.customerEmail}</p>
                </div>
              </div>
              {ticket.customerId && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Customer ID</p>
                  <p className="text-sm font-mono">{ticket.customerId}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Details</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Channel</p>
                <div className="mt-1 flex items-center gap-2">
                  <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{ticket.channel}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                <p className="mt-1 text-sm">
                  {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>

              {ticket.firstResponseAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    First Response
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(ticket.firstResponseAt).toLocaleString()}
                  </p>
                </div>
              )}

              {ticket.resolvedAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Resolved
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(ticket.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {ticket.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tags</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {ticket.sentimentScore !== null && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Sentiment Score
                  </p>
                  <p className="mt-1 text-sm tabular-nums">
                    {ticket.sentimentScore.toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Activity</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {auditLog.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {entry.actorName || 'System'}
                        </span>{' '}
                        {formatAction(entry.action)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {auditLog.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    created: 'created this ticket',
    status_changed: 'changed the status',
    priority_changed: 'changed the priority',
    assigned: 'assigned this ticket',
    unassigned: 'unassigned this ticket',
    commented: 'added a comment',
    resolved: 'resolved this ticket',
    closed: 'closed this ticket',
    reopened: 'reopened this ticket',
    sla_breached: 'SLA was breached',
    escalated: 'escalated this ticket',
    tags_changed: 'updated tags',
  }
  return actionMap[action] || action.replace(/_/g, ' ')
}
