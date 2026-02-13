/**
 * SEO Schema Validator
 * Validates JSON-LD structured data for blog posts
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk-platform/db'

import type { SchemaValidationResult, SchemaIssue, IssueSeverity } from './types'

interface BlogPostForValidation {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  author_name: string | null
  author_email: string | null
  featured_image_url: string | null
  featured_image_alt: string | null
  seo_title: string | null
  seo_description: string | null
  canonical_url: string | null
  category: string | null
  published_at: string | null
  updated_at: string
}

// Scoring deductions
const SCORE_DEDUCTIONS = {
  error: 20,
  warning_high: 10,
  warning_low: 5,
  suggestion: 3,
} as const

/**
 * Add an issue to the list and update score
 */
function addIssue(
  issues: SchemaIssue[],
  score: { value: number },
  type: IssueSeverity,
  field: string,
  message: string,
  deduction: number = type === 'error' ? SCORE_DEDUCTIONS.error :
               type === 'warning' ? SCORE_DEDUCTIONS.warning_low :
               SCORE_DEDUCTIONS.suggestion
): void {
  issues.push({ type, field, message })
  score.value = Math.max(0, score.value - deduction)
}

/**
 * Validate a single blog post's schema
 */
export async function validatePostSchema(postId: string): Promise<SchemaValidationResult | null> {
  const result = await sql<BlogPostForValidation>`
    SELECT id, title, slug, excerpt, body, author_name, author_email,
           featured_image_url, featured_image_alt,
           seo_title, seo_description, canonical_url, category,
           published_at, updated_at
    FROM blog_posts
    WHERE id = ${postId}
  `

  const post = result.rows[0]
  if (!post) return null

  return validatePost(post)
}

/**
 * Internal validation logic for a post
 */
function validatePost(post: BlogPostForValidation): SchemaValidationResult {
  const issues: SchemaIssue[] = []
  const score = { value: 100 }

  // Title validation
  const title = post.seo_title || post.title
  if (!title) {
    addIssue(issues, score, 'error', 'title', 'Missing title')
  } else {
    if (title.length > 70) {
      addIssue(issues, score, 'warning', 'title', `Title too long (${title.length} chars, max 70)`)
    } else if (title.length < 30) {
      addIssue(issues, score, 'warning', 'title', `Title too short (${title.length} chars, min 30)`)
    }
  }

  // Description validation
  const description = post.seo_description || post.excerpt
  if (!description) {
    addIssue(issues, score, 'error', 'description', 'Missing meta description')
  } else {
    if (description.length > 160) {
      addIssue(issues, score, 'warning', 'description', `Description too long (${description.length} chars, max 160)`)
    } else if (description.length < 120) {
      addIssue(issues, score, 'warning', 'description', `Description too short (${description.length} chars, min 120)`)
    }
  }

  // Publication date validation
  if (!post.published_at) {
    addIssue(issues, score, 'error', 'datePublished', 'Missing publication date')
  }

  // Featured image validation
  if (!post.featured_image_url) {
    addIssue(issues, score, 'warning', 'image', 'Missing featured image', SCORE_DEDUCTIONS.warning_high)
  } else if (!post.featured_image_alt) {
    addIssue(issues, score, 'suggestion', 'imageAlt', 'Missing image alt text')
  }

  // Author validation
  if (!post.author_name) {
    addIssue(issues, score, 'warning', 'author', 'No author specified')
  }

  // Category validation
  if (!post.category) {
    addIssue(issues, score, 'warning', 'category', 'No category assigned')
  }

  // Canonical URL validation
  if (!post.canonical_url) {
    addIssue(issues, score, 'suggestion', 'canonicalUrl', 'No canonical URL set')
  }

  // Generate Article schema
  const articleSchema = generateArticleSchema(post)

  // Generate Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema(post)

  return {
    postId: post.id,
    postTitle: post.title,
    postSlug: post.slug,
    hasArticleSchema: true,
    hasBreadcrumbSchema: true,
    hasAuthorSchema: !!post.author_name,
    hasOrganizationSchema: true,
    overallScore: score.value,
    issues,
    generatedSchema: {
      article: articleSchema,
      breadcrumb: breadcrumbSchema,
    },
  }
}

