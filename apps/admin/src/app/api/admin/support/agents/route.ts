export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk/auth'
import { createAgent, getAgents, type AgentFilters } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/support/agents
 * List support agents
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and leads can view agent list
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const filters: AgentFilters = {
    role: url.searchParams.get('role') as AgentFilters['role'] || undefined,
    isActive: url.searchParams.get('isActive') === 'true' ? true :
      url.searchParams.get('isActive') === 'false' ? false : undefined,
    isOnline: url.searchParams.get('isOnline') === 'true' ? true :
      url.searchParams.get('isOnline') === 'false' ? false : undefined,
    search: url.searchParams.get('search') || undefined,
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: parseInt(url.searchParams.get('limit') || '20', 10),
  }

  try {
    const result = await getAgents(tenantId, filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/support/agents
 * Create a new support agent
 */
export async function POST(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can create agents
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input = body as {
    userId?: string
    name?: string
    email?: string
    role?: string
    maxTickets?: number
    skills?: string[]
  }

  if (!input.userId || !input.name || !input.email) {
    return NextResponse.json(
      { error: 'Missing required fields: userId, name, email' },
      { status: 400 }
    )
  }

  try {
    const agent = await createAgent(tenantId, {
      userId: input.userId,
      name: input.name,
      email: input.email,
      role: (input.role as 'agent' | 'lead' | 'admin') || 'agent',
      maxTickets: input.maxTickets || 20,
      skills: input.skills || [],
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
