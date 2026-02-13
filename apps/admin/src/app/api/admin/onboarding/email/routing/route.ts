export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  autoAssignSenderAddresses,
  configureNotificationRouting,
  getNotificationTypesByCategory,
  getRoutingStatus,
  initializeNotificationRouting,
  type ConfigureRoutingInput,
} from '@cgk-platform/communications'

/**
 * GET /api/admin/onboarding/email/routing
 * Get notification routing configuration
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeTypes = url.searchParams.get('includeTypes') === 'true'

  // Get current routing status
  const status = await withTenant(tenantSlug, () => getRoutingStatus())

  // Optionally include notification type info for UI
  let typesByCategory: ReturnType<typeof getNotificationTypesByCategory> | undefined
  if (includeTypes) {
    typesByCategory = getNotificationTypesByCategory()
  }

  return NextResponse.json({
    routing: status,
    typesByCategory,
  })
}

/**
 * POST /api/admin/onboarding/email/routing
 * Configure notification routing
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: ConfigureRoutingInput & { autoAssign?: boolean; initialize?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Initialize routing if requested
  if (body.initialize) {
    await withTenant(tenantSlug, () => initializeNotificationRouting())
    return NextResponse.json({ success: true, initialized: true })
  }

  // Auto-assign senders if requested
  if (body.autoAssign) {
    const result = await withTenant(tenantSlug, () => autoAssignSenderAddresses())
    return NextResponse.json({
      success: result.success,
      assigned: result.assigned,
      errors: result.errors,
    })
  }

  // Apply specific routing configuration
  if (!body.routing || !Array.isArray(body.routing)) {
    return NextResponse.json(
      { error: 'Missing required field: routing' },
      { status: 400 }
    )
  }

  const result = await withTenant(tenantSlug, () =>
    configureNotificationRouting(body)
  )

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        updated: result.updated,
        errors: result.errors,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    updated: result.updated,
  })
}
