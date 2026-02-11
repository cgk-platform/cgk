/**
 * SEO Content Gap Analyzer
 * Analyzes internal content coverage and identifies gaps
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  ContentGap,
  ContentGapAnalysis,
  GapType,
} from './types'

// Scoring weights for match types
const MATCH_SCORES = {
  primary: 100,
  secondary: 50,
  title: 30,
  content: 10,
} as const

/**
 * Get all content gaps
 */
export async function getContentGaps(): Promise<ContentGap[]> {
  const result = await sql<ContentGap>`
    SELECT id, keyword, gap_type, relevance_score,
           search_volume, difficulty, cpc, competitor_url,
           analyzed_at
    FROM seo_content_gaps
    ORDER BY relevance_score DESC NULLS LAST, analyzed_at DESC
  `
  return result.rows
}

/**
 * Get content gap by keyword
 */
export async function getContentGapByKeyword(keyword: string): Promise<ContentGap | null> {
  const result = await sql<ContentGap>`
    SELECT id, keyword, gap_type, relevance_score,
           search_volume, difficulty, cpc, competitor_url,
           analyzed_at
    FROM seo_content_gaps
    WHERE keyword = ${keyword}
  `
  return result.rows[0] || null
}

/**
 * Upsert a content gap
 */
export async function upsertContentGap(gap: {
  keyword: string
  gap_type: GapType
  relevance_score: number
  search_volume?: number
  difficulty?: number
  cpc?: number
  competitor_url?: string
}): Promise<ContentGap> {
  const result = await sql<ContentGap>`
    INSERT INTO seo_content_gaps (
      keyword, gap_type, relevance_score,
      search_volume, difficulty, cpc, competitor_url
    ) VALUES (
      ${gap.keyword},
      ${gap.gap_type}::seo_gap_type,
      ${gap.relevance_score},
      ${gap.search_volume ?? null},
      ${gap.difficulty ?? null},
      ${gap.cpc ?? null},
      ${gap.competitor_url ?? null}
    )
    ON CONFLICT (keyword) DO UPDATE SET
      gap_type = EXCLUDED.gap_type,
      relevance_score = EXCLUDED.relevance_score,
      search_volume = EXCLUDED.search_volume,
      difficulty = EXCLUDED.difficulty,
      cpc = EXCLUDED.cpc,
      competitor_url = EXCLUDED.competitor_url,
      analyzed_at = NOW()
    RETURNING id, keyword, gap_type, relevance_score,
              search_volume, difficulty, cpc, competitor_url,
              analyzed_at
  `
  return result.rows[0]!
}

/**
 * Delete a content gap
 */
