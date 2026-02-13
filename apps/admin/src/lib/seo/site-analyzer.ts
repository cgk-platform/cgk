/**
 * SEO Site Analyzer
 * Page-by-page SEO analysis and scoring
 * All operations must be called within withTenant() context
 */
import { sql, createTenantCache } from '@cgk-platform/db'

import type { SEOAudit, PageSEOAnalysis, AuditSummary } from './types'

// Maximum audits to retain per tenant
const MAX_AUDITS = 30

// Scoring deductions
const SCORE_DEDUCTIONS = {
  critical: 15,
  warning: 5,
  imageAlt: 2, // Per image, max 10 total
} as const

/**
 * Analyze a page's SEO elements
 */
export function analyzePageContent(
  url: string,
  html: string,
  targetKeyword?: string
): PageSEOAnalysis {
  let score = 100
  const criticalIssues: string[] = []
  const warnings: string[] = []
  const passed: string[] = []

  // Parse HTML content
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch?.[1]?.trim() ?? null

  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
  const metaDescription = metaDescMatch?.[1]?.trim() ?? null

  const h1Matches = html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/gi)
  const h1s = Array.from(h1Matches).map((m) => m[1]?.trim() ?? '')

  const h2Matches = html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/gi)
  const h2s = Array.from(h2Matches).map((m) => m[1]?.trim() ?? '')

  const imgMatches = html.matchAll(/<img[^>]*>/gi)
  const images = Array.from(imgMatches)
  const imagesWithAlt = images.filter((img) => /alt=["'][^"']+["']/i.test(img[0]))
  const imagesWithoutAlt = images
    .filter((img) => !/alt=["'][^"']+["']/i.test(img[0]))
    .map((img) => {
      const srcMatch = img[0].match(/src=["']([^"']+)["']/i)
      return { src: srcMatch?.[1] ?? 'unknown' }
    })

  const internalLinkMatches = html.matchAll(/<a[^>]*href=["']\/[^"']*["'][^>]*>/gi)
  const externalLinkMatches = html.matchAll(/<a[^>]*href=["']https?:\/\/[^"']*["'][^>]*>/gi)
  const internalLinks = Array.from(internalLinkMatches).length
  const externalLinks = Array.from(externalLinkMatches).length

  const schemaMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]*)<\/script>/gi)
  const hasSchema = !!schemaMatch
  const schemaTypes: string[] = []
  if (schemaMatch) {
    for (const match of schemaMatch) {
      try {
        const jsonMatch = match.match(/>([^<]*)</)?.[1]
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch)
          if (parsed['@type']) schemaTypes.push(parsed['@type'])
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  // Title analysis
  const titleIssues: string[] = []
  if (!title) {
    criticalIssues.push('Missing title tag')
    score -= SCORE_DEDUCTIONS.critical
    titleIssues.push('Title is missing')
  } else {
    passed.push('Title tag present')
    if (title.length < 30) {
      warnings.push('Title is too short (less than 30 characters)')
      score -= SCORE_DEDUCTIONS.warning
      titleIssues.push('Too short (under 30 chars)')
    } else if (title.length > 60) {
      warnings.push('Title is too long (more than 60 characters)')
      score -= SCORE_DEDUCTIONS.warning
      titleIssues.push('Too long (over 60 chars)')
    } else {
      passed.push('Title length is optimal')
    }
  }

  // Meta description analysis
  const metaDescIssues: string[] = []
  if (!metaDescription) {
    criticalIssues.push('Missing meta description')
    score -= SCORE_DEDUCTIONS.critical
    metaDescIssues.push('Meta description is missing')
  } else {
    passed.push('Meta description present')
    if (metaDescription.length < 120) {
      warnings.push('Meta description is too short (less than 120 characters)')
      score -= SCORE_DEDUCTIONS.warning
      metaDescIssues.push('Too short (under 120 chars)')
    } else if (metaDescription.length > 160) {
      warnings.push('Meta description is too long (more than 160 characters)')
      score -= SCORE_DEDUCTIONS.warning
      metaDescIssues.push('Too long (over 160 chars)')
    } else {
      passed.push('Meta description length is optimal')
    }
  }

  // H1 analysis
  const headingIssues: string[] = []
  if (h1s.length === 0) {
    criticalIssues.push('Missing H1 tag')
    score -= SCORE_DEDUCTIONS.critical
    headingIssues.push('No H1 tag found')
  } else if (h1s.length > 1) {
    warnings.push(`Multiple H1 tags found (${h1s.length})`)
    score -= SCORE_DEDUCTIONS.warning
    headingIssues.push(`Multiple H1 tags (${h1s.length})`)
  } else {
    passed.push('Single H1 tag present')
  }

  // Image alt analysis
  const imageIssues: string[] = []
  const missingAltCount = imagesWithoutAlt.length
  if (missingAltCount > 0) {
    const deduction = Math.min(missingAltCount * SCORE_DEDUCTIONS.imageAlt, 10)
    score -= deduction
    warnings.push(`${missingAltCount} image(s) missing alt text`)
    imageIssues.push(`${missingAltCount} images without alt text`)
  }
  if (images.length > 0 && missingAltCount === 0) {
    passed.push('All images have alt text')
  }

  // Internal links analysis
  const linkIssues: string[] = []
  if (internalLinks < 2) {
    warnings.push('Fewer than 2 internal links')
    score -= SCORE_DEDUCTIONS.warning
    linkIssues.push('Needs more internal links')
  } else {
    passed.push('Adequate internal linking')
  }

  // Schema analysis
  const schemaIssues: string[] = []
  if (!hasSchema) {
    warnings.push('Missing structured data')
    score -= SCORE_DEDUCTIONS.warning
    schemaIssues.push('No JSON-LD schema found')
  } else {
    passed.push('Structured data present')
  }

  // Keyword analysis
  const hasKeywordInH1 = targetKeyword
    ? h1s.some((h1) => h1.toLowerCase().includes(targetKeyword.toLowerCase()))
    : false
  const hasKeywordInTitle = targetKeyword && title
    ? title.toLowerCase().includes(targetKeyword.toLowerCase())
    : false

  return {
    url,
    score: Math.max(0, score),
    title: {
      value: title,
      length: title?.length || 0,
      hasKeyword: hasKeywordInTitle,
      issues: titleIssues,
    },
    metaDescription: {
      value: metaDescription,
      length: metaDescription?.length || 0,
      issues: metaDescIssues,
    },
    headings: {
      h1Count: h1s.length,
      h1s,
      h2Count: h2s.length,
      hasKeywordInH1,
      issues: headingIssues,
    },
    images: {
      total: images.length,
      withAlt: imagesWithAlt.length,
      withoutAlt: imagesWithoutAlt,
      issues: imageIssues,
    },
    links: {
      internal: internalLinks,
      external: externalLinks,
      broken: [], // Would require actual link checking
      issues: linkIssues,
    },
    schema: {
      hasSchema,
      types: schemaTypes,
      issues: schemaIssues,
    },
    criticalIssues,
    warnings,
    passed,
  }
}

/**
 * Get all audits
 */
export async function getAudits(): Promise<SEOAudit[]> {
  const result = await sql<SEOAudit>`
    SELECT id, total_pages, average_score, critical_issues,
           warnings, passed, page_results, started_at, completed_at
    FROM seo_audits
    ORDER BY started_at DESC
    LIMIT ${MAX_AUDITS}
  `

  return result.rows.map((row) => ({
    ...row,
    page_results: typeof row.page_results === 'string'
      ? JSON.parse(row.page_results)
      : row.page_results,
  }))
}

/**
 * Get a single audit by ID
 */
export async function getAuditById(id: string): Promise<SEOAudit | null> {
  const result = await sql<SEOAudit>`
    SELECT id, total_pages, average_score, critical_issues,
           warnings, passed, page_results, started_at, completed_at
    FROM seo_audits
    WHERE id = ${id}
  `

  const audit = result.rows[0]
  if (!audit) return null

  return {
    ...audit,
    page_results: typeof audit.page_results === 'string'
      ? JSON.parse(audit.page_results)
      : audit.page_results,
  }
}

/**
 * Get the latest audit
 */
export async function getLatestAudit(): Promise<SEOAudit | null> {
  const result = await sql<SEOAudit>`
    SELECT id, total_pages, average_score, critical_issues,
           warnings, passed, page_results, started_at, completed_at
    FROM seo_audits
    ORDER BY started_at DESC
    LIMIT 1
  `

  const audit = result.rows[0]
  if (!audit) return null

  return {
    ...audit,
    page_results: typeof audit.page_results === 'string'
      ? JSON.parse(audit.page_results)
      : audit.page_results,
  }
}

/**
 * Create a new audit
 */
export async function createAudit(
  pageResults: PageSEOAnalysis[]
): Promise<SEOAudit> {
  // Calculate summary stats
  const totalPages = pageResults.length
  const totalScore = pageResults.reduce((sum, p) => sum + p.score, 0)
  const averageScore = totalPages > 0 ? Math.round(totalScore / totalPages) : 0

  let criticalCount = 0
  let warningCount = 0
  let passedCount = 0

  for (const page of pageResults) {
    criticalCount += page.criticalIssues.length
    warningCount += page.warnings.length
    passedCount += page.passed.length
  }

  const result = await sql<SEOAudit>`
    INSERT INTO seo_audits (
      total_pages, average_score, critical_issues,
      warnings, passed, page_results, completed_at
    ) VALUES (
      ${totalPages},
      ${averageScore},
      ${criticalCount},
      ${warningCount},
      ${passedCount},
      ${JSON.stringify(pageResults)}::jsonb,
      NOW()
    )
    RETURNING id, total_pages, average_score, critical_issues,
              warnings, passed, page_results, started_at, completed_at
  `

  // Cleanup old audits
  await cleanupOldAudits()

  const audit = result.rows[0]!
  return {
    ...audit,
    page_results: typeof audit.page_results === 'string'
      ? JSON.parse(audit.page_results)
      : audit.page_results,
  }
}

/**
 * Delete old audits beyond retention limit
 */
async function cleanupOldAudits(): Promise<void> {
  await sql`
    DELETE FROM seo_audits
    WHERE id NOT IN (
      SELECT id FROM seo_audits
      ORDER BY started_at DESC
      LIMIT ${MAX_AUDITS}
    )
  `
}

/**
 * Get audit summary for dashboard
 */
export async function getAuditSummary(): Promise<AuditSummary> {
  const audits = await getAudits()

  if (audits.length === 0) {
    return {
      latestAudit: null,
      previousAudit: null,
      scoreChange: 0,
      totalAudits: 0,
    }
  }

  const latestAudit = audits[0] ?? null
  const previousAudit = audits.length > 1 ? (audits[1] ?? null) : null
  const scoreChange = previousAudit && latestAudit
    ? latestAudit.average_score - previousAudit.average_score
    : 0

  return {
    latestAudit,
    previousAudit,
    scoreChange,
    totalAudits: audits.length,
  }
}

/**
 * Cache audit results for 24 hours
 */
export async function getCachedAudit(tenantSlug: string): Promise<SEOAudit | null> {
  const cache = createTenantCache(tenantSlug)
  const result = await cache.get<SEOAudit>('seo-audit-latest')
  return result ?? null
}

export async function setCachedAudit(tenantSlug: string, audit: SEOAudit): Promise<void> {
  const cache = createTenantCache(tenantSlug)
  await cache.set('seo-audit-latest', audit, { ttl: 86400 }) // 24 hours
}

/**
 * Get default pages to analyze for a site
 */
export function getDefaultPagesToAnalyze(): string[] {
  return [
    '/',
    '/blog',
    '/products',
    '/collections',
    '/about',
    '/contact',
    '/faq',
    '/quiz',
  ]
}

/**
 * Get all analyzable pages from the database
 */
export async function getAnalyzablePages(): Promise<string[]> {
  const defaultPages = getDefaultPagesToAnalyze()

  // Get published blog posts
  const blogResult = await sql<{ slug: string }>`
    SELECT slug FROM blog_posts WHERE status = 'published'
  `
  const blogPages = blogResult.rows.map((r) => `/blog/${r.slug}`)

  // Get published landing pages
  const landingResult = await sql<{ slug: string }>`
    SELECT slug FROM landing_pages WHERE status = 'published'
  `
  const landingPages = landingResult.rows.map((r) => `/${r.slug}`)

  return [...defaultPages, ...blogPages, ...landingPages]
}

/**
 * Compare two audits
 */
export function compareAudits(
  current: SEOAudit,
  previous: SEOAudit
): {
  scoreChange: number
  criticalChange: number
  warningChange: number
  passedChange: number
  improvedPages: string[]
  declinedPages: string[]
} {
  const scoreChange = current.average_score - previous.average_score
  const criticalChange = current.critical_issues - previous.critical_issues
  const warningChange = current.warnings - previous.warnings
  const passedChange = current.passed - previous.passed

  const improvedPages: string[] = []
  const declinedPages: string[] = []

  // Compare individual pages
  const previousPageMap = new Map<string, PageSEOAnalysis>()
  for (const page of previous.page_results) {
    previousPageMap.set(page.url, page)
  }

  for (const page of current.page_results) {
    const prevPage = previousPageMap.get(page.url)
    if (prevPage) {
      const diff = page.score - prevPage.score
      if (diff > 5) improvedPages.push(page.url)
      else if (diff < -5) declinedPages.push(page.url)
    }
  }

  return {
    scoreChange,
    criticalChange,
    warningChange,
    passedChange,
    improvedPages,
    declinedPages,
  }
}
