import { Button, Card, CardContent, Input } from '@cgk-platform/ui'
import { getTickets } from '@cgk-platform/support'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Plus, Filter, Search } from 'lucide-react'

import { TicketList } from '@/components/support/ticket-list'
import { Pagination } from '@/components/commerce/pagination'
import { parseTicketFilters } from '@/lib/support/filters'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return <div className="p-8 text-center text-muted-foreground">Tenant not found</div>
  }

  const params = await searchParams
  const filters = parseTicketFilters(params)

  const result = await getTickets(tenantId, {
    status: filters.status as 'open' | 'pending' | 'resolved' | 'closed' | undefined,
    priority: filters.priority as 'low' | 'normal' | 'high' | 'urgent' | undefined,
    channel: filters.channel as 'email' | 'chat' | 'phone' | 'form' | 'sms' | undefined,
    assignedTo: filters.assignedTo || undefined,
    unassigned: filters.unassigned === 'true',
    slaBreached: filters.slaBreached === 'true' ? true : undefined,
    search: filters.search || undefined,
    page: filters.page,
    limit: filters.limit,
    sort: filters.sort,
    dir: filters.dir,
  })

  const currentFilters = {
    status: filters.status,
    priority: filters.priority,
    channel: filters.channel,
    assignedTo: filters.assignedTo,
    unassigned: filters.unassigned,
    slaBreached: filters.slaBreached,
    search: filters.search,
    sort: filters.sort,
    dir: filters.dir,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} ticket{result.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/admin/support/tickets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="search"
                placeholder="Search tickets..."
                defaultValue={filters.search}
                className="pl-9"
              />
            </div>

            {/* Status */}
            <select
              name="status"
              defaultValue={filters.status}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority */}
            <select
              name="priority"
              defaultValue={filters.priority}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            {/* Channel */}
            <select
              name="channel"
              defaultValue={filters.channel}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Channels</option>
              <option value="email">Email</option>
              <option value="chat">Chat</option>
              <option value="phone">Phone</option>
              <option value="form">Form</option>
              <option value="sms">SMS</option>
            </select>

            {/* SLA Breached */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="slaBreached"
                value="true"
                defaultChecked={filters.slaBreached === 'true'}
                className="rounded border"
              />
              SLA Breached
            </label>

            {/* Unassigned */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="unassigned"
                value="true"
                defaultChecked={filters.unassigned === 'true'}
                className="rounded border"
              />
              Unassigned
            </label>

            <Button type="submit" variant="secondary">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>

            {Object.values(currentFilters).some((v) => v) && (
              <Link href="/admin/support/tickets">
                <Button type="button" variant="ghost">
                  Clear
                </Button>
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <TicketList
        tickets={result.items}
        currentFilters={currentFilters}
        currentSort={filters.sort}
        currentDir={filters.dir}
      />

      {/* Pagination */}
      {result.totalPages > 1 && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          totalCount={result.total}
          limit={filters.limit}
          basePath="/admin/support/tickets"
          currentFilters={currentFilters}
        />
      )}
    </div>
  )
}
