export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreatorsForExport } from '@/lib/creators/db'
import type { ExportConfig, ExportField } from '@/lib/creators/types'
import { ALL_EXPORT_FIELDS, DEFAULT_EXPORT_FIELDS } from '@/lib/creators/types'

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function getFieldValue(
  row: Record<string, unknown>,
  field: ExportField,
): string {
  switch (field) {
    case 'id':
      return escapeCSV(row.id as string)
    case 'name':
      return escapeCSV(row.name as string)
    case 'email':
      return escapeCSV(row.email as string)
    case 'phone':
      return escapeCSV(row.phone as string)
    case 'status':
      return escapeCSV(row.status as string)
    case 'tier':
      return escapeCSV(row.tier as string)
    case 'commission_percent':
      return String(row.commission_percent || 0)
    case 'discount_code':
      return escapeCSV(row.discount_code as string)
    case 'lifetime_earnings':
      return formatMoney(Number(row.lifetime_earnings_cents || 0))
    case 'projects_completed':
      return String(row.projects_completed || 0)
    case 'last_active':
      return formatDate(row.last_active as string)
    case 'created_at':
      return formatDate(row.created_at as string)
    case 'tags':
      return escapeCSV(Array.isArray(row.tags) ? row.tags.join(', ') : '')
    case 'address':
      return '' // Would need shipping address data
    default:
      return ''
  }
}

function getFieldLabel(field: ExportField): string {
  const fieldConfig = ALL_EXPORT_FIELDS.find((f) => f.field === field)
  return fieldConfig?.label || field
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<ExportConfig>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const format = body.format || 'csv'
  if (!['csv', 'xlsx'].includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Must be csv or xlsx' },
      { status: 400 },
    )
  }

  // Validate fields
  const validFields = ALL_EXPORT_FIELDS.map((f) => f.field)
  const fields: ExportField[] = body.fields || DEFAULT_EXPORT_FIELDS
  const invalidFields = fields.filter((f) => !validFields.includes(f))
  if (invalidFields.length > 0) {
    return NextResponse.json(
      { error: `Invalid fields: ${invalidFields.join(', ')}` },
      { status: 400 },
    )
  }

  const exportConfig: ExportConfig = {
    format,
    fields,
    filters: body.filters || {},
    selectedIds: body.selectedIds,
    includeArchived: body.includeArchived || false,
  }

  const rows = await getCreatorsForExport(tenantSlug, exportConfig)

  if (format === 'csv') {
    // Build CSV content
    const headerRow = fields.map(getFieldLabel).join(',')
    const dataRows = rows.map((row) =>
      fields.map((field) => getFieldValue(row, field)).join(','),
    )
    const csvContent = [headerRow, ...dataRows].join('\n')

    const filename = `creators-export-${new Date().toISOString().split('T')[0]}.csv`

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // For XLSX, we return JSON data that the client can convert
  // (Full XLSX generation would require a library like exceljs on the server)
  return NextResponse.json({
    success: true,
    format: 'json',
    headers: fields.map(getFieldLabel),
    rows: rows.map((row) =>
      fields.reduce(
        (acc, field) => {
          acc[field] = getFieldValue(row, field)
          return acc
        },
        {} as Record<string, string>,
      ),
    ),
    total: rows.length,
  })
}
