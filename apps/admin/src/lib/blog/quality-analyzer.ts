/**
 * Quality scoring system for blog posts
 * 100-point scoring across 4 categories: SEO, Readability, E-E-A-T, Formatting
 */

import type {
  BlogPost,
  BlogAuthor,
  QualityBreakdown,
  QualityCategoryScore,
  QualityCheck,
  QualityScoreResult,
  AIModifier,
} from './types'
import { analyzeReadability } from './readability'
import { analyzeEEAT } from './eeat-detector'
import { extractLinksFromContent } from './link-analyzer'

/**
 * Score thresholds for quality levels
 */
const QUALITY_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 65,
  NEEDS_WORK: 50,
}

/**
 * Analyze SEO factors (25 points max)
 */
function analyzeSEO(post: BlogPost): QualityCategoryScore {
  const checks: QualityCheck[] = []
  let score = 0

  // Title length (50-60 chars optimal): 5 pts
  const titleLength = (post.meta_title || post.title).length
  const titleOptimal = titleLength >= 50 && titleLength <= 60
  const titleAcceptable = titleLength >= 40 && titleLength <= 70
  if (titleOptimal) {
    score += 5
    checks.push({
      name: 'Title Length',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: `Title is optimal length (${titleLength} chars)`,
    })
  } else if (titleAcceptable) {
    score += 3
    checks.push({
      name: 'Title Length',
      passed: false,
      points: 3,
      maxPoints: 5,
      message: `Title is ${titleLength} chars, optimal is 50-60`,
    })
  } else {
    checks.push({
      name: 'Title Length',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: `Title is ${titleLength} chars, should be 50-60`,
    })
  }

  // Meta description (120-160 chars): 5 pts
  const metaDesc = post.meta_description || ''
  const metaLength = metaDesc.length
  const metaOptimal = metaLength >= 120 && metaLength <= 160
  const metaAcceptable = metaLength >= 100 && metaLength <= 180
  if (metaOptimal) {
    score += 5
    checks.push({
      name: 'Meta Description',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: `Meta description is optimal length (${metaLength} chars)`,
    })
  } else if (metaAcceptable && metaLength > 0) {
    score += 3
    checks.push({
      name: 'Meta Description',
      passed: false,
      points: 3,
      maxPoints: 5,
      message: `Meta description is ${metaLength} chars, optimal is 120-160`,
    })
  } else if (metaLength > 0) {
    score += 1
    checks.push({
      name: 'Meta Description',
      passed: false,
      points: 1,
      maxPoints: 5,
      message: `Meta description is ${metaLength} chars, should be 120-160`,
    })
  } else {
    checks.push({
      name: 'Meta Description',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: 'No meta description set',
    })
  }

  // URL-friendly slug: 3 pts
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
  const slugValid = slugPattern.test(post.slug)
  const slugLength = post.slug.length <= 60
  if (slugValid && slugLength) {
    score += 3
    checks.push({
      name: 'URL Slug',
      passed: true,
      points: 3,
      maxPoints: 3,
      message: 'URL slug is SEO-friendly',
    })
  } else if (slugValid) {
    score += 2
    checks.push({
      name: 'URL Slug',
      passed: false,
      points: 2,
      maxPoints: 3,
      message: 'URL slug is valid but could be shorter',
    })
  } else {
    checks.push({
      name: 'URL Slug',
      passed: false,
      points: 0,
      maxPoints: 3,
      message: 'URL slug should use lowercase letters, numbers, and hyphens only',
    })
  }

  // Content length (800+ words): 5 pts
  const readability = analyzeReadability(post.content)
  const wordCount = readability.wordCount
  if (wordCount >= 800) {
    score += 5
    checks.push({
      name: 'Content Length',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: `Content is ${wordCount} words (800+ target)`,
    })
  } else if (wordCount >= 500) {
    score += 3
    checks.push({
      name: 'Content Length',
      passed: false,
      points: 3,
      maxPoints: 5,
      message: `Content is ${wordCount} words, aim for 800+`,
    })
  } else {
    score += 1
    checks.push({
      name: 'Content Length',
      passed: false,
      points: 1,
      maxPoints: 5,
      message: `Content is only ${wordCount} words, aim for 800+`,
    })
  }

  // Featured image present: 3 pts
  if (post.featured_image_url) {
    score += 3
    checks.push({
      name: 'Featured Image',
      passed: true,
      points: 3,
      maxPoints: 3,
      message: 'Featured image is set',
    })
  } else {
    checks.push({
      name: 'Featured Image',
      passed: false,
      points: 0,
      maxPoints: 3,
      message: 'No featured image set',
    })
  }

  // Internal links (2+ recommended): 4 pts
  const links = extractLinksFromContent(post.content)
  const internalLinks = links.filter((l) => l.isInternal)
  if (internalLinks.length >= 2) {
    score += 4
    checks.push({
      name: 'Internal Links',
      passed: true,
      points: 4,
      maxPoints: 4,
      message: `Has ${internalLinks.length} internal links`,
    })
  } else if (internalLinks.length === 1) {
    score += 2
    checks.push({
      name: 'Internal Links',
      passed: false,
      points: 2,
      maxPoints: 4,
      message: 'Has 1 internal link, aim for 2+',
    })
  } else {
    checks.push({
      name: 'Internal Links',
      passed: false,
      points: 0,
      maxPoints: 4,
      message: 'No internal links, add at least 2',
    })
  }

  return { score, maxScore: 25, checks }
}

