export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getProductCOGS } from '@/lib/finance'

/**
 * GET /api/admin/products/costs/export
 * Export all product COGS as CSV
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Fetch all product COGS (with high limit for export)
  const { rows } = await getProductCOGS(tenantSlug, tenantId, {
    page: 1,
    limit: 50000, // High limit for full export
  })

  // Generate CSV content
  const csvRows: string[] = [
    // Header row
    'product_id,variant_id,sku,cogs_cents,cogs_dollars,source,updated_at',
  ]

  for (const row of rows) {
    const cogsDollars = (row.cogsCents / 100).toFixed(2)
    csvRows.push(
      [
        escapeCSV(row.productId),
        escapeCSV(row.variantId ?? ''),
        escapeCSV(row.sku ?? ''),
        row.cogsCents.toString(),
        cogsDollars,
        escapeCSV(row.source),
        escapeCSV(row.updatedAt),
      ].join(','),
    )
  }

  const csvContent = csvRows.join('\n')

  // Return as CSV download
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="product-cogs-${tenantSlug}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}

function escapeCSV(value: string): string {
  if (!value) return ''
  // If the value contains a comma, quote, or newline, wrap it in quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
