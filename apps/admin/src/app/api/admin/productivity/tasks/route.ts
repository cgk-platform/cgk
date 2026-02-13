export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTasks, createTask, type TaskFilters, type CreateTaskInput } from '@/lib/productivity'

/**
 * GET /api/admin/productivity/tasks
 * Get paginated list of tasks with filters
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)
  const offset = (page - 1) * limit

  const filters: TaskFilters = {
    page,
    limit,
    offset,
    search: url.searchParams.get('search') || undefined,
    status: url.searchParams.get('status') as TaskFilters['status'] || undefined,
    priority: url.searchParams.get('priority') as TaskFilters['priority'] || undefined,
    assigned_to: url.searchParams.get('assigned_to') || undefined,
    project_id: url.searchParams.get('project_id') || undefined,
    due_before: url.searchParams.get('due_before') || undefined,
    due_after: url.searchParams.get('due_after') || undefined,
    include_completed: url.searchParams.get('include_completed') === 'true',
    sort: (url.searchParams.get('sort') as TaskFilters['sort']) || 'created_at',
    dir: (url.searchParams.get('dir') as 'asc' | 'desc') || 'desc',
  }

  // Parse tags if provided
  const tagsParam = url.searchParams.get('tags')
  if (tagsParam) {
    filters.tags = tagsParam.split(',')
  }

  try {
    const { rows, totalCount } = await getTasks(tenantSlug, filters)

    return NextResponse.json({
      tasks: rows,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

/**
 * POST /api/admin/productivity/tasks
 * Create a new task
 */
export async function POST(request: Request) {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateTaskInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  try {
    const task = await createTask(tenantSlug, auth.userId, body)

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
