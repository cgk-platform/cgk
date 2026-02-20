/**
 * Creator Export - Transactions CSV API Route
 *
 * POST /api/creator/export/transactions - Generate and download transaction history as CSV
 */

import { sql } from '@cgk-platform/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number): string {
  const amount = cents / 100
  return amount >= 0 ? `$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`
}

/**
 * Format date to readable string
 */
function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Escape CSV field
 */
function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generate CSV from rows
 */
function generateCSV(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerRow = headers.map(escapeCSVField).join(',')
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCSVField(row[h] as string | number | null)).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Generate transaction CSV export
 */
export async function POST(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => {
      // Empty body is valid - dates will default to last 12 months
      return {}
    })
    const { startDate, endDate, types } = body as {
      startDate?: string
      endDate?: string
      types?: string[]
    }

    // Default to last 12 months if no dates specified
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())

    // Build query - types filter done in post-processing if needed
    const transactionsResult = await sql`
      SELECT
        created_at,
        type,
        description,
        amount_cents,
        balance_after_cents,
        order_id,
        payout_id
      FROM public.creator_balance_transactions
      WHERE creator_id = ${context.creatorId}
        AND created_at >= ${start.toISOString()}
        AND created_at <= ${end.toISOString()}
      ORDER BY created_at DESC
    `

    // Filter by types if specified
    const filteredRows = types && types.length > 0
      ? transactionsResult.rows.filter((row) => types.includes(row.type as string))
      : transactionsResult.rows

    // Transform data for CSV
    const rows = filteredRows.map((row) => ({
      Date: formatDate(row.created_at as string),
      Type: String(row.type).charAt(0).toUpperCase() + String(row.type).slice(1),
      Description: row.description || getDefaultDescription(row.type as string, row.order_id as string),
      Amount: formatCurrency(row.amount_cents as number),
      'Balance After': formatCurrency(row.balance_after_cents as number),
      'Reference ID': row.order_id || row.payout_id || '',
    }))

    // Generate CSV
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance After', 'Reference ID']
    const csv = generateCSV(headers, rows)

    // Create filename with date range
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    const filename = `transactions_${startStr}_to_${endStr}.csv`

    // Return CSV response
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating transaction CSV:', error)
    return Response.json({ error: 'Failed to generate CSV export' }, { status: 500 })
  }
}

/**
 * Get default description based on transaction type
 */
function getDefaultDescription(type: string, orderId?: string): string {
  switch (type) {
    case 'commission':
      return orderId ? `Commission from order ${orderId}` : 'Commission earned'
    case 'project':
      return 'Project payment'
    case 'bonus':
      return 'Bonus payment'
    case 'adjustment':
      return 'Account adjustment'
    case 'payout':
      return 'Withdrawal'
    case 'refund':
      return 'Refund adjustment'
    default:
      return type
  }
}
