import { Card, CardContent, Button, Input } from '@cgk/ui'
import { getAgents } from '@cgk/support'
import type { SupportAgent } from '@cgk/support'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'

import { Pagination } from '@/components/commerce/pagination'
import { parseAgentFilters } from '@/lib/support/filters'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AgentsPage({ searchParams }: PageProps) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return <div className="p-8 text-center text-muted-foreground">Tenant not found</div>
  }

  const params = await searchParams
  const filters = parseAgentFilters(params)

  const result = await getAgents(tenantId, {
    role: filters.role as 'agent' | 'lead' | 'admin' | undefined,
    isActive: filters.isActive === 'true' ? true : filters.isActive === 'false' ? false : undefined,
    isOnline: filters.isOnline === 'true' ? true : filters.isOnline === 'false' ? false : undefined,
    search: filters.search || undefined,
    page: filters.page,
    limit: filters.limit,
  })

  const currentFilters = {
    role: filters.role,
    isActive: filters.isActive,
    isOnline: filters.isOnline,
    search: filters.search,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Support Agents</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} agent{result.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/admin/support/agents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
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
                placeholder="Search agents..."
                defaultValue={filters.search}
                className="pl-9"
              />
            </div>

            {/* Role */}
            <select
              name="role"
              defaultValue={filters.role}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="lead">Lead</option>
              <option value="agent">Agent</option>
            </select>

            {/* Status */}
            <select
              name="isActive"
              defaultValue={filters.isActive}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            {/* Online */}
            <select
              name="isOnline"
              defaultValue={filters.isOnline}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Online Status</option>
              <option value="true">Online</option>
              <option value="false">Offline</option>
            </select>

            <Button type="submit" variant="secondary">
              Filter
            </Button>

            {Object.values(currentFilters).some((v) => v) && (
              <Link href="/admin/support/agents">
                <Button type="button" variant="ghost">
                  Clear
                </Button>
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Agent List */}
      <AgentListClient agents={result.items} />

      {/* Pagination */}
      {result.totalPages > 1 && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          totalCount={result.total}
          limit={filters.limit}
          basePath="/admin/support/agents"
          currentFilters={currentFilters}
        />
      )}
    </div>
  )
}

// Client wrapper for agent list actions
import { AgentListClientWrapper } from './agent-list-client'

function AgentListClient({ agents }: { agents: SupportAgent[] }) {
  return <AgentListClientWrapper agents={agents} />
}
