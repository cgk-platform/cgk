import { requireAuth } from '@cgk-platform/auth'
import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations - List all organizations (for super admins)
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    // Get organizations from public.organizations table
    const result = await sql`
      SELECT
        id,
        name,
        slug,
        status,
        COALESCE(
          shopify_config->>'checkoutDomain',
          shopify_store_domain
        ) as shopify_store_domain,
        created_at
      FROM public.organizations
      WHERE status IN ('active', 'onboarding', 'suspended')
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM public.organizations
      WHERE status IN ('active', 'onboarding', 'suspended')
    `
    const total = parseInt(countResult.rows[0]?.count || '0')

    return NextResponse.json({
      organizations: result.rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        status: row.status as string,
        shopifyStoreDomain: row.shopify_store_domain as string | null,
        createdAt: row.created_at as string,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Failed to fetch organizations:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}
