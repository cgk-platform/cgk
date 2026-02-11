/**
 * E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signal detection
 * Detects signals in content and author information for SEO quality scoring
 */

import type { EEATAnalysis, BlogAuthor, BlogPost } from './types'

/**
 * Experience phrases that indicate first-hand knowledge
 */
const EXPERIENCE_PHRASES = [
  'in our testing',
  'when we formulated',
  'in my experience',
  'after years of',
  'we found that',
  'i have found',
  'from my experience',
  'having worked with',
  'in our research',
  'we discovered',
  'our team has',
  'i personally',
  'we have seen',
  'based on our experience',
  'through our work',
  'in practice',
  'our findings show',
  'we observed',
  'during our testing',
  'from firsthand experience',
]

/**
 * Authoritative domain patterns for external citations
 */
const AUTHORITATIVE_DOMAINS = [
  // Government
  '.gov',
  '.gov.uk',
  '.gov.au',
  '.gc.ca',
  // Education
  '.edu',
  '.ac.uk',
  // Scientific journals
  'pubmed.ncbi.nlm.nih.gov',
  'nature.com',
  'sciencedirect.com',
  'springer.com',
  'wiley.com',
  'tandfonline.com',
  'jstor.org',
  'ncbi.nlm.nih.gov',
  'nih.gov',
  'who.int',
  // Industry authorities
  'mayoclinic.org',
  'webmd.com',
  'healthline.com',
  'fda.gov',
  'cdc.gov',
  'epa.gov',
  // Standards bodies
  'iso.org',
  'ieee.org',
  'w3.org',
]

/**
 * Team/generic author name patterns that reduce E-E-A-T
 */
const TEAM_AUTHOR_PATTERNS = [
  /^team$/i,
  /^editorial$/i,
  /^staff$/i,
  /^admin$/i,
  /^editor$/i,
  /^content\s*team$/i,
  /^editorial\s*team$/i,
  /^the\s+.+\s+team$/i,
]

/**
 * Extract URLs from markdown content
 */
function extractUrls(content: string): string[] {
  const urls: string[] = []

  // Match markdown links [text](url)
  const markdownLinks = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)
  for (const match of markdownLinks) {
    urls.push(match[2])
  }

  // Match raw URLs
  const rawUrls = content.matchAll(/https?:\/\/[^\s\)]+/g)
  for (const match of rawUrls) {
    urls.push(match[0])
  }

  return [...new Set(urls)]
}

/**
 * Check if a domain is authoritative
 */
function isAuthoritativeDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    for (const domain of AUTHORITATIVE_DOMAINS) {
      if (domain.startsWith('.')) {
        // TLD check
        if (hostname.endsWith(domain)) return true
      } else {
        // Full domain check
        if (hostname === domain || hostname.endsWith('.' + domain)) return true
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Check if author name appears to be a team account
 */
function isTeamAuthorName(name: string): boolean {
  return TEAM_AUTHOR_PATTERNS.some((pattern) => pattern.test(name.trim()))
}

/**
 * Detect experience phrases in content
 */
function detectExperiencePhrases(content: string): string[] {
  const lowerContent = content.toLowerCase()
  const detected: string[] = []

  for (const phrase of EXPERIENCE_PHRASES) {
    if (lowerContent.includes(phrase)) {
      detected.push(phrase)
    }
  }

  return detected
}

/**
 * Analyze E-E-A-T signals in content and author information
 */
export function analyzeEEAT(
  post: BlogPost,
  author: BlogAuthor | null
): EEATAnalysis {
  const content = post.content

  // Detect experience phrases
  const detectedExperiencePhrases = detectExperiencePhrases(content)
  const experiencePhraseCount = detectedExperiencePhrases.length

  // Extract and analyze external links
  const urls = extractUrls(content)
  const authoritativeDomains: string[] = []

  for (const url of urls) {
    if (isAuthoritativeDomain(url)) {
      try {
        const hostname = new URL(url).hostname
        if (!authoritativeDomains.includes(hostname)) {
          authoritativeDomains.push(hostname)
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  const authoritativeCitationCount = authoritativeDomains.length

  // Author checks
  const hasNamedAuthor = author
    ? !isTeamAuthorName(author.name) && !author.is_team_account
    : false

  const hasAuthorCredentials = author
    ? (author.credentials?.length ?? 0) > 0
    : false

  const hasAuthorBioAndPhoto = author
    ? Boolean(author.bio && author.avatar_url)
    : false

  // Calculate score (out of 25 per the spec)
  let score = 0
  const maxScore = 25

  // Named author (not "Team"): 5 pts
  if (hasNamedAuthor) score += 5

  // Author credentials present: 5 pts
  if (hasAuthorCredentials) score += 5

  // Experience phrases (3+ phrases): 5 pts
  if (experiencePhraseCount >= 3) score += 5
  else if (experiencePhraseCount >= 1) score += 3

  // External citations (2+ authoritative): 5 pts
  if (authoritativeCitationCount >= 2) score += 5
  else if (authoritativeCitationCount >= 1) score += 3

  // Author bio and photo: 5 pts
  if (hasAuthorBioAndPhoto) score += 5

  return {
    score,
    maxScore,
    hasNamedAuthor,
    hasAuthorCredentials,
    experiencePhraseCount,
    authoritativeCitationCount,
    hasAuthorBioAndPhoto,
    detectedExperiencePhrases,
    authoritativeDomains,
  }
}

/**
 * Get E-E-A-T recommendations based on analysis
 */
export function getEEATRecommendations(analysis: EEATAnalysis): string[] {
  const recommendations: string[] = []

  if (!analysis.hasNamedAuthor) {
    recommendations.push(
      'Assign a named author (not a team account) to improve E-E-A-T signals'
    )
  }

  if (!analysis.hasAuthorCredentials) {
    recommendations.push(
      'Add author credentials (certifications, degrees, years of experience)'
    )
  }

  if (analysis.experiencePhraseCount < 3) {
    recommendations.push(
      `Add ${3 - analysis.experiencePhraseCount} more experience phrases (e.g., "In our testing...", "We found that...")`
    )
  }

  if (analysis.authoritativeCitationCount < 2) {
    recommendations.push(
      `Add ${2 - analysis.authoritativeCitationCount} more authoritative external citations (.gov, .edu, or peer-reviewed journals)`
    )
  }

  if (!analysis.hasAuthorBioAndPhoto) {
    recommendations.push('Add an author bio and profile photo')
  }

  return recommendations
}
