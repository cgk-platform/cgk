/**
 * Link analyzer for blog content
 * Extracts and analyzes internal/external links for link health assessment
 */

import type {
  BlogPost,
  BlogPostRow,
  ExtractedLink,
  PostLinkAnalysis,
  LinkHealthIssue,
  LinkHealthAnalysis,
} from './types'

/**
 * Authoritative domain patterns for external link quality
 */
const AUTHORITATIVE_PATTERNS = [
  // Government
  /\.gov$/i,
  /\.gov\.[a-z]{2}$/i,
  // Education
  /\.edu$/i,
  /\.ac\.[a-z]{2}$/i,
  // Scientific journals
  /pubmed\.ncbi\.nlm\.nih\.gov/i,
  /nature\.com$/i,
  /sciencedirect\.com$/i,
  /springer\.com$/i,
  /wiley\.com$/i,
  /tandfonline\.com$/i,
  /jstor\.org$/i,
  /ncbi\.nlm\.nih\.gov/i,
  /nih\.gov$/i,
  /who\.int$/i,
  // Medical authorities
  /mayoclinic\.org$/i,
  /cdc\.gov$/i,
  /fda\.gov$/i,
  // Standards bodies
  /iso\.org$/i,
  /ieee\.org$/i,
  /w3\.org$/i,
]

/**
 * Product URL patterns to detect links to products
 */
const PRODUCT_URL_PATTERNS = [
  /\/products?\//i,
  /\/shop\//i,
  /\/store\//i,
  /\/buy\//i,
  /\/collection[s]?\//i,
]

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Check if a domain is authoritative
 */
function isAuthoritativeDomain(domain: string): boolean {
  return AUTHORITATIVE_PATTERNS.some((pattern) => pattern.test(domain))
}

/**
 * Check if a URL points to a product
 */
function isProductUrl(url: string): boolean {
  return PRODUCT_URL_PATTERNS.some((pattern) => pattern.test(url))
}

/**
 * Check if a URL is internal (relative or same domain)
 */
function isInternalUrl(url: string, baseDomain?: string): boolean {
  // Relative URLs are internal
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true
  }

  // Anchor links are internal
  if (url.startsWith('#')) {
    return true
  }

  // Check domain if provided
  if (baseDomain) {
    const domain = extractDomain(url)
    return domain === baseDomain || domain?.endsWith('.' + baseDomain) === true
  }

  return false
}

/**
 * Extract all links from markdown content
 */
export function extractLinksFromContent(
  content: string,
  baseDomain?: string
): ExtractedLink[] {
  const links: ExtractedLink[] = []

  // Match markdown links [text](url)
  const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let match

  while ((match = markdownLinkPattern.exec(content)) !== null) {
    const text = match[1]
    const url = match[2].split(' ')[0] // Remove title if present

    // Skip anchor-only links and empty URLs
    if (!url || url === '#') continue

    const domain = extractDomain(url)
    const isInternal = isInternalUrl(url, baseDomain)
    const isAuthoritative = domain ? isAuthoritativeDomain(domain) : false

    links.push({
      url,
      text,
      isInternal,
      isAuthoritative,
      domain,
    })
  }

  // Match raw URLs (not already in markdown format)
  const rawUrlPattern = /(?<!\]\()https?:\/\/[^\s\)>"]+/g
  while ((match = rawUrlPattern.exec(content)) !== null) {
    const url = match[0]

    // Skip if this URL is already captured as markdown link
    const alreadyCaptured = links.some((l) => l.url === url)
    if (alreadyCaptured) continue

    const domain = extractDomain(url)
    const isInternal = isInternalUrl(url, baseDomain)
    const isAuthoritative = domain ? isAuthoritativeDomain(domain) : false

    links.push({
      url,
      text: url,
      isInternal,
      isAuthoritative,
      domain,
    })
  }

  return links
}

/**
 * Analyze links for a single post
 */
export function analyzePostLinks(
  post: BlogPost,
  allPosts: BlogPostRow[],
  baseDomain?: string
): PostLinkAnalysis {
  const links = extractLinksFromContent(post.content, baseDomain)

  const internalLinks = links.filter((l) => l.isInternal)
  const externalLinks = links.filter((l) => !l.isInternal)

  // Check for product links
  const hasProductLinks = links.some((l) => isProductUrl(l.url))

  // Count authoritative external links
  const authoritativeExternalCount = externalLinks.filter(
    (l) => l.isAuthoritative
  ).length

  // Find incoming links (other posts that link to this one)
  const incomingLinks: string[] = []
  const postSlug = post.slug
  const postUrlPatterns = [
    `/${postSlug}`,
    `/blog/${postSlug}`,
    `/posts/${postSlug}`,
  ]

  for (const otherPost of allPosts) {
    if (otherPost.id === post.id) continue

    const otherLinks = extractLinksFromContent(otherPost.content, baseDomain)
    const linksToThisPost = otherLinks.some((l) =>
      postUrlPatterns.some((pattern) => l.url.includes(pattern))
    )

    if (linksToThisPost) {
      incomingLinks.push(otherPost.id)
    }
  }

  return {
    postId: post.id,
    internalLinks,
    externalLinks,
    incomingLinks,
    hasProductLinks,
    authoritativeExternalCount,
  }
}

