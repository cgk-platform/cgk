export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { completeTask } from '@/lib/productivity'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/productivity/tasks/[id]/complete
 * Mark a task as completed
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

  try {
    const task = await completeTask(tenantSlug, id, auth.userId)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
  }
}
