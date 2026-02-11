export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { calculatePLStatement, calculatePLComparison } from '@/lib/expenses/pnl-calculator'
import type { PLStatement } from '@/lib/expenses/types'

/**
 * Format money for PDF display
 */
function formatMoney(cents: number): string {
  const isNegative = cents < 0
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(cents) / 100)
  return isNegative ? `(${formatted})` : formatted
}

/**
 * Generate PDF as HTML (for server-side rendering)
 * Returns HTML that can be converted to PDF client-side or server-side
 */
function generatePLHtml(
  statement: PLStatement,
  options: {
    tenantName: string
    generatedBy: string
    includeComparison?: boolean
    comparisonStatement?: PLStatement
  }
): string {
  const { tenantName, generatedBy, includeComparison, comparisonStatement } = options
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const renderChange = (percent?: number) => {
    if (percent === undefined) return ''
    const color = percent >= 0 ? '#16a34a' : '#dc2626'
    const arrow = percent >= 0 ? '&#9650;' : '&#9660;'
    return `<span style="color: ${color}; font-size: 12px; margin-left: 8px;">${arrow} ${Math.abs(percent).toFixed(1)}%</span>`
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>P&L Statement - ${tenantName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #1f2937;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header .subtitle {
      color: #6b7280;
      font-size: 14px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .line-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
    }
    .line-item.indent {
      padding-left: 20px;
    }
    .line-item.subtotal {
      font-weight: 600;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
      margin-top: 6px;
    }
    .line-item.total {
      font-weight: 700;
      font-size: 16px;
      border-top: 2px solid #1f2937;
      padding-top: 12px;
      margin-top: 12px;
    }
    .line-item.negative .amount {
      color: #dc2626;
    }
    .line-item .label {
      flex: 1;
    }
    .line-item .amount {
      text-align: right;
      min-width: 120px;
    }
    .line-item .percent {
      text-align: right;
      min-width: 80px;
      color: #6b7280;
      font-size: 12px;
    }
    .comparison-col {
      min-width: 100px;
      text-align: right;
      color: #6b7280;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    .net-profit.positive { color: #16a34a; }
    .net-profit.negative { color: #dc2626; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Profit & Loss Statement</h1>
    <div class="subtitle">${tenantName}</div>
    <div class="subtitle">${statement.period.label}</div>
    ${includeComparison && comparisonStatement ? `<div class="subtitle">Compared to: ${comparisonStatement.period.label}</div>` : ''}
  </div>

  <!-- REVENUE -->
  <div class="section">
    <div class="section-title">Revenue</div>
    <div class="line-item indent">
      <span class="label">Gross Sales</span>
      <span class="amount">${formatMoney(statement.revenue.gross_sales_cents)}</span>
    </div>
    <div class="line-item indent negative">
      <span class="label">Less: Discounts</span>
      <span class="amount">(${formatMoney(statement.revenue.discounts_cents)})</span>
    </div>
    <div class="line-item indent negative">
      <span class="label">Less: Returns</span>
      <span class="amount">(${formatMoney(statement.revenue.returns_cents)})</span>
    </div>
    <div class="line-item indent">
      <span class="label">Plus: Shipping Revenue</span>
      <span class="amount">${formatMoney(statement.revenue.shipping_revenue_cents)}</span>
    </div>
    <div class="line-item subtotal">
      <span class="label">Net Revenue</span>
      <span class="amount">${formatMoney(statement.revenue.net_revenue_cents)}${renderChange(statement.revenue.net_revenue_change_percent)}</span>
    </div>
  </div>

  <!-- COGS -->
  <div class="section">
    <div class="section-title">Cost of Goods Sold</div>
    <div class="line-item indent negative">
      <span class="label">Product Cost</span>
      <span class="amount">(${formatMoney(statement.cogs.product_cost_cents)})</span>
    </div>
    <div class="line-item subtotal">
      <span class="label">Gross Profit</span>
      <span class="amount">${formatMoney(statement.cogs.gross_profit_cents)}${renderChange(statement.cogs.gross_profit_change_percent)}</span>
      <span class="percent">${statement.cogs.gross_margin_percent.toFixed(1)}%</span>
    </div>
  </div>

  <!-- VARIABLE COSTS -->
  <div class="section">
    <div class="section-title">Variable Costs</div>
    <div class="line-item indent negative">
      <span class="label">Payment Processing</span>
      <span class="amount">(${formatMoney(statement.variable_costs.payment_processing_cents)})</span>
    </div>
    <div class="line-item indent negative">
      <span class="label">Shipping Costs</span>
      <span class="amount">(${formatMoney(statement.variable_costs.shipping_costs_cents)})</span>
    </div>
    <div class="line-item indent negative">
      <span class="label">Fulfillment</span>
      <span class="amount">(${formatMoney(statement.variable_costs.fulfillment_cents)})</span>
    </div>
    ${statement.variable_costs.other_cents > 0 ? `
    <div class="line-item indent negative">
      <span class="label">Other Variable Costs</span>
      <span class="amount">(${formatMoney(statement.variable_costs.other_cents)})</span>
    </div>
    ` : ''}
    <div class="line-item subtotal">
      <span class="label">Contribution Margin</span>
      <span class="amount">${formatMoney(statement.variable_costs.contribution_margin_cents)}</span>
      <span class="percent">${statement.variable_costs.contribution_margin_percent.toFixed(1)}%</span>
    </div>
  </div>

  <!-- MARKETING -->
  <div class="section">
    <div class="section-title">Marketing & Sales</div>
    ${statement.marketing.ad_spend_by_platform.map(p => `
    <div class="line-item indent negative">
      <span class="label">${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)} Ads</span>
      <span class="amount">(${formatMoney(p.spend_cents)})</span>
    </div>
    `).join('')}
    ${statement.marketing.creator_payouts_cents > 0 ? `
    <div class="line-item indent negative">
      <span class="label">Creator Payouts</span>
      <span class="amount">(${formatMoney(statement.marketing.creator_payouts_cents)})</span>
    </div>
    ` : ''}
    <div class="line-item subtotal">
      <span class="label">Contribution Profit</span>
      <span class="amount">${formatMoney(statement.marketing.contribution_profit_cents)}</span>
    </div>
  </div>

  <!-- OPERATING EXPENSES -->
  <div class="section">
    <div class="section-title">Operating Expenses</div>
    ${statement.operating.by_category.map(c => `
    <div class="line-item indent negative">
      <span class="label">${c.category_name}</span>
      <span class="amount">(${formatMoney(c.total_cents)})</span>
    </div>
    `).join('')}
    ${statement.operating.vendor_payouts_cents > 0 ? `
    <div class="line-item indent negative">
      <span class="label">Vendor Payments</span>
      <span class="amount">(${formatMoney(statement.operating.vendor_payouts_cents)})</span>
    </div>
    ` : ''}
    ${statement.operating.contractor_payouts_cents > 0 ? `
    <div class="line-item indent negative">
      <span class="label">Contractor Payments</span>
      <span class="amount">(${formatMoney(statement.operating.contractor_payouts_cents)})</span>
    </div>
    ` : ''}
    <div class="line-item subtotal">
      <span class="label">Operating Income</span>
      <span class="amount">${formatMoney(statement.operating.operating_income_cents)}</span>
    </div>
  </div>

  <!-- NET PROFIT -->
  <div class="section">
    <div class="line-item total ${statement.net_profit_cents >= 0 ? 'net-profit positive' : 'net-profit negative'}">
      <span class="label">Net Profit</span>
      <span class="amount">${formatMoney(statement.net_profit_cents)}${renderChange(statement.net_profit_change_percent)}</span>
      <span class="percent">${statement.net_margin_percent.toFixed(1)}%</span>
    </div>
  </div>

  <div class="footer">
    <div>Generated on ${now}</div>
    <div>Generated by ${generatedBy}</div>
  </div>
</body>
</html>
  `
}

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  // Date range
  const now = new Date()
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] as string
  const defaultEndDate = now.toISOString().split('T')[0] as string

  const startDate: string = url.searchParams.get('startDate') || defaultStartDate
  const endDate: string = url.searchParams.get('endDate') || defaultEndDate

  // Validate dates
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  // Options
  const comparison = url.searchParams.get('comparison') as 'previous_period' | 'year_over_year' | null
  const tenantName = url.searchParams.get('tenantName') || tenantSlug
  const generatedBy = url.searchParams.get('generatedBy') || 'System'
  const format = url.searchParams.get('format') || 'html'

  let statement: PLStatement
  let comparisonStatement: PLStatement | undefined

  if (comparison && ['previous_period', 'year_over_year'].includes(comparison)) {
    const result = await calculatePLComparison(tenantSlug, startDate, endDate, comparison)
    statement = result.current
    comparisonStatement = result.comparison || undefined
  } else {
    statement = await calculatePLStatement(tenantSlug, startDate, endDate)
  }

  const html = generatePLHtml(statement, {
    tenantName,
    generatedBy,
    includeComparison: !!comparison,
    comparisonStatement,
  })

  if (format === 'html') {
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  // For PDF, we return HTML that the client can convert
  // In a real implementation, you'd use a library like puppeteer or @react-pdf/renderer
  return NextResponse.json({
    html,
    filename: `PL-Statement-${startDate}-${endDate}.pdf`,
    statement,
  })
}
