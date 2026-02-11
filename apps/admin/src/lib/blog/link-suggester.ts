/**
 * Link suggestion engine for blog posts
 * Suggests relevant internal links based on content analysis
 */

import type { BlogPost, BlogPostRow, BlogCluster, LinkSuggestion } from './types'
import { extractLinksFromContent } from './link-analyzer'

/**
 * Scoring weights for relevance calculation
 */
const RELEVANCE_WEIGHTS = {
  SAME_CLUSTER_PILLAR: 30,
  SAME_CLUSTER_SPOKE: 20,
  SAME_CATEGORY: 15,
  PER_SHARED_TAG: 5,
  MAX_TAG_BONUS: 25,
  PER_KEYWORD_OVERLAP: 2,
  MAX_KEYWORD_BONUS: 20,
  FEATURED_POST: 10,
  RECENT_POST: 5,
}

/**
 * Number of days a post is considered "recent"
 */
const RECENT_THRESHOLD_DAYS = 90

/**
 * Extract keywords from text (simple word extraction)
 */
function extractKeywords(text: string): Set<string> {
  // Remove markdown formatting
  const cleanText = text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')

  // Extract words (3+ chars, exclude common words)
  const commonWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
    'was', 'one', 'our', 'out', 'day', 'had', 'has', 'his', 'how', 'its',
    'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did',
    'get', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'have', 'this',
    'will', 'your', 'from', 'they', 'been', 'call', 'come', 'each', 'find',
    'first', 'long', 'made', 'make', 'many', 'more', 'most', 'than', 'that',
    'them', 'then', 'these', 'time', 'very', 'when', 'which', 'into', 'just',
    'what', 'about', 'some', 'could', 'other', 'there', 'their', 'would',
  ])

  const words = cleanText
    .split(/[\s\n.,!?;:()[\]{}]+/)
    .filter((word) => word.length >= 3 && !commonWords.has(word))

  return new Set(words)
}

/**
 * Calculate keyword overlap between two pieces of text
 */
function calculateKeywordOverlap(text1: string, text2: string): number {
  const keywords1 = extractKeywords(text1)
  const keywords2 = extractKeywords(text2)

  let overlap = 0
  for (const keyword of keywords1) {
    if (keywords2.has(keyword)) {
      overlap++
    }
  }

  return overlap
}

/**
 * Check if a post was published recently
 */
function isRecentPost(post: BlogPostRow): boolean {
  const publishedAt = post.published_at
  if (!publishedAt) return false

  const publishDate = new Date(publishedAt)
  const now = new Date()
  const daysDiff = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24)

  return daysDiff <= RECENT_THRESHOLD_DAYS
}

/**
 * Generate a suggested anchor text for a link
 */
function generateSuggestedAnchor(targetPost: BlogPostRow): string {
  // Use title, truncated if needed
  const title = targetPost.title
  if (title.length <= 50) return title

  // Try to find a natural break point
  const truncated = title.slice(0, 47)
  const lastSpace = truncated.lastIndexOf(' ')
  return lastSpace > 30 ? truncated.slice(0, lastSpace) + '...' : truncated + '...'
}

/**
 * Generate link suggestions for a post
 */
