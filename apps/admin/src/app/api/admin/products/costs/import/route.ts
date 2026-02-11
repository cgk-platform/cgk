export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  bulkUpsertProductCOGS,
  logPLConfigChange,
  type ProductCOGSImportRow,
} from '@/lib/finance'

interface ParsedRow {
  sku?: string
  variantId?: string
  productId?: string
  cogsCents: number
}

/**
 * POST /api/admin/products/costs/import
 * Import product COGS from CSV data
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    rows: ProductCOGSImportRow[]
    dryRun?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validation
  if (!body.rows || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'Rows array is required' }, { status: 400 })
  }

  if (body.rows.length === 0) {
    return NextResponse.json({ error: 'Rows array cannot be empty' }, { status: 400 })
  }

  if (body.rows.length > 10000) {
    return NextResponse.json(
      { error: 'Maximum 10,000 rows per import' },
      { status: 400 },
    )
  }

  // Parse and validate rows
  const errors: Array<{ row: number; error: string }> = []
  const validRows: ParsedRow[] = []

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i]
    const rowNum = i + 1

    // Must have at least one identifier
    if (!row.sku && !row.variantId && !row.productId) {
      errors.push({ row: rowNum, error: 'Must have sku, variantId, or productId' })
      continue
    }

    // Must have valid COGS
    if (typeof row.cogsCents !== 'number' || row.cogsCents < 0) {
      errors.push({ row: rowNum, error: 'Invalid cogsCents value' })
      continue
    }

    // For now, we require productId (sku lookup would need product catalog)
    // In a full implementation, we would look up productId from SKU
    if (!row.productId && !row.variantId) {
      if (row.sku) {
        errors.push({ row: rowNum, error: 'SKU lookup not implemented. Please provide productId.' })
        continue
      }
    }

    validRows.push({
      sku: row.sku,
      variantId: row.variantId,
      productId: row.productId,
      cogsCents: Math.round(row.cogsCents),
    })
  }

  // If dry run, return validation results without applying changes
  if (body.dryRun) {
    return NextResponse.json({
      dryRun: true,
      totalRows: body.rows.length,
      validRows: validRows.length,
      errorRows: errors.length,
      errors: errors.slice(0, 100), // Limit to first 100 errors
      preview: validRows.slice(0, 10), // Preview first 10 valid rows
    })
  }

  // Apply the import
  if (validRows.length === 0) {
    return NextResponse.json(
      { error: 'No valid rows to import', errors: errors.slice(0, 100) },
      { status: 400 },
    )
  }

  // Convert to bulk update format
  const products = validRows
    .filter((r): r is ParsedRow & { productId: string } => !!r.productId)
    .map((r) => ({
      productId: r.productId,
      variantId: r.variantId,
      cogsCents: r.cogsCents,
    }))

  const affectedCount = await bulkUpsertProductCOGS(
    tenantSlug,
    tenantId,
    { products, source: 'csv_import' },
    userId,
  )

  // Log the import
  await logPLConfigChange(tenantSlug, tenantId, 'product_cogs', 'import', userId, {
    newValue: {
      totalRows: body.rows.length,
      importedCount: affectedCount,
      errorCount: errors.length,
    },
    ipAddress: headerList.get('x-forwarded-for') ?? undefined,
    userAgent: headerList.get('user-agent') ?? undefined,
  })

  return NextResponse.json({
    success: true,
    totalRows: body.rows.length,
    importedCount: affectedCount,
    errorCount: errors.length,
    errors: errors.slice(0, 100),
    message: `Imported ${affectedCount} of ${body.rows.length} rows`,
  })
}
