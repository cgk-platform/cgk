export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk/auth'
import { getAllSLAConfigs, updateSLAConfig } from '@cgk/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/support/sla
 * Get all SLA configurations
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const configs = await getAllSLAConfigs(tenantId)
    return NextResponse.json(configs)
  } catch (error) {
    console.error('Error fetching SLA configs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SLA configurations' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/support/sla
 * Update SLA configuration for a priority
 */
export async function PUT(request: Request) {
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

  // Only admins can update SLA configs
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
    priority?: string
    firstResponseMinutes?: number
    resolutionMinutes?: number
  }

  // Validate required fields
  if (!input.priority || !input.firstResponseMinutes || !input.resolutionMinutes) {
    return NextResponse.json(
      { error: 'Missing required fields: priority, firstResponseMinutes, resolutionMinutes' },
      { status: 400 }
    )
  }

  // Validate priority is valid
  const validPriorities = ['urgent', 'high', 'normal', 'low']
  if (!validPriorities.includes(input.priority)) {
    return NextResponse.json(
      { error: 'Invalid priority. Must be one of: urgent, high, normal, low' },
      { status: 400 }
    )
  }

  // Validate times are positive
  if (input.firstResponseMinutes < 1 || input.resolutionMinutes < 1) {
    return NextResponse.json(
      { error: 'Response and resolution times must be at least 1 minute' },
      { status: 400 }
    )
  }

  // Resolution time should be greater than first response time
  if (input.resolutionMinutes < input.firstResponseMinutes) {
    return NextResponse.json(
      { error: 'Resolution time must be greater than or equal to first response time' },
      { status: 400 }
    )
  }

  try {
    const config = await updateSLAConfig(
      tenantId,
      input.priority as 'urgent' | 'high' | 'normal' | 'low',
      input.firstResponseMinutes,
      input.resolutionMinutes
    )

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating SLA config:', error)
    return NextResponse.json(
      { error: 'Failed to update SLA configuration' },
      { status: 500 }
    )
  }
}