export async function deleteContentGap(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM seo_content_gaps WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

/**
 * Clear all content gaps (before re-analysis)
 */
export async function clearContentGaps(): Promise<void> {
  await sql`DELETE FROM seo_content_gaps`
}

interface BlogPostForAnalysis {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  meta_title: string | null
  meta_description: string | null
  tags: string[]
}

/**
 * Analyze internal content coverage for a keyword
 */
export async function analyzeKeywordCoverage(keyword: string): Promise<ContentGapAnalysis> {
  const keywordLower = keyword.toLowerCase()

  // Get all published blog posts
  const postsResult = await sql<BlogPostForAnalysis>`
    SELECT id, title, slug, excerpt, body as content,
           seo_title as meta_title, seo_description as meta_description, tags
    FROM blog_posts
    WHERE status = 'published'
  `

  const matchedPosts: ContentGapAnalysis['matched_posts'] = []
  let totalScore = 0

  for (const post of postsResult.rows) {
    const titleLower = post.title.toLowerCase()
    const contentLower = post.content.toLowerCase()
    const metaTitleLower = (post.meta_title || '').toLowerCase()
    const metaDescLower = (post.meta_description || '').toLowerCase()
    const excerptLower = (post.excerpt || '').toLowerCase()
    const tagsLower = (post.tags || []).map((t: string) => t.toLowerCase())

    // Check for primary target (keyword in meta title or first in tags)
    if (metaTitleLower.includes(keywordLower) || tagsLower[0] === keywordLower) {
      matchedPosts.push({
        id: post.id,
        title: post.title,
        slug: post.slug,
        match_type: 'primary',
      })
      totalScore += MATCH_SCORES.primary
      continue
    }

    // Check for secondary target (keyword in tags or meta description)
    if (tagsLower.includes(keywordLower) || metaDescLower.includes(keywordLower)) {
      matchedPosts.push({
        id: post.id,
        title: post.title,
        slug: post.slug,
        match_type: 'secondary',
      })
      totalScore += MATCH_SCORES.secondary
      continue
    }

    // Check for title mention
    if (titleLower.includes(keywordLower)) {
      matchedPosts.push({
        id: post.id,
        title: post.title,
        slug: post.slug,
        match_type: 'title',
      })
      totalScore += MATCH_SCORES.title
      continue
    }

    // Check for content mention
    if (contentLower.includes(keywordLower) || excerptLower.includes(keywordLower)) {
      matchedPosts.push({
        id: post.id,
        title: post.title,
        slug: post.slug,
        match_type: 'content',
      })
      totalScore += MATCH_SCORES.content
    }
  }

  // Determine gap type
  let gapType: GapType
  const hasPrimary = matchedPosts.some((p) => p.match_type === 'primary')
  const hasSecondary = matchedPosts.some((p) => p.match_type === 'secondary')

  if (matchedPosts.length === 0) {
    gapType = 'no_content'
  } else if (!hasPrimary) {
    gapType = 'no_dedicated_page'
  } else if (!hasSecondary && matchedPosts.length <= 1) {
    gapType = 'weak_content'
  } else {
    // Has good coverage - this would be removed in gap analysis
    gapType = 'no_dedicated_page' // Fallback
  }

  return {
    keyword,
    gap_type: gapType,
    relevance_score: totalScore,
    matched_posts: matchedPosts,
  }
}

/**
 * Run full content gap analysis for all tracked keywords
 */
export async function runContentGapAnalysis(): Promise<ContentGap[]> {
  // Get all tracked keywords
  const keywordsResult = await sql<{ keyword: string }>`
    SELECT keyword FROM seo_keywords
  `

  const gaps: ContentGap[] = []

  for (const row of keywordsResult.rows) {
    const analysis = await analyzeKeywordCoverage(row.keyword)

    // Only store as gap if score is below threshold or no dedicated page
    if (analysis.relevance_score < MATCH_SCORES.primary) {
      const gap = await upsertContentGap({
        keyword: analysis.keyword,
        gap_type: analysis.gap_type,
        relevance_score: analysis.relevance_score,
      })
      gaps.push(gap)
    }
  }

  return gaps
}

/**
 * Get content gap suggestions based on analysis
 */
export async function getContentGapSuggestions(): Promise<{
  noContent: ContentGap[]
  weakContent: ContentGap[]
  noDedicatedPage: ContentGap[]
}> {
  const gaps = await getContentGaps()

  return {
    noContent: gaps.filter((g) => g.gap_type === 'no_content'),
    weakContent: gaps.filter((g) => g.gap_type === 'weak_content'),
    noDedicatedPage: gaps.filter((g) => g.gap_type === 'no_dedicated_page'),
  }
}

/**
 * Store competitor gap data (from DataForSEO or similar)
 */
export async function storeCompetitorGap(data: {
  keyword: string
  search_volume: number
  difficulty: number
  cpc: number
  competitor_url: string
}): Promise<ContentGap> {
  // First check if we have this keyword internally
  const analysis = await analyzeKeywordCoverage(data.keyword)

  return upsertContentGap({
    keyword: data.keyword,
    gap_type: analysis.gap_type,
    relevance_score: analysis.relevance_score,
    search_volume: data.search_volume,
    difficulty: data.difficulty,
    cpc: data.cpc,
    competitor_url: data.competitor_url,
  })
}

/**
 * Get high-priority gaps (external data with low internal coverage)
 */
export async function getHighPriorityGaps(): Promise<ContentGap[]> {
  const result = await sql<ContentGap>`
    SELECT id, keyword, gap_type, relevance_score,
           search_volume, difficulty, cpc, competitor_url,
           analyzed_at
    FROM seo_content_gaps
    WHERE search_volume IS NOT NULL
      AND search_volume > 100
      AND (difficulty IS NULL OR difficulty < 70)
      AND relevance_score < 50
    ORDER BY search_volume DESC
    LIMIT 20
  `
  return result.rows
}
