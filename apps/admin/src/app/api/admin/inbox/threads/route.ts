/**
 * Inbox Threads API
 * GET /api/admin/inbox/threads - List threads
 * POST /api/admin/inbox/threads - Create new thread
 */

import { getTenantContext, requireAuth } from '@cgk/auth'
import {
  createThread,
  getThreads,
  type CreateThreadInput,
  type ThreadFilters,
} from '@cgk/admin-core'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const url = new URL(req.url)

  const filters: ThreadFilters = {
    status: url.searchParams.get('status') as ThreadFilters['status'] || undefined,
    priority: url.searchParams.get('priority') as ThreadFilters['priority'] || undefined,
    assignedTo: url.searchParams.get('assignedTo') || undefined,
    contactId: url.searchParams.get('contactId') || undefined,
    threadType: url.searchParams.get('threadType') as ThreadFilters['threadType'] || undefined,
    search: url.searchParams.get('search') || undefined,
    limit: parseInt(url.searchParams.get('limit') || '50', 10),
    offset: parseInt(url.searchParams.get('offset') || '0', 10),
  }

  const { threads, total } = await getThreads(tenantId, filters)

  return Response.json({
    threads,
    total,
    limit: filters.limit,
    offset: filters.offset,
  })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as CreateThreadInput

  if (!body.contactId) {
    return Response.json({ error: 'contactId is required' }, { status: 400 })
  }

  const thread = await createThread(auth.tenantId, body)

  return Response.json({ thread }, { status: 201 })
}