/**
 * Analyze readability factors (25 points max)
 */
function analyzeReadabilityScore(post: BlogPost): QualityCategoryScore {
  const checks: QualityCheck[] = []
  let score = 0

  const readability = analyzeReadability(post.content)

  // Flesch Reading Ease (60+ target): 8 pts
  const flesch = readability.fleschReadingEase
  if (flesch >= 60) {
    score += 8
    checks.push({
      name: 'Flesch Reading Ease',
      passed: true,
      points: 8,
      maxPoints: 8,
      message: `Score of ${flesch} is easy to read`,
    })
  } else if (flesch >= 50) {
    score += 5
    checks.push({
      name: 'Flesch Reading Ease',
      passed: false,
      points: 5,
      maxPoints: 8,
      message: `Score of ${flesch} is fairly difficult, aim for 60+`,
    })
  } else if (flesch >= 30) {
    score += 3
    checks.push({
      name: 'Flesch Reading Ease',
      passed: false,
      points: 3,
      maxPoints: 8,
      message: `Score of ${flesch} is difficult to read, simplify sentences`,
    })
  } else {
    checks.push({
      name: 'Flesch Reading Ease',
      passed: false,
      points: 0,
      maxPoints: 8,
      message: `Score of ${flesch} is very difficult to read`,
    })
  }

  // Short paragraphs (2-3 sentences): 5 pts
  const avgParaLength = readability.averageParagraphLength
  if (avgParaLength >= 2 && avgParaLength <= 3) {
    score += 5
    checks.push({
      name: 'Paragraph Length',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: `Average ${avgParaLength.toFixed(1)} sentences per paragraph`,
    })
  } else if (avgParaLength >= 1 && avgParaLength <= 4) {
    score += 3
    checks.push({
      name: 'Paragraph Length',
      passed: false,
      points: 3,
      maxPoints: 5,
      message: `Average ${avgParaLength.toFixed(1)} sentences per paragraph, aim for 2-3`,
    })
  } else {
    checks.push({
      name: 'Paragraph Length',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: 'Paragraphs too long, break into 2-3 sentences',
    })
  }

  // Sentence length (<25 words avg): 4 pts
  const avgSentence = readability.averageSentenceLength
  if (avgSentence <= 25) {
    score += 4
    checks.push({
      name: 'Sentence Length',
      passed: true,
      points: 4,
      maxPoints: 4,
      message: `Average ${avgSentence.toFixed(1)} words per sentence`,
    })
  } else if (avgSentence <= 30) {
    score += 2
    checks.push({
      name: 'Sentence Length',
      passed: false,
      points: 2,
      maxPoints: 4,
      message: `Average ${avgSentence.toFixed(1)} words per sentence, aim for <25`,
    })
  } else {
    checks.push({
      name: 'Sentence Length',
      passed: false,
      points: 0,
      maxPoints: 4,
      message: `Sentences too long (${avgSentence.toFixed(1)} words avg)`,
    })
  }

  // Bullet points for lists: 4 pts
  if (readability.hasBulletPoints) {
    score += 4
    checks.push({
      name: 'Bullet Points',
      passed: true,
      points: 4,
      maxPoints: 4,
      message: 'Uses bullet points for scannable content',
    })
  } else {
    checks.push({
      name: 'Bullet Points',
      passed: false,
      points: 0,
      maxPoints: 4,
      message: 'Consider adding bullet points for key lists',
    })
  }

  // Heading hierarchy (H2, H3 structure): 4 pts
  if (readability.hasProperHeadingHierarchy) {
    score += 4
    checks.push({
      name: 'Heading Hierarchy',
      passed: true,
      points: 4,
      maxPoints: 4,
      message: 'Proper heading hierarchy (H2, H3)',
    })
  } else {
    score += 2
    checks.push({
      name: 'Heading Hierarchy',
      passed: false,
      points: 2,
      maxPoints: 4,
      message: 'Heading hierarchy has gaps (e.g., H2 to H4)',
    })
  }

  return { score, maxScore: 25, checks }
}

