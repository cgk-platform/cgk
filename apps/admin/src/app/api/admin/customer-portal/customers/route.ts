import { headers } from 'next/headers'

import { searchPortalCustomers } from '@/lib/customer-portal/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/customer-portal/customers?q=search
 * Search customers for portal lookup
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q') || ''
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)

  if (!query.trim()) {
    return Response.json({ customers: [] })
  }

  const customers = await searchPortalCustomers(tenantSlug, query, Math.min(limit, 100))
  return Response.json({ customers })
}