export function generateLinkSuggestions(
  sourcePost: BlogPost,
  allPosts: BlogPostRow[],
  clusters: BlogCluster[],
  postClusterMap: Map<string, { clusterId: string; role: string }>,
  maxSuggestions: number = 5
): LinkSuggestion[] {
  const suggestions: LinkSuggestion[] = []

  // Get existing internal links to exclude
  const existingLinks = extractLinksFromContent(sourcePost.content)
  const existingLinkUrls = new Set(existingLinks.map((l) => l.url.toLowerCase()))

  // Get source post cluster info
  const sourceClusterInfo = postClusterMap.get(sourcePost.id)
  const sourceCluster = sourceClusterInfo
    ? clusters.find((c) => c.id === sourceClusterInfo.clusterId)
    : null

  // Analyze each potential target post
  for (const targetPost of allPosts) {
    // Skip self
    if (targetPost.id === sourcePost.id) continue

    // Skip unpublished posts
    if (targetPost.status !== 'published') continue

    // Skip if already linked
    const targetUrl = `/blog/${targetPost.slug}`
    if (existingLinkUrls.has(targetUrl.toLowerCase())) continue
    if (existingLinkUrls.has(targetPost.slug.toLowerCase())) continue

    // Calculate relevance score
    let score = 0
    const matchDetails: string[] = []

    // Check cluster relationship
    const targetClusterInfo = postClusterMap.get(targetPost.id)
    if (sourceClusterInfo && targetClusterInfo) {
      if (sourceClusterInfo.clusterId === targetClusterInfo.clusterId) {
        if (targetClusterInfo.role === 'pillar') {
          score += RELEVANCE_WEIGHTS.SAME_CLUSTER_PILLAR
          matchDetails.push('Same cluster (pillar)')
        } else {
          score += RELEVANCE_WEIGHTS.SAME_CLUSTER_SPOKE
          matchDetails.push('Same cluster (spoke)')
        }
      }
    }

    // Check category
    if (sourcePost.category_id && sourcePost.category_id === targetPost.category_id) {
      score += RELEVANCE_WEIGHTS.SAME_CATEGORY
      matchDetails.push('Same category')
    }

    // Check shared tags
    const sourceTags = new Set(sourcePost.tags || [])
    const targetTags = targetPost.tags || []
    let sharedTags = 0
    for (const tag of targetTags) {
      if (sourceTags.has(tag)) {
        sharedTags++
      }
    }
    if (sharedTags > 0) {
      const tagBonus = Math.min(
        sharedTags * RELEVANCE_WEIGHTS.PER_SHARED_TAG,
        RELEVANCE_WEIGHTS.MAX_TAG_BONUS
      )
      score += tagBonus
      matchDetails.push(`${sharedTags} shared tag${sharedTags > 1 ? 's' : ''}`)
    }

    // Check keyword overlap
    const keywordOverlap = calculateKeywordOverlap(
      sourcePost.title + ' ' + sourcePost.content,
      targetPost.title + ' ' + (targetPost.content || '')
    )
    if (keywordOverlap > 0) {
      const keywordBonus = Math.min(
        keywordOverlap * RELEVANCE_WEIGHTS.PER_KEYWORD_OVERLAP,
        RELEVANCE_WEIGHTS.MAX_KEYWORD_BONUS
      )
      score += keywordBonus
      matchDetails.push(`${keywordOverlap} keyword overlap`)
    }

    // Check if target is featured (has featured image)
    if (targetPost.featured_image_url) {
      score += RELEVANCE_WEIGHTS.FEATURED_POST
      matchDetails.push('Featured post')
    }

    // Check if target is recent
    if (isRecentPost(targetPost)) {
      score += RELEVANCE_WEIGHTS.RECENT_POST
      matchDetails.push('Recent post')
    }

    // Only include if there's some relevance
    if (score > 0) {
      const suggestedAnchor = generateSuggestedAnchor(targetPost)
      const matchReason = matchDetails[0] || 'Related content'

      suggestions.push({
        targetPostId: targetPost.id,
        targetTitle: targetPost.title,
        targetSlug: targetPost.slug,
        relevanceScore: score,
        matchReason,
        matchDetails,
        suggestedAnchor,
        markdownLink: `[${suggestedAnchor}](/blog/${targetPost.slug})`,
      })
    }
  }

  // Sort by relevance score and return top suggestions
  return suggestions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxSuggestions)
}

/**
 * Get cluster-specific link suggestions
 * Prioritizes links within the same cluster
 */
export function getClusterLinkSuggestions(
  sourcePost: BlogPost,
  cluster: BlogCluster,
  clusterPosts: BlogPostRow[],
  maxSuggestions: number = 5
): LinkSuggestion[] {
  const suggestions: LinkSuggestion[] = []

  // Get existing internal links
  const existingLinks = extractLinksFromContent(sourcePost.content)
  const existingLinkUrls = new Set(existingLinks.map((l) => l.url.toLowerCase()))

  for (const targetPost of clusterPosts) {
    // Skip self and already linked
    if (targetPost.id === sourcePost.id) continue
    if (targetPost.status !== 'published') continue

    const targetUrl = `/blog/${targetPost.slug}`
    if (existingLinkUrls.has(targetUrl.toLowerCase())) continue

    const isPillar = targetPost.id === cluster.pillar_post_id
    const score = isPillar
      ? RELEVANCE_WEIGHTS.SAME_CLUSTER_PILLAR
      : RELEVANCE_WEIGHTS.SAME_CLUSTER_SPOKE

    const suggestedAnchor = generateSuggestedAnchor(targetPost)

    suggestions.push({
      targetPostId: targetPost.id,
      targetTitle: targetPost.title,
      targetSlug: targetPost.slug,
      relevanceScore: score,
      matchReason: isPillar ? 'Cluster pillar' : 'Same cluster',
      matchDetails: [isPillar ? 'Pillar post' : 'Spoke post', `Cluster: ${cluster.name}`],
      suggestedAnchor,
      markdownLink: `[${suggestedAnchor}](/blog/${targetPost.slug})`,
    })
  }

  return suggestions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxSuggestions)
}