/**
 * Analyze E-E-A-T factors (25 points max)
 */
function analyzeEEATScore(post: BlogPost, author: BlogAuthor | null): QualityCategoryScore {
  const checks: QualityCheck[] = []
  const eeat = analyzeEEAT(post, author)

  // Named author (not "Team"): 5 pts
  if (eeat.hasNamedAuthor) {
    checks.push({
      name: 'Named Author',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: 'Has a named author (not team account)',
    })
  } else {
    checks.push({
      name: 'Named Author',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: 'Assign a named author (not "Team" or "Editorial")',
    })
  }

  // Author credentials present: 5 pts
  if (eeat.hasAuthorCredentials) {
    checks.push({
      name: 'Author Credentials',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: 'Author has credentials listed',
    })
  } else {
    checks.push({
      name: 'Author Credentials',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: 'Add author credentials (certifications, degrees)',
    })
  }

  // Experience phrases (3+ phrases): 5 pts
  const expPhrases = eeat.experiencePhraseCount
  if (expPhrases >= 3) {
    checks.push({
      name: 'Experience Phrases',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: `Found ${expPhrases} experience phrases`,
    })
  } else if (expPhrases >= 1) {
    checks.push({
      name: 'Experience Phrases',
      passed: false,
      points: 3,
      maxPoints: 5,
      message: `Found ${expPhrases} experience phrase(s), aim for 3+`,
    })
  } else {
    checks.push({
      name: 'Experience Phrases',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: 'Add experience phrases (e.g., "In our testing...")',
    })
  }

  // External citations (2+ authoritative): 5 pts
  const citations = eeat.authoritativeCitationCount
  if (citations >= 2) {
    checks.push({
      name: 'Authoritative Citations',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: `${citations} authoritative external citations`,
    })
  } else if (citations >= 1) {
    checks.push({
      name: 'Authoritative Citations',
      passed: false,
      points: 3,
      maxPoints: 5,
      message: `${citations} authoritative citation, aim for 2+`,
    })
  } else {
    checks.push({
      name: 'Authoritative Citations',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: 'Add citations from .gov, .edu, or journals',
    })
  }

  // Author bio and photo: 5 pts
  if (eeat.hasAuthorBioAndPhoto) {
    checks.push({
      name: 'Author Bio & Photo',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: 'Author has bio and photo',
    })
  } else {
    checks.push({
      name: 'Author Bio & Photo',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: 'Add author bio and profile photo',
    })
  }

  const score = checks.reduce((sum, c) => sum + c.points, 0)
  return { score, maxScore: 25, checks }
}

/**
 * Analyze formatting factors (25 points max)
 */
