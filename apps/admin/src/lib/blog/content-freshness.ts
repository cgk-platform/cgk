/**
 * Content freshness tracking utilities
 * Categorizes content by how recently it was updated
 */

import type {
  BlogPost,
  ContentFreshness,
  FreshnessCategory,
  FreshnessDistribution,
} from './types'

/**
 * Freshness thresholds in days
 */
const FRESHNESS_THRESHOLDS = {
  FRESH: 30, // Updated within 30 days
  AGING: 90, // Updated 31-90 days ago
  STALE: 180, // Updated 91-180 days ago
  // OUTDATED: 180+ days ago
}

/**
 * Calculate days since a date
 */
function daysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get the freshness category based on days since update
 */
export function getFreshnessCategory(daysSinceUpdate: number): FreshnessCategory {
  if (daysSinceUpdate <= FRESHNESS_THRESHOLDS.FRESH) return 'fresh'
  if (daysSinceUpdate <= FRESHNESS_THRESHOLDS.AGING) return 'aging'
  if (daysSinceUpdate <= FRESHNESS_THRESHOLDS.STALE) return 'stale'
  return 'outdated'
}

/**
 * Get the freshness badge color
 */
export function getFreshnessColor(category: FreshnessCategory): string {
  switch (category) {
    case 'fresh':
      return 'green'
    case 'aging':
      return 'yellow'
    case 'stale':
      return 'orange'
    case 'outdated':
      return 'red'
  }
}

/**
 * Get a human-readable freshness label
 */
export function getFreshnessLabel(category: FreshnessCategory): string {
  switch (category) {
    case 'fresh':
      return 'Fresh'
    case 'aging':
      return 'Aging'
    case 'stale':
      return 'Stale'
    case 'outdated':
      return 'Outdated'
  }
}

/**
 * Get a detailed description of freshness status
 */
export function getFreshnessDescription(daysSinceUpdate: number): string {
  if (daysSinceUpdate === 0) return 'Updated today'
  if (daysSinceUpdate === 1) return 'Updated yesterday'
  if (daysSinceUpdate <= 7) return `Updated ${daysSinceUpdate} days ago`
  if (daysSinceUpdate <= 30) return `Updated ${Math.ceil(daysSinceUpdate / 7)} weeks ago`
  if (daysSinceUpdate <= 60) return 'Updated about a month ago'
  if (daysSinceUpdate <= 90) return 'Updated 2-3 months ago'
  if (daysSinceUpdate <= 180) return 'Updated 3-6 months ago'
  if (daysSinceUpdate <= 365) return `Updated ${Math.floor(daysSinceUpdate / 30)} months ago`
  return `Updated over a year ago`
}

/**
 * Analyze content freshness for a single post
 */
export function analyzeContentFreshness(post: BlogPost): ContentFreshness {
  // Use updated_at for freshness, or published_at if never updated
  const lastUpdated = post.updated_at || post.published_at || post.created_at
  const days = daysSince(lastUpdated)
  const category = getFreshnessCategory(days)

  return {
    postId: post.id,
    lastUpdated,
    daysSinceUpdate: days,
    category,
  }
}

/**
 * Calculate freshness distribution for a list of posts
 */
export function calculateFreshnessDistribution(
  posts: BlogPost[]
): FreshnessDistribution {
  const distribution: FreshnessDistribution = {
    fresh: 0,
    aging: 0,
    stale: 0,
    outdated: 0,
    total: posts.length,
  }

  for (const post of posts) {
    const freshness = analyzeContentFreshness(post)
    distribution[freshness.category]++
  }

  return distribution
}

/**
 * Get posts sorted by staleness (most stale first)
 */
export function sortPostsByFreshness(
  posts: BlogPost[],
  order: 'stale-first' | 'fresh-first' = 'stale-first'
): BlogPost[] {
  return [...posts].sort((a, b) => {
    const freshnessA = analyzeContentFreshness(a)
    const freshnessB = analyzeContentFreshness(b)

    if (order === 'stale-first') {
      return freshnessB.daysSinceUpdate - freshnessA.daysSinceUpdate
    }
    return freshnessA.daysSinceUpdate - freshnessB.daysSinceUpdate
  })
}

/**
 * Filter posts by freshness category
 */
export function filterPostsByFreshness(
  posts: BlogPost[],
  categories: FreshnessCategory[]
): BlogPost[] {
  return posts.filter((post) => {
    const freshness = analyzeContentFreshness(post)
    return categories.includes(freshness.category)
  })
}

/**
 * Get a list of posts that need attention (stale or outdated)
 */
export function getPostsNeedingRefresh(posts: BlogPost[]): BlogPost[] {
  return filterPostsByFreshness(posts, ['stale', 'outdated'])
}

/**
 * Calculate the percentage of content that is fresh
 */
export function calculateFreshnessScore(posts: BlogPost[]): number {
  if (posts.length === 0) return 100

  const distribution = calculateFreshnessDistribution(posts)
  const freshCount = distribution.fresh + distribution.aging
  return Math.round((freshCount / distribution.total) * 100)
}

/**
 * Get recommended refresh priority based on post characteristics
 */
export function getRefreshPriority(
  post: BlogPost,
  freshness: ContentFreshness
): 'high' | 'medium' | 'low' {
  // High priority: outdated and published posts
  if (freshness.category === 'outdated' && post.status === 'published') {
    return 'high'
  }

  // High priority: stale pillar posts (would need cluster info for full implementation)
  if (freshness.category === 'stale' && post.status === 'published') {
    return 'high'
  }

  // Medium priority: stale published posts
  if (freshness.category === 'stale') {
    return 'medium'
  }

  // Low priority: aging content
  if (freshness.category === 'aging') {
    return 'low'
  }

  return 'low'
}
