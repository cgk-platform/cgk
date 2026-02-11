/**
 * Knowledge Base database operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  KBCategory,
  KBCategoryRow,
  KBArticle,
  KBArticleRow,
  KBArticleWithCategory,
  KBArticleFeedback,
  KBArticleFeedbackRow,
  KBArticleVersion,
  KBArticleVersionRow,
  ArticleFilters,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateArticleInput,
  UpdateArticleInput,
  FeedbackInput,
  SearchOptions,
  SearchResult,
  PaginatedArticles,
  KBAnalytics,
} from './types'

// =============================================================================
// Category Operations
// =============================================================================

function rowToCategory(row: KBCategoryRow): KBCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    articleCount: row.article_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getCategories(): Promise<KBCategory[]> {
  const result = await sql<KBCategoryRow>`
    SELECT id, slug, name, description, icon, sort_order, article_count, created_at, updated_at
    FROM kb_categories
    ORDER BY sort_order ASC, name ASC
  `
  return result.rows.map(rowToCategory)
}

export async function getCategoryById(categoryId: string): Promise<KBCategory | null> {
  const result = await sql<KBCategoryRow>`
    SELECT id, slug, name, description, icon, sort_order, article_count, created_at, updated_at
    FROM kb_categories
    WHERE id = ${categoryId}
  `
  return result.rows[0] ? rowToCategory(result.rows[0]) : null
}

export async function getCategoryBySlug(slug: string): Promise<KBCategory | null> {
  const result = await sql<KBCategoryRow>`
    SELECT id, slug, name, description, icon, sort_order, article_count, created_at, updated_at
    FROM kb_categories
    WHERE slug = ${slug}
  `
  return result.rows[0] ? rowToCategory(result.rows[0]) : null
}

export async function createCategory(data: CreateCategoryInput): Promise<KBCategory> {
  const result = await sql<KBCategoryRow>`
    INSERT INTO kb_categories (slug, name, description, icon, sort_order)
    VALUES (
      ${data.slug},
      ${data.name},
      ${data.description || null},
      ${data.icon || null},
      ${data.sortOrder ?? 0}
    )
    RETURNING id, slug, name, description, icon, sort_order, article_count, created_at, updated_at
  `
  return rowToCategory(result.rows[0]!)
}

export async function updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<KBCategory | null> {
  const current = await getCategoryById(categoryId)
  if (!current) return null

  const result = await sql<KBCategoryRow>`
    UPDATE kb_categories SET
      slug = ${data.slug ?? current.slug},
      name = ${data.name ?? current.name},
      description = ${data.description !== undefined ? data.description : current.description},
      icon = ${data.icon !== undefined ? data.icon : current.icon},
      sort_order = ${data.sortOrder ?? current.sortOrder}
    WHERE id = ${categoryId}
    RETURNING id, slug, name, description, icon, sort_order, article_count, created_at, updated_at
  `
  return result.rows[0] ? rowToCategory(result.rows[0]) : null
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  // Articles with this category will have category_id set to NULL (ON DELETE SET NULL)
  const result = await sql`DELETE FROM kb_categories WHERE id = ${categoryId}`
  return (result.rowCount ?? 0) > 0
}

export async function reorderCategories(categoryIds: string[]): Promise<void> {
  // Update sort_order for each category based on array position
  for (let i = 0; i < categoryIds.length; i++) {
    await sql`UPDATE kb_categories SET sort_order = ${i} WHERE id = ${categoryIds[i]}`
  }
}

// =============================================================================
// Article Operations
// =============================================================================

function rowToArticle(row: KBArticleRow): KBArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    categoryId: row.category_id,
    tags: row.tags || [],
    isPublished: row.is_published,
    isInternal: row.is_internal,
    viewCount: row.view_count,
    helpfulCount: row.helpful_count,
    notHelpfulCount: row.not_helpful_count,
    authorId: row.author_id,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

function rowToArticleWithCategory(row: KBArticleRow): KBArticleWithCategory {
  const article = rowToArticle(row)
  return {
    ...article,
    category: row.category_id ? {
      id: row.category_id,
      slug: row.category_slug || '',
      name: row.category_name || '',
      icon: null, // Not included in join for performance
    } : null,
    author: row.author_id ? {
      id: row.author_id,
      name: row.author_name || '',
      email: row.author_email || '',
    } : null,
  }
}

const ARTICLE_SORT_COLUMNS: Record<string, string> = {
  created_at: 'a.created_at',
  updated_at: 'a.updated_at',
  published_at: 'a.published_at',
  title: 'a.title',
  view_count: 'a.view_count',
  helpful_count: 'a.helpful_count',
}

export async function getArticles(filters: ArticleFilters): Promise<PaginatedArticles> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.search) {
    paramIndex++
    conditions.push(`(a.title ILIKE $${paramIndex} OR a.excerpt ILIKE $${paramIndex} OR a.slug ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }
  if (filters.categoryId) {
    paramIndex++
    conditions.push(`a.category_id = $${paramIndex}`)
    values.push(filters.categoryId)
  }
  if (filters.isPublished !== undefined) {
    paramIndex++
    conditions.push(`a.is_published = $${paramIndex}`)
    values.push(filters.isPublished)
  }
  if (filters.isInternal !== undefined) {
    paramIndex++
    conditions.push(`a.is_internal = $${paramIndex}`)
    values.push(filters.isInternal)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortCol = ARTICLE_SORT_COLUMNS[filters.sort] || 'a.created_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
            a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
            a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
            c.name as category_name, c.slug as category_slug,
            u.name as author_name, u.email as author_email
     FROM kb_articles a
     LEFT JOIN kb_categories c ON a.category_id = c.id
     LEFT JOIN public.users u ON a.author_id = u.id
     ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM kb_articles a ${whereClause}`,
    countValues,
  )

  return {
    rows: dataResult.rows as KBArticleRow[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

export async function getArticleById(articleId: string): Promise<KBArticleWithCategory | null> {
  const result = await sql<KBArticleRow>`
    SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
           a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
           a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
           c.name as category_name, c.slug as category_slug,
           u.name as author_name, u.email as author_email
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN public.users u ON a.author_id = u.id
    WHERE a.id = ${articleId}
  `
  return result.rows[0] ? rowToArticleWithCategory(result.rows[0]) : null
}

export async function getArticleBySlug(slug: string): Promise<KBArticleWithCategory | null> {
  const result = await sql<KBArticleRow>`
    SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
           a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
           a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
           c.name as category_name, c.slug as category_slug,
           u.name as author_name, u.email as author_email
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN public.users u ON a.author_id = u.id
    WHERE a.slug = ${slug}
  `
  return result.rows[0] ? rowToArticleWithCategory(result.rows[0]) : null
}

export async function createArticle(data: CreateArticleInput): Promise<KBArticle> {
  const publishedAt = data.isPublished ? new Date().toISOString() : null
  const tagsJson = JSON.stringify(data.tags || [])

  const result = await sql<KBArticleRow>`
    INSERT INTO kb_articles (
      slug, title, content, excerpt, category_id, tags,
      is_published, is_internal, author_id, meta_title, meta_description, published_at
    ) VALUES (
      ${data.slug},
      ${data.title},
      ${data.content},
      ${data.excerpt || null},
      ${data.categoryId || null},
      ${tagsJson}::jsonb,
      ${data.isPublished ?? false},
      ${data.isInternal ?? false},
      ${data.authorId || null},
      ${data.metaTitle || null},
      ${data.metaDescription || null},
      ${publishedAt}::timestamptz
    )
    RETURNING id, slug, title, content, excerpt, category_id, tags,
              is_published, is_internal, view_count, helpful_count, not_helpful_count,
              author_id, meta_title, meta_description, created_at, updated_at, published_at
  `
  return rowToArticle(result.rows[0]!)
}

export async function updateArticle(articleId: string, data: UpdateArticleInput): Promise<KBArticle | null> {
  const current = await getArticleById(articleId)
  if (!current) return null

  const slug = data.slug ?? current.slug
  const title = data.title ?? current.title
  const content = data.content ?? current.content
  const excerpt = data.excerpt !== undefined ? data.excerpt : current.excerpt
  const categoryId = data.categoryId !== undefined ? data.categoryId : current.categoryId
  const tags = data.tags ?? current.tags
  const isPublished = data.isPublished ?? current.isPublished
  const isInternal = data.isInternal ?? current.isInternal
  const metaTitle = data.metaTitle !== undefined ? data.metaTitle : current.metaTitle
  const metaDescription = data.metaDescription !== undefined ? data.metaDescription : current.metaDescription

  // Update published_at if transitioning to published
  let publishedAt = current.publishedAt
  if (isPublished && !current.isPublished) {
    publishedAt = new Date().toISOString()
  }

  const tagsJson = JSON.stringify(tags)

  const result = await sql<KBArticleRow>`
    UPDATE kb_articles SET
      slug = ${slug},
      title = ${title},
      content = ${content},
      excerpt = ${excerpt},
      category_id = ${categoryId},
      tags = ${tagsJson}::jsonb,
      is_published = ${isPublished},
      is_internal = ${isInternal},
      meta_title = ${metaTitle},
      meta_description = ${metaDescription},
      published_at = ${publishedAt}::timestamptz
    WHERE id = ${articleId}
    RETURNING id, slug, title, content, excerpt, category_id, tags,
              is_published, is_internal, view_count, helpful_count, not_helpful_count,
              author_id, meta_title, meta_description, created_at, updated_at, published_at
  `
  return result.rows[0] ? rowToArticle(result.rows[0]) : null
}

export async function deleteArticle(articleId: string): Promise<boolean> {
  const result = await sql`DELETE FROM kb_articles WHERE id = ${articleId}`
  return (result.rowCount ?? 0) > 0
}

export async function publishArticle(articleId: string): Promise<KBArticle | null> {
  const result = await sql<KBArticleRow>`
    UPDATE kb_articles SET
      is_published = true,
      published_at = COALESCE(published_at, NOW())
    WHERE id = ${articleId}
    RETURNING id, slug, title, content, excerpt, category_id, tags,
              is_published, is_internal, view_count, helpful_count, not_helpful_count,
              author_id, meta_title, meta_description, created_at, updated_at, published_at
  `
  return result.rows[0] ? rowToArticle(result.rows[0]) : null
}

export async function unpublishArticle(articleId: string): Promise<KBArticle | null> {
  const result = await sql<KBArticleRow>`
    UPDATE kb_articles SET is_published = false
    WHERE id = ${articleId}
    RETURNING id, slug, title, content, excerpt, category_id, tags,
              is_published, is_internal, view_count, helpful_count, not_helpful_count,
              author_id, meta_title, meta_description, created_at, updated_at, published_at
  `
  return result.rows[0] ? rowToArticle(result.rows[0]) : null
}

// =============================================================================
// Search Operations
// =============================================================================

export async function searchArticles(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  const limit = options.limit ?? 10
  const conditions: string[] = ['a.is_published = true']

  if (!options.includeInternal) {
    conditions.push('a.is_internal = false')
  }
  if (options.categoryId) {
    conditions.push(`a.category_id = '${options.categoryId}'`)
  }

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

  const result = await sql<KBArticleRow & { rank: number }>`
    SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
           a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
           a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
           c.name as category_name, c.slug as category_slug,
           u.name as author_name, u.email as author_email,
           ts_rank(
             to_tsvector('english', COALESCE(a.title, '') || ' ' || COALESCE(a.content, '') || ' ' || COALESCE(array_to_string(a.tags, ' '), '')),
             plainto_tsquery('english', ${query})
           ) AS rank
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN public.users u ON a.author_id = u.id
    WHERE to_tsvector('english', COALESCE(a.title, '') || ' ' || COALESCE(a.content, '') || ' ' || COALESCE(array_to_string(a.tags, ' '), ''))
          @@ plainto_tsquery('english', ${query})
    ${whereClause}
    ORDER BY rank DESC
    LIMIT ${limit}
  `

  return result.rows.map((row) => ({
    article: rowToArticleWithCategory(row),
    rank: row.rank,
  }))
}

export async function getRelatedArticles(articleId: string, limit = 5): Promise<KBArticleWithCategory[]> {
  // Get related articles based on:
  // 1. Same category
  // 2. Matching tags
  // 3. Weighted by view count

  const result = await sql<KBArticleRow>`
    WITH current_article AS (
      SELECT category_id, tags FROM kb_articles WHERE id = ${articleId}
    )
    SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
           a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
           a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
           c.name as category_name, c.slug as category_slug,
           u.name as author_name, u.email as author_email,
           (
             CASE WHEN a.category_id = (SELECT category_id FROM current_article) THEN 10 ELSE 0 END +
             COALESCE(array_length(
               ARRAY(SELECT unnest(a.tags) INTERSECT SELECT unnest((SELECT tags FROM current_article))),
               1
             ), 0) * 5 +
             LOG(GREATEST(a.view_count, 1))
           ) AS relevance_score
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN public.users u ON a.author_id = u.id
    WHERE a.id != ${articleId}
      AND a.is_published = true
      AND a.is_internal = false
    ORDER BY relevance_score DESC, a.view_count DESC
    LIMIT ${limit}
  `

  return result.rows.map(rowToArticleWithCategory)
}

export async function getPopularArticles(limit = 10): Promise<KBArticleWithCategory[]> {
  const result = await sql<KBArticleRow>`
    SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
           a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
           a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
           c.name as category_name, c.slug as category_slug,
           u.name as author_name, u.email as author_email
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN public.users u ON a.author_id = u.id
    WHERE a.is_published = true AND a.is_internal = false
    ORDER BY a.view_count DESC
    LIMIT ${limit}
  `

  return result.rows.map(rowToArticleWithCategory)
}

// =============================================================================
// View Count & Feedback Operations
// =============================================================================

export async function incrementViewCount(articleId: string): Promise<void> {
  await sql`UPDATE kb_articles SET view_count = view_count + 1 WHERE id = ${articleId}`
}

export async function submitFeedback(articleId: string, feedback: FeedbackInput): Promise<KBArticleFeedback> {
  const result = await sql<KBArticleFeedbackRow>`
    INSERT INTO kb_article_feedback (article_id, is_helpful, comment, visitor_id)
    VALUES (${articleId}, ${feedback.isHelpful}, ${feedback.comment || null}, ${feedback.visitorId || null})
    ON CONFLICT (article_id, visitor_id, DATE(created_at))
    WHERE visitor_id IS NOT NULL
    DO UPDATE SET
      is_helpful = EXCLUDED.is_helpful,
      comment = EXCLUDED.comment
    RETURNING id, article_id, is_helpful, comment, visitor_id, created_at
  `

  const row = result.rows[0]!
  return {
    id: row.id,
    articleId: row.article_id,
    isHelpful: row.is_helpful,
    comment: row.comment,
    visitorId: row.visitor_id,
    createdAt: row.created_at,
  }
}

export async function getArticleFeedback(articleId: string, limit = 50): Promise<KBArticleFeedback[]> {
  const result = await sql<KBArticleFeedbackRow>`
    SELECT id, article_id, is_helpful, comment, visitor_id, created_at
    FROM kb_article_feedback
    WHERE article_id = ${articleId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return result.rows.map((row) => ({
    id: row.id,
    articleId: row.article_id,
    isHelpful: row.is_helpful,
    comment: row.comment,
    visitorId: row.visitor_id,
    createdAt: row.created_at,
  }))
}

// =============================================================================
// Version Operations
// =============================================================================

export async function createArticleVersion(
  articleId: string,
  title: string,
  content: string,
  excerpt: string | null,
  isDraft: boolean,
  createdBy: string | null
): Promise<KBArticleVersion> {
  // Get the next version number
  const versionResult = await sql<{ max_version: number }>`
    SELECT COALESCE(MAX(version_number), 0) as max_version
    FROM kb_article_versions
    WHERE article_id = ${articleId}
  `
  const nextVersion = (versionResult.rows[0]?.max_version ?? 0) + 1

  const result = await sql<KBArticleVersionRow>`
    INSERT INTO kb_article_versions (article_id, title, content, excerpt, version_number, is_draft, created_by)
    VALUES (${articleId}, ${title}, ${content}, ${excerpt}, ${nextVersion}, ${isDraft}, ${createdBy})
    RETURNING id, article_id, title, content, excerpt, version_number, is_draft, created_by, created_at
  `

  const row = result.rows[0]!
  return {
    id: row.id,
    articleId: row.article_id,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    versionNumber: row.version_number,
    isDraft: row.is_draft,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export async function getArticleVersions(articleId: string): Promise<KBArticleVersion[]> {
  const result = await sql<KBArticleVersionRow>`
    SELECT id, article_id, title, content, excerpt, version_number, is_draft, created_by, created_at
    FROM kb_article_versions
    WHERE article_id = ${articleId}
    ORDER BY version_number DESC
  `

  return result.rows.map((row) => ({
    id: row.id,
    articleId: row.article_id,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    versionNumber: row.version_number,
    isDraft: row.is_draft,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }))
}

export async function getLatestDraft(articleId: string): Promise<KBArticleVersion | null> {
  const result = await sql<KBArticleVersionRow>`
    SELECT id, article_id, title, content, excerpt, version_number, is_draft, created_by, created_at
    FROM kb_article_versions
    WHERE article_id = ${articleId} AND is_draft = true
    ORDER BY version_number DESC
    LIMIT 1
  `

  if (result.rows.length === 0) return null

  const row = result.rows[0]!
  return {
    id: row.id,
    articleId: row.article_id,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    versionNumber: row.version_number,
    isDraft: row.is_draft,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

// =============================================================================
// Analytics Operations
// =============================================================================

export async function getKBAnalytics(): Promise<KBAnalytics> {
  // Get article counts
  const countsResult = await sql<{
    total: number
    published: number
    draft: number
    internal: number
    total_views: number
    total_helpful: number
    total_not_helpful: number
  }>`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_published = true) as published,
      COUNT(*) FILTER (WHERE is_published = false) as draft,
      COUNT(*) FILTER (WHERE is_internal = true) as internal,
      COALESCE(SUM(view_count), 0) as total_views,
      COALESCE(SUM(helpful_count), 0) as total_helpful,
      COALESCE(SUM(not_helpful_count), 0) as total_not_helpful
    FROM kb_articles
  `

  const counts = countsResult.rows[0]!
  const totalFeedback = Number(counts.total_helpful) + Number(counts.total_not_helpful)
  const helpfulRate = totalFeedback > 0 ? Number(counts.total_helpful) / totalFeedback : 0

  // Get top articles by views
  const topResult = await sql<{
    id: string
    title: string
    slug: string
    view_count: number
    helpful_count: number
    not_helpful_count: number
  }>`
    SELECT id, title, slug, view_count, helpful_count, not_helpful_count
    FROM kb_articles
    WHERE is_published = true
    ORDER BY view_count DESC
    LIMIT 10
  `

  const topArticles = topResult.rows.map((row) => {
    const total = Number(row.helpful_count) + Number(row.not_helpful_count)
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      viewCount: Number(row.view_count),
      helpfulRate: total > 0 ? Number(row.helpful_count) / total : 0,
    }
  })

  // Get category breakdown
  const categoryResult = await sql<{
    category_id: string | null
    category_name: string | null
    article_count: number
    total_views: number
  }>`
    SELECT
      a.category_id,
      c.name as category_name,
      COUNT(*) as article_count,
      COALESCE(SUM(a.view_count), 0) as total_views
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    WHERE a.is_published = true
    GROUP BY a.category_id, c.name
    ORDER BY total_views DESC
  `

  const categoryBreakdown = categoryResult.rows
    .filter((row) => row.category_id !== null)
    .map((row) => ({
      categoryId: row.category_id!,
      categoryName: row.category_name || 'Uncategorized',
      articleCount: Number(row.article_count),
      totalViews: Number(row.total_views),
    }))

  // Get recent feedback
  const feedbackResult = await sql<{
    article_id: string
    article_title: string
    is_helpful: boolean
    comment: string | null
    created_at: string
  }>`
    SELECT
      f.article_id,
      a.title as article_title,
      f.is_helpful,
      f.comment,
      f.created_at
    FROM kb_article_feedback f
    JOIN kb_articles a ON f.article_id = a.id
    ORDER BY f.created_at DESC
    LIMIT 20
  `

  const recentFeedback = feedbackResult.rows.map((row) => ({
    articleId: row.article_id,
    articleTitle: row.article_title,
    isHelpful: row.is_helpful,
    comment: row.comment,
    createdAt: row.created_at,
  }))

  return {
    totalArticles: Number(counts.total),
    publishedArticles: Number(counts.published),
    draftArticles: Number(counts.draft),
    internalArticles: Number(counts.internal),
    totalViews: Number(counts.total_views),
    totalHelpful: Number(counts.total_helpful),
    totalNotHelpful: Number(counts.total_not_helpful),
    helpfulRate,
    topArticles,
    categoryBreakdown,
    recentFeedback,
  }
}

// =============================================================================
// Public API helpers (for help center)
// =============================================================================

export async function getPublicCategories(): Promise<KBCategory[]> {
  const result = await sql<KBCategoryRow>`
    SELECT id, slug, name, description, icon, sort_order, article_count, created_at, updated_at
    FROM kb_categories
    WHERE article_count > 0
    ORDER BY sort_order ASC, name ASC
  `
  return result.rows.map(rowToCategory)
}

export async function getPublicArticlesByCategory(categoryId: string, limit = 20): Promise<KBArticleWithCategory[]> {
  const result = await sql<KBArticleRow>`
    SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
           a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
           a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
           c.name as category_name, c.slug as category_slug,
           u.name as author_name, u.email as author_email
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN public.users u ON a.author_id = u.id
    WHERE a.category_id = ${categoryId}
      AND a.is_published = true
      AND a.is_internal = false
    ORDER BY a.view_count DESC
    LIMIT ${limit}
  `

  return result.rows.map(rowToArticleWithCategory)
}

export async function getPublicArticle(slug: string): Promise<KBArticleWithCategory | null> {
  const result = await sql<KBArticleRow>`
    SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
           a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
           a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
           c.name as category_name, c.slug as category_slug,
           u.name as author_name, u.email as author_email
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN public.users u ON a.author_id = u.id
    WHERE a.slug = ${slug}
      AND a.is_published = true
      AND a.is_internal = false
  `

  return result.rows[0] ? rowToArticleWithCategory(result.rows[0]) : null
}