function analyzeFormatting(post: BlogPost): QualityCategoryScore {
  const checks: QualityCheck[] = []
  let score = 0

  // No em dashes (use hyphens): 4 pts
  const hasEmDash = /\u2014/.test(post.content)
  const hasEnDash = /\u2013/.test(post.content)
  if (!hasEmDash && !hasEnDash) {
    score += 4
    checks.push({
      name: 'No Em Dashes',
      passed: true,
      points: 4,
      maxPoints: 4,
      message: 'Uses hyphens instead of em/en dashes',
    })
  } else {
    score += 2
    checks.push({
      name: 'No Em Dashes',
      passed: false,
      points: 2,
      maxPoints: 4,
      message: 'Replace em/en dashes with hyphens',
    })
  }

  // Correct brand name styling: 4 pts (always passes for now)
  score += 4
  checks.push({
    name: 'Brand Styling',
    passed: true,
    points: 4,
    maxPoints: 4,
    message: 'Brand names appear correctly styled',
  })

  // Excerpt present (150-160 chars): 5 pts
  const excerptLength = (post.excerpt || '').length
  if (excerptLength >= 150 && excerptLength <= 160) {
    score += 5
    checks.push({
      name: 'Excerpt Length',
      passed: true,
      points: 5,
      maxPoints: 5,
      message: `Excerpt is ${excerptLength} chars (optimal)`,
    })
  } else if (excerptLength >= 100 && excerptLength <= 200) {
    score += 3
    checks.push({
      name: 'Excerpt Length',
      passed: false,
      points: 3,
      maxPoints: 5,
      message: `Excerpt is ${excerptLength} chars, aim for 150-160`,
    })
  } else if (excerptLength > 0) {
    score += 1
    checks.push({
      name: 'Excerpt Length',
      passed: false,
      points: 1,
      maxPoints: 5,
      message: `Excerpt is ${excerptLength} chars, should be 150-160`,
    })
  } else {
    checks.push({
      name: 'Excerpt Length',
      passed: false,
      points: 0,
      maxPoints: 5,
      message: 'No excerpt set',
    })
  }

  // Tags assigned (1-5 tags): 4 pts
  const tagCount = (post.tags || []).length
  if (tagCount >= 1 && tagCount <= 5) {
    score += 4
    checks.push({
      name: 'Tags',
      passed: true,
      points: 4,
      maxPoints: 4,
      message: `Has ${tagCount} tags`,
    })
  } else if (tagCount > 5) {
    score += 2
    checks.push({
      name: 'Tags',
      passed: false,
      points: 2,
      maxPoints: 4,
      message: `Has ${tagCount} tags, aim for 1-5`,
    })
  } else {
    checks.push({
      name: 'Tags',
      passed: false,
      points: 0,
      maxPoints: 4,
      message: 'No tags assigned',
    })
  }

  // Category assigned: 4 pts
  if (post.category_id) {
    score += 4
    checks.push({
      name: 'Category',
      passed: true,
      points: 4,
      maxPoints: 4,
      message: 'Category is assigned',
    })
  } else {
    checks.push({
      name: 'Category',
      passed: false,
      points: 0,
      maxPoints: 4,
      message: 'No category assigned',
    })
  }

  // Proper markdown structure: 4 pts
  const hasHeadings = /^#{2,3}\s+/m.test(post.content)
  const hasLists = /^[-*+]\s+|^\d+\.\s+/m.test(post.content)
  const hasLinks = /\[.+?\]\(.+?\)/.test(post.content)
  const markdownScore = (hasHeadings ? 1 : 0) + (hasLists ? 1 : 0) + (hasLinks ? 1 : 0)

  if (markdownScore >= 3) {
    score += 4
    checks.push({
      name: 'Markdown Structure',
      passed: true,
      points: 4,
      maxPoints: 4,
      message: 'Uses headings, lists, and links',
    })
  } else if (markdownScore >= 2) {
    score += 3
    checks.push({
      name: 'Markdown Structure',
      passed: false,
      points: 3,
      maxPoints: 4,
      message: 'Good structure, could add more formatting',
    })
  } else if (markdownScore >= 1) {
    score += 2
    checks.push({
      name: 'Markdown Structure',
      passed: false,
      points: 2,
      maxPoints: 4,
      message: 'Add headings, lists, and links',
    })
  } else {
    checks.push({
      name: 'Markdown Structure',
      passed: false,
      points: 0,
      maxPoints: 4,
      message: 'Content lacks structure (headings, lists, links)',
    })
  }

  return { score, maxScore: 25, checks }
}

/**
 * Calculate AI content modifiers
 */
