import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { getContractorsForExport } from '@/lib/contractors/db'
import type { ContractorStatus } from '@/lib/contractors/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/contractors/export
 * Export contractors as CSV (max 10,000 rows)
 */
export async function GET(req: NextRequest) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)

  // Parse the same filters as the list endpoint
  const search = searchParams.get('search') || undefined
  const statusParam = searchParams.get('status')
  const status = statusParam ? (statusParam.split(',') as ContractorStatus[]) : undefined
  const tagsParam = searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined

  const contractors = await getContractorsForExport(tenantSlug, {
    search,
    status,
    tags,
  })

  // Build CSV content
  const csvHeaders = [
    'ID',
    'Name',
    'Email',
    'Status',
    'Tags',
    'Available Balance',
    'Pending Balance',
    'Active Projects',
    'Has Payment Method',
    'Has W-9',
    'Created At',
  ]

  const csvRows = contractors.map((c) => [
    c.id,
    `"${c.name.replace(/"/g, '""')}"`,
    c.email,
    c.status,
    `"${c.tags.join(', ')}"`,
    (c.balanceAvailableCents / 100).toFixed(2),
    (c.balancePendingCents / 100).toFixed(2),
    c.activeProjectCount,
    c.hasPaymentMethod ? 'Yes' : 'No',
    c.hasW9 ? 'Yes' : 'No',
    c.createdAt.toISOString(),
  ])

  const csvContent = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n')

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="contractors-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
