import { sql } from '@cgk-platform/db'
import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/platform/tenants
 *
 * Returns all active organizations for super admins.
 * Used by SuperAdminTenantSelector component.
 *
 * @requires Super admin authentication
 * @returns List of active organizations
 */
export async function GET(request: Request) {
  try {
    // Require authentication
    const auth = await requireAuth(request)

    // Only super admins can access this endpoint
    if (auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - super admin access required' },
        { status: 403 }
      )
    }

    // Fetch all active organizations from public schema
    // No tenant context needed since this queries public schema
    const result = await sql`
      SELECT
        id,
        slug,
        name,
        status,
        created_at
      FROM public.organizations
      WHERE status = 'active'
      ORDER BY name ASC
    `

    const tenants = result.rows.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      status: row.status as string,
    }))

    return NextResponse.json({ tenants })
  } catch (error) {
    logger.error('Failed to fetch tenants:', error)

    if ((error as Error).name === 'AuthenticationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
  }
}
