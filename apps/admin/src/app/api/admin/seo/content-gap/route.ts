export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getContentGaps,
  getContentGapSuggestions,
  runContentGapAnalysis,
  analyzeKeywordCoverage,
  getHighPriorityGaps,
} from '@/lib/seo/content-gap'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'all'
  const keyword = searchParams.get('keyword')

  // Analyze a single keyword
  if (keyword) {
    const analysis = await withTenant(tenantSlug, () => analyzeKeywordCoverage(keyword))
    return NextResponse.json({ analysis })
  }

  // Get grouped suggestions
  if (view === 'suggestions') {
    const suggestions = await withTenant(tenantSlug, () => getContentGapSuggestions())
    return NextResponse.json({ suggestions })
  }

  // Get high priority gaps (with external data)
  if (view === 'priority') {
    const gaps = await withTenant(tenantSlug, () => getHighPriorityGaps())
    return NextResponse.json({ gaps })
  }

  // Get all gaps
  const gaps = await withTenant(tenantSlug, () => getContentGaps())
  return NextResponse.json({ gaps })
}

export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Run full content gap analysis
  try {
    const gaps = await withTenant(tenantSlug, () => runContentGapAnalysis())

    return NextResponse.json({
      success: true,
      gapsFound: gaps.length,
      gaps,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
