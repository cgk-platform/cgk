export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getAudits,
  getAuditById,
  getLatestAudit,
  createAudit,
  getAuditSummary,
  analyzePageContent,
  getAnalyzablePages,
  compareAudits,
  getCachedAudit,
  setCachedAudit,
} from '@/lib/seo/site-analyzer'
import type { PageSEOAnalysis } from '@/lib/seo/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const auditId = searchParams.get('id')
  const view = searchParams.get('view') || 'latest'

  // Get a specific audit
  if (auditId) {
    const audit = await withTenant(tenantSlug, () => getAuditById(auditId))

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    return NextResponse.json({ audit })
  }

  // Get all audits
  if (view === 'all') {
    const audits = await withTenant(tenantSlug, () => getAudits())
    return NextResponse.json({ audits })
  }

  // Get audit summary
  if (view === 'summary') {
    const summary = await withTenant(tenantSlug, () => getAuditSummary())
    return NextResponse.json({ summary })
  }

  // Get comparison between latest two audits
  if (view === 'compare') {
    const audits = await withTenant(tenantSlug, () => getAudits())

    if (audits.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 audits to compare' },
        { status: 400 }
      )
    }

    const currentAudit = audits[0]!
    const previousAudit = audits[1]!
    const comparison = compareAudits(currentAudit, previousAudit)
    return NextResponse.json({
      current: currentAudit,
      previous: previousAudit,
      comparison,
    })
  }

  // Get cached latest audit
  const cached = await getCachedAudit(tenantSlug)
  if (cached) {
    return NextResponse.json({ audit: cached, cached: true })
  }

  // Get latest audit from database
  const audit = await withTenant(tenantSlug, () => getLatestAudit())
  return NextResponse.json({ audit, cached: false })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get pages to analyze
  const pages = await withTenant(tenantSlug, () => getAnalyzablePages())

  // Get the base URL from environment or request
  const baseUrl = process.env.STOREFRONT_URL || request.headers.get('origin') || 'http://localhost:3000'

  const pageResults: PageSEOAnalysis[] = []

  // Analyze each page
  for (const pagePath of pages) {
    try {
      // In a real implementation, you would fetch the actual HTML content
      // For now, we'll use a placeholder that would be replaced with actual fetching
      const fullUrl = `${baseUrl}${pagePath}`

      // Placeholder HTML - in production, you'd fetch this from the storefront
      const html = await fetchPageHtml(fullUrl)

      const analysis = analyzePageContent(pagePath, html)
      pageResults.push(analysis)
    } catch (err) {
      // Log error but continue with other pages
      console.error(`Failed to analyze ${pagePath}:`, err)
    }
  }

  if (pageResults.length === 0) {
    return NextResponse.json(
      { error: 'No pages could be analyzed' },
      { status: 400 }
    )
  }

  // Create the audit
  const audit = await withTenant(tenantSlug, () => createAudit(pageResults))

  // Cache the result
  await setCachedAudit(tenantSlug, audit)

  return NextResponse.json({
    success: true,
    audit,
    pagesAnalyzed: pageResults.length,
  })
}

/**
 * Fetch HTML content from a URL
 * In production, this would make actual HTTP requests
 */
async function fetchPageHtml(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CGK-SEO-Analyzer/1.0',
      },
      // Short timeout for local pages
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.text()
  } catch (err) {
    // Return minimal HTML for pages that can't be fetched
    // This allows the audit to continue with other pages
    console.warn(`Could not fetch ${url}:`, err)
    return `<!DOCTYPE html><html><head><title>Page Not Available</title></head><body></body></html>`
  }
}
