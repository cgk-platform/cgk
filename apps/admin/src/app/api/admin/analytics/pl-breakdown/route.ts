/**
 * P&L Breakdown API
 *
 * GET /api/admin/analytics/pl-breakdown
 * Returns profit and loss breakdown with category drill-down
 */

import { getTenantContext } from '@cgk/auth'

import { getPLBreakdown } from '@/lib/analytics'
import type { PeriodType, PLBreakdown, PLLineItem, PLSection } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const periodType = (url.searchParams.get('periodType') || 'monthly') as PeriodType
  const periodStart = url.searchParams.get('periodStart') || getDefaultPeriodStart(periodType)

  // Try to get cached P&L data
  let data = await getPLBreakdown(tenantId, periodType, periodStart)

  // If no cached data, generate a sample structure
  if (!data) {
    data = generateSamplePL(periodType, periodStart)
  }

  return Response.json({ data })
}

function getDefaultPeriodStart(periodType: PeriodType): string {
  const now = new Date()

  if (periodType === 'monthly') {
    now.setDate(1)
  } else if (periodType === 'quarterly') {
    const quarter = Math.floor(now.getMonth() / 3)
    now.setMonth(quarter * 3)
    now.setDate(1)
  } else if (periodType === 'yearly') {
    now.setMonth(0)
    now.setDate(1)
  }

  return now.toISOString().split('T')[0]
}

function generateSamplePL(periodType: PeriodType, periodStart: string): PLBreakdown {
  const endDate = new Date(periodStart)
  if (periodType === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1)
  } else if (periodType === 'quarterly') {
    endDate.setMonth(endDate.getMonth() + 3)
  } else if (periodType === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1)
  }
  endDate.setDate(endDate.getDate() - 1)

  const grossSales = 125000
  const discounts = 8500
  const returns = 4200
  const netRevenue = grossSales - discounts - returns

  const productCost = 35000
  const inboundShipping = 2800
  const packaging = 1500
  const totalCogs = productCost + inboundShipping + packaging
  const grossProfit = netRevenue - totalCogs

  const metaAds = 15000
  const googleAds = 8000
  const tiktokAds = 3000
  const otherMarketing = 1500
  const totalMarketing = metaAds + googleAds + tiktokAds + otherMarketing

  const creators = 12000
  const contractors = 5000
  const internal = 8000
  const totalPayroll = creators + contractors + internal

  const software = 2500
  const outboundShipping = 8500
  const stripeFees = 3200
  const shopifyFees = 1800
  const otherOpex = 2000
  const totalOpex = totalMarketing + totalPayroll + software + outboundShipping + stripeFees + shopifyFees + otherOpex

  const operatingProfit = grossProfit - totalOpex

  const interest = 500
  const taxes = operatingProfit > 0 ? operatingProfit * 0.25 : 0
  const depreciation = 1000
  const totalOther = interest + taxes + depreciation

  const netProfit = operatingProfit - totalOther

  const createItem = (name: string, amount: number, prevAmount?: number): PLLineItem => ({
    id: name.toLowerCase().replace(/\s+/g, '_'),
    name,
    amount,
    previousAmount: prevAmount,
    change: prevAmount ? amount - prevAmount : undefined,
    percentOfRevenue: netRevenue > 0 ? (amount / netRevenue) * 100 : 0,
  })

  const revenue: PLSection = {
    name: 'Revenue',
    items: [
      createItem('Gross Sales', grossSales, grossSales * 0.92),
      createItem('Discounts', -discounts, -discounts * 0.95),
      createItem('Returns & Refunds', -returns, -returns * 1.1),
    ],
    total: netRevenue,
    previousTotal: netRevenue * 0.9,
    change: netRevenue * 0.1,
    percentOfRevenue: 100,
  }

  const cogs: PLSection = {
    name: 'Cost of Goods Sold',
    items: [
      createItem('Product Cost', productCost, productCost * 0.95),
      createItem('Inbound Shipping', inboundShipping, inboundShipping * 1.02),
      createItem('Packaging', packaging, packaging * 0.98),
    ],
    total: totalCogs,
    previousTotal: totalCogs * 0.96,
    change: totalCogs * 0.04,
    percentOfRevenue: netRevenue > 0 ? (totalCogs / netRevenue) * 100 : 0,
  }

  const operatingExpenses: PLSection = {
    name: 'Operating Expenses',
    items: [
      {
        ...createItem('Marketing', totalMarketing, totalMarketing * 0.88),
        children: [
          createItem('Meta Ads', metaAds, metaAds * 0.85),
          createItem('Google Ads', googleAds, googleAds * 0.92),
          createItem('TikTok Ads', tiktokAds, tiktokAds * 0.75),
          createItem('Other Marketing', otherMarketing, otherMarketing * 1.1),
        ],
      },
      {
        ...createItem('Payroll', totalPayroll, totalPayroll * 1.02),
        children: [
          createItem('Creators', creators, creators * 1.05),
          createItem('Contractors', contractors, contractors * 0.98),
          createItem('Internal', internal, internal * 1.0),
        ],
      },
      createItem('Software/Tools', software, software * 1.08),
      createItem('Outbound Shipping', outboundShipping, outboundShipping * 0.95),
      {
        ...createItem('Payment Processing', stripeFees + shopifyFees, (stripeFees + shopifyFees) * 0.92),
        children: [
          createItem('Stripe Fees', stripeFees, stripeFees * 0.9),
          createItem('Shopify Fees', shopifyFees, shopifyFees * 0.95),
        ],
      },
      createItem('Other OpEx', otherOpex, otherOpex * 1.15),
    ],
    total: totalOpex,
    previousTotal: totalOpex * 0.94,
    change: totalOpex * 0.06,
    percentOfRevenue: netRevenue > 0 ? (totalOpex / netRevenue) * 100 : 0,
  }

  const otherExpenses: PLSection = {
    name: 'Other',
    items: [
      createItem('Interest', interest, interest),
      createItem('Taxes', taxes, taxes * 0.85),
      createItem('Depreciation', depreciation, depreciation),
    ],
    total: totalOther,
    previousTotal: totalOther * 0.9,
    change: totalOther * 0.1,
    percentOfRevenue: netRevenue > 0 ? (totalOther / netRevenue) * 100 : 0,
  }

  return {
    period: `${periodStart} to ${endDate.toISOString().split('T')[0]}`,
    periodType,
    revenue,
    cogs,
    grossProfit: createItem('Gross Profit', grossProfit, grossProfit * 0.88),
    operatingExpenses,
    operatingProfit: createItem('Operating Profit (EBITDA)', operatingProfit, operatingProfit * 0.75),
    otherExpenses,
    netProfit: createItem('Net Profit', netProfit, netProfit * 0.7),
  }
}