/**
 * Perform full link health analysis across all posts
 */
export function analyzeLinkHealth(
  posts: BlogPostRow[],
  clusterData?: Map<string, { clusterId: string; role: string; pillarPostId?: string }>,
  baseDomain?: string
): LinkHealthAnalysis {
  const issues: LinkHealthIssue[] = []
  const postAnalyses = new Map<string, PostLinkAnalysis>()

  // Analyze each post
  for (const post of posts) {
    const analysis = analyzePostLinks(post, posts, baseDomain)
    postAnalyses.set(post.id, analysis)
  }

  // Check for orphaned posts (no incoming links)
  let orphanedPosts = 0
  for (const post of posts) {
    const analysis = postAnalyses.get(post.id)!
    if (analysis.incomingLinks.length === 0 && post.status === 'published') {
      orphanedPosts++
      issues.push({
        type: 'ORPHAN',
        severity: 'critical',
        postId: post.id,
        postTitle: post.title,
        details: 'This post has no internal links pointing to it',
        suggestedFix: 'Add links from related posts or the pillar post in its cluster',
      })
    }
  }

  // Check for one-way links (spoke doesn't link back to pillar)
  let oneWayLinks = 0
  if (clusterData) {
    for (const post of posts) {
      const clusterInfo = clusterData.get(post.id)
      if (!clusterInfo || clusterInfo.role !== 'spoke') continue

      const analysis = postAnalyses.get(post.id)!
      const pillarPostId = clusterInfo.pillarPostId

      if (pillarPostId) {
        const pillarPost = posts.find((p) => p.id === pillarPostId)
        if (pillarPost) {
          const linksToPillar = analysis.internalLinks.some((l) =>
            l.url.includes(pillarPost.slug)
          )

          if (!linksToPillar) {
            oneWayLinks++
            issues.push({
              type: 'ONE_WAY',
              severity: 'warning',
              postId: post.id,
              postTitle: post.title,
              details: `This spoke post doesn't link back to its pillar: "${pillarPost.title}"`,
              suggestedFix: `Add a link to the pillar post: /blog/${pillarPost.slug}`,
            })
          }
        }
      }
    }
  }

  // Check for posts without product links
  let postsWithoutProducts = 0
  for (const post of posts) {
    const analysis = postAnalyses.get(post.id)!
    if (!analysis.hasProductLinks && post.status === 'published') {
      postsWithoutProducts++
      issues.push({
        type: 'NO_PRODUCT',
        severity: 'info',
        postId: post.id,
        postTitle: post.title,
        details: 'This post has no links to products',
        suggestedFix: 'Consider adding relevant product links for shoppable content',
      })
    }
  }

  // Check for low authority external links
  let lowAuthorityPosts = 0
  for (const post of posts) {
    const analysis = postAnalyses.get(post.id)!
    const externalCount = analysis.externalLinks.length

    if (externalCount > 0 && analysis.authoritativeExternalCount === 0 && post.status === 'published') {
      lowAuthorityPosts++
      issues.push({
        type: 'LOW_AUTHORITY',
        severity: 'warning',
        postId: post.id,
        postTitle: post.title,
        details: `Has ${externalCount} external links but none from authoritative sources`,
        suggestedFix: 'Add citations from .gov, .edu, or scientific journal sources',
      })
    }
  }

  // Calculate overall health score
  const totalPosts = posts.filter((p) => p.status === 'published').length
  if (totalPosts === 0) {
    return {
      healthScore: 100,
      totalPosts: 0,
      orphanedPosts: 0,
      oneWayLinks: 0,
      postsWithoutProducts: 0,
      lowAuthorityPosts: 0,
      issues: [],
      analyzedAt: new Date().toISOString(),
    }
  }

  // Weight issues by severity
  const criticalWeight = 3
  const warningWeight = 2
  const infoWeight = 1

  const weightedIssues =
    orphanedPosts * criticalWeight +
    oneWayLinks * warningWeight +
    postsWithoutProducts * infoWeight +
    lowAuthorityPosts * warningWeight

  const maxPossibleIssues =
    totalPosts * (criticalWeight + warningWeight + infoWeight + warningWeight)

  const healthScore = Math.max(
    0,
    Math.round((1 - weightedIssues / maxPossibleIssues) * 100)
  )

  return {
    healthScore,
    totalPosts,
    orphanedPosts,
    oneWayLinks,
    postsWithoutProducts,
    lowAuthorityPosts,
    issues,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Get a list of posts that link to a specific post
 */
export function getIncomingLinkPosts(
  targetPost: BlogPost,
  allPosts: BlogPostRow[],
  baseDomain?: string
): BlogPostRow[] {
  const targetSlug = targetPost.slug
  const targetUrlPatterns = [
    `/${targetSlug}`,
    `/blog/${targetSlug}`,
    `/posts/${targetSlug}`,
  ]

  return allPosts.filter((post) => {
    if (post.id === targetPost.id) return false

    const links = extractLinksFromContent(post.content, baseDomain)
    return links.some((l) =>
      targetUrlPatterns.some((pattern) => l.url.includes(pattern))
    )
  })
}
