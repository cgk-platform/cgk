import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import {
  createContractor,
  getContractorDirectory,
} from '@/lib/contractors/db'
import type { ContractorStatus, CreateContractorRequest } from '@/lib/contractors/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/contractors
 * List contractors with search, filters, and pagination
 */
export async function GET(req: NextRequest) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)

  // Parse filters from query params
  const search = searchParams.get('search') || undefined
  const statusParam = searchParams.get('status')
  const status = statusParam ? (statusParam.split(',') as ContractorStatus[]) : undefined
  const tagsParam = searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined
  const hasPaymentMethod =
    searchParams.get('hasPaymentMethod') === 'true'
      ? true
      : searchParams.get('hasPaymentMethod') === 'false'
        ? false
        : undefined
  const hasW9 =
    searchParams.get('hasW9') === 'true'
      ? true
      : searchParams.get('hasW9') === 'false'
        ? false
        : undefined
  const sortBy = (searchParams.get('sort') as 'name' | 'createdAt' | 'balance' | 'projectCount') || 'createdAt'
  const sortDir = (searchParams.get('dir') as 'asc' | 'desc') || 'desc'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

  const result = await getContractorDirectory(tenantSlug, {
    search,
    status,
    tags,
    hasPaymentMethod,
    hasW9,
    sortBy,
    sortDir,
    page,
    limit,
  })

  return NextResponse.json(result)
}

/**
 * POST /api/admin/contractors
 * Create a new contractor
 */
export async function POST(req: NextRequest) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as CreateContractorRequest

  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: 'Name and email are required' },
      { status: 400 },
    )
  }

  const contractor = await createContractor(tenantSlug, tenantId, body)
  return NextResponse.json(contractor, { status: 201 })
}