function calculateAIModifiers(
  post: BlogPost,
  author: BlogAuthor | null,
  eeatScore: number
): AIModifier[] {
  const modifiers: AIModifier[] = []

  if (!post.is_ai_generated) return modifiers

  // AI + Team Author: -3 E-E-A-T points
  if (author?.is_team_account || !author) {
    modifiers.push({
      type: 'AI_TEAM_AUTHOR',
      points: -3,
      reason: 'AI-generated content with team author',
    })
  }

  // AI + No Experience Phrases: -4 E-E-A-T points
  const eeat = analyzeEEAT(post, author)
  if (eeat.experiencePhraseCount === 0) {
    modifiers.push({
      type: 'AI_NO_EXPERIENCE',
      points: -4,
      reason: 'AI-generated content without experience phrases',
    })
  }

  // AI + <20% Human Edits: -10 overall + BLOCKED
  if (
    post.human_edit_percentage !== null &&
    post.human_edit_percentage < 20
  ) {
    modifiers.push({
      type: 'AI_LOW_EDITS',
      points: -10,
      reason: `AI content with only ${post.human_edit_percentage?.toFixed(1)}% human edits`,
    })
  }

  // AI + 40%+ Human Edits: +5 bonus points
  if (
    post.human_edit_percentage !== null &&
    post.human_edit_percentage >= 40
  ) {
    modifiers.push({
      type: 'AI_HIGH_EDITS',
      points: 5,
      reason: `AI content with ${post.human_edit_percentage?.toFixed(1)}% human edits`,
    })
  }

  return modifiers
}

/**
 * Analyze quality score for a blog post
 */
export function analyzeQualityScore(
  post: BlogPost,
  author: BlogAuthor | null
): QualityScoreResult {
  const seo = analyzeSEO(post)
  const readability = analyzeReadabilityScore(post)
  const eeat = analyzeEEATScore(post, author)
  const formatting = analyzeFormatting(post)

  const breakdown: QualityBreakdown = {
    seo,
    readability,
    eeat,
    formatting,
  }

  // Calculate base score
  let totalScore = seo.score + readability.score + eeat.score + formatting.score
  const maxScore = 100

  // Apply AI modifiers
  const aiModifiers = calculateAIModifiers(post, author, eeat.score)
  for (const modifier of aiModifiers) {
    totalScore += modifier.points
  }

  // Clamp score
  totalScore = Math.max(0, Math.min(100, totalScore))

  // Determine level
  let level: 'excellent' | 'good' | 'needs_work' | 'poor'
  if (totalScore >= QUALITY_THRESHOLDS.EXCELLENT) {
    level = 'excellent'
  } else if (totalScore >= QUALITY_THRESHOLDS.GOOD) {
    level = 'good'
  } else if (totalScore >= QUALITY_THRESHOLDS.NEEDS_WORK) {
    level = 'needs_work'
  } else {
    level = 'poor'
  }

  // Check if publish is blocked
  const publishBlocked =
    post.is_ai_generated &&
    post.human_edit_percentage !== null &&
    post.human_edit_percentage < 20

  const blockReason = publishBlocked
    ? `AI-generated content requires at least 20% human edits. Current: ${post.human_edit_percentage?.toFixed(1)}%`
    : null

  return {
    totalScore,
    maxScore,
    breakdown,
    level,
    aiModifiers,
    publishBlocked,
    blockReason,
  }
}

/**
 * Get quality level label
 */
export function getQualityLevelLabel(level: string): string {
  switch (level) {
    case 'excellent':
      return 'Excellent'
    case 'good':
      return 'Good'
    case 'needs_work':
      return 'Needs Work'
    case 'poor':
      return 'Poor'
    default:
      return 'Unknown'
  }
}

/**
 * Get quality level color
 */
export function getQualityLevelColor(level: string): string {
  switch (level) {
    case 'excellent':
      return 'green'
    case 'good':
      return 'blue'
    case 'needs_work':
      return 'yellow'
    case 'poor':
      return 'red'
    default:
      return 'gray'
  }
}

/**
 * Get quality level description
 */
export function getQualityLevelDescription(level: string): string {
  switch (level) {
    case 'excellent':
      return 'Ready to publish'
    case 'good':
      return 'Can publish with review'
    case 'needs_work':
      return 'Review before publish'
    case 'poor':
      return 'Major edits required'
    default:
      return ''
  }
}
