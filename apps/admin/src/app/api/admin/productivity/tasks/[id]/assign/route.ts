export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { assignTask } from '@/lib/productivity'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/productivity/tasks/[id]/assign
 * Assign a task to a user
 */
export async function POST(request: Request, { params }: RouteParams) {
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

  const { id } = await params

  let body: { assigned_to: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const task = await assignTask(tenantSlug, id, body.assigned_to, auth.userId)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error assigning task:', error)
    return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 })
  }
}