/**
 * Generate Article schema for a post
 */
function generateArticleSchema(post: BlogPostForValidation): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || '',
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at,
  }

  if (post.featured_image_url) {
    schema.image = {
      '@type': 'ImageObject',
      url: post.featured_image_url,
      ...(post.featured_image_alt && { caption: post.featured_image_alt }),
    }
  }

  if (post.author_name) {
    schema.author = {
      '@type': 'Person',
      name: post.author_name,
      ...(post.author_email && { email: post.author_email }),
    }
  }

  schema.publisher = {
    '@type': 'Organization',
    name: 'Brand', // This would come from tenant settings in real implementation
    logo: {
      '@type': 'ImageObject',
      url: '/logo.png',
    },
  }

  if (post.canonical_url) {
    schema.mainEntityOfPage = {
      '@type': 'WebPage',
      '@id': post.canonical_url,
    }
  }

  return schema
}

/**
 * Generate Breadcrumb schema for a post
 */
function generateBreadcrumbSchema(post: BlogPostForValidation): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: '/',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Blog',
      item: '/blog',
    },
  ]

  if (post.category) {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: post.category,
      item: `/blog/category/${post.category.toLowerCase().replace(/\s+/g, '-')}`,
    })
  }

  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: post.title,
    item: `/blog/${post.slug}`,
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

/**
 * Validate all published posts
 */
export async function validateAllPostSchemas(): Promise<SchemaValidationResult[]> {
  const result = await sql<BlogPostForValidation>`
    SELECT id, title, slug, excerpt, body, author_name, author_email,
           featured_image_url, featured_image_alt,
           seo_title, seo_description, canonical_url, category,
           published_at, updated_at
    FROM blog_posts
    WHERE status = 'published'
    ORDER BY published_at DESC
  `

  return result.rows.map((post) => validatePost(post))
}

/**
 * Get posts with schema issues
 */
export async function getPostsWithSchemaIssues(): Promise<SchemaValidationResult[]> {
  const allResults = await validateAllPostSchemas()
  return allResults.filter((r) => r.issues.length > 0)
}

/**
 * Get schema validation summary
 */
export async function getSchemaValidationSummary(): Promise<{
  totalPosts: number
  averageScore: number
  postsWithErrors: number
  postsWithWarnings: number
  postsWithSuggestions: number
  perfectPosts: number
  issueBreakdown: Record<string, number>
}> {
  const results = await validateAllPostSchemas()

  if (results.length === 0) {
    return {
      totalPosts: 0,
      averageScore: 100,
      postsWithErrors: 0,
      postsWithWarnings: 0,
      postsWithSuggestions: 0,
      perfectPosts: 0,
      issueBreakdown: {},
    }
  }

  const issueBreakdown: Record<string, number> = {}
  let postsWithErrors = 0
  let postsWithWarnings = 0
  let postsWithSuggestions = 0
  let perfectPosts = 0

  for (const result of results) {
    let hasError = false
    let hasWarning = false
    let hasSuggestion = false

    for (const issue of result.issues) {
      issueBreakdown[issue.field] = (issueBreakdown[issue.field] || 0) + 1

      if (issue.type === 'error') hasError = true
      if (issue.type === 'warning') hasWarning = true
      if (issue.type === 'suggestion') hasSuggestion = true
    }

    if (hasError) postsWithErrors++
    else if (hasWarning) postsWithWarnings++
    else if (hasSuggestion) postsWithSuggestions++
    else perfectPosts++
  }

  const totalScore = results.reduce((sum, r) => sum + r.overallScore, 0)

  return {
    totalPosts: results.length,
    averageScore: Math.round(totalScore / results.length),
    postsWithErrors,
    postsWithWarnings,
    postsWithSuggestions,
    perfectPosts,
    issueBreakdown,
  }
}

/**
 * Generate JSON-LD script tag for a post
 */
export function generateSchemaScriptTag(result: SchemaValidationResult): string {
  const schemas = [result.generatedSchema.article, result.generatedSchema.breadcrumb]

  return `<script type="application/ld+json">${JSON.stringify(schemas)}</script>`
}
