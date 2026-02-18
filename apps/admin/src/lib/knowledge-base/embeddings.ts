/**
 * Embedding generation and semantic search for KB articles
 *
 * Provides vector-based search alongside the existing full-text search
 * for hybrid retrieval with Reciprocal Rank Fusion (RRF).
 */

import OpenAI from 'openai'
import { sql } from '@cgk-platform/db'

import type { KBArticleRow, KBArticleWithCategory, SearchOptions } from './types'

// Lazy singleton
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for KB embeddings')
    }
    const baseURL = process.env.LITELLM_BASE_URL || undefined
    openaiClient = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
  }
  return openaiClient
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/**
 * Generate an embedding vector from article title + content
 */
export async function generateArticleEmbedding(title: string, content: string): Promise<number[]> {
  const openai = getOpenAI()
  const text = `${title}\n\n${content}`.slice(0, 8191 * 4) // rough token limit

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  })

  const first = response.data[0]
  if (!first) throw new Error('No embedding returned from OpenAI')
  return first.embedding
}

/**
 * Generate and store embedding for a KB article (fire-and-forget safe)
 */
export async function generateAndStoreArticleEmbedding(
  articleId: string,
  title: string,
  content: string
): Promise<void> {
  try {
    const embedding = await generateArticleEmbedding(title, content)
    const vectorStr = `[${embedding.join(',')}]`

    await sql`
      UPDATE kb_articles
      SET embedding = ${vectorStr}::public.vector
      WHERE id = ${articleId}
    `
  } catch (err) {
    // Log but don't throw — embedding generation is non-critical
    console.error(`[kb-embeddings] Failed to generate embedding for article ${articleId}:`, err)
  }
}

/**
 * Semantic search: find articles by vector similarity
 */
export async function semanticSearchArticles(
  query: string,
  options: SearchOptions & { minSimilarity?: number } = {}
): Promise<Array<{ articleId: string; similarity: number }>> {
  const limit = options.limit ?? 10
  const minSimilarity = options.minSimilarity ?? 0.3

  const embedding = await generateArticleEmbedding(query, '')
  const vectorStr = `[${embedding.join(',')}]`

  const conditions: string[] = [
    'a.embedding IS NOT NULL',
    'a.is_published = true',
  ]
  if (!options.includeInternal) {
    conditions.push('a.is_internal = false')
  }
  if (options.categoryId) {
    conditions.push(`a.category_id = '${options.categoryId}'`)
  }

  const whereClause = conditions.join(' AND ')

  const result = await sql.query(
    `SELECT a.id,
            1 - (a.embedding <=> $1::public.vector) AS similarity
     FROM kb_articles a
     WHERE ${whereClause}
       AND 1 - (a.embedding <=> $1::public.vector) >= $2
     ORDER BY a.embedding <=> $1::public.vector
     LIMIT $3`,
    [vectorStr, minSimilarity, limit]
  )

  return result.rows.map((row: Record<string, unknown>) => ({
    articleId: row.id as string,
    similarity: Number(row.similarity),
  }))
}

/**
 * Hybrid search combining full-text (ts_rank) and vector similarity using RRF
 *
 * Reciprocal Rank Fusion: score = sum(1 / (k + rank_i)) for each ranking
 * This merges the FTS and vector rankings without needing normalized scores.
 */
export async function hybridSearchArticles(
  query: string,
  options: SearchOptions & { minSimilarity?: number; rrfK?: number } = {}
): Promise<Array<{ article: KBArticleWithCategory; score: number; ftsRank: number; similarity: number }>> {
  const limit = options.limit ?? 10
  const minSimilarity = options.minSimilarity ?? 0.2
  const rffK = options.rrfK ?? 60 // standard RRF constant

  const embedding = await generateArticleEmbedding(query, '')
  const vectorStr = `[${embedding.join(',')}]`

  const conditions: string[] = ['a.is_published = true']
  if (!options.includeInternal) {
    conditions.push('a.is_internal = false')
  }
  if (options.categoryId) {
    conditions.push(`a.category_id = '${options.categoryId}'`)
  }
  const whereClause = conditions.join(' AND ')

  // CTE-based hybrid query: one CTE for FTS ranks, one for vector ranks, merge with RRF
  const result = await sql.query(
    `WITH fts AS (
       SELECT a.id,
              ts_rank(
                to_tsvector('english', COALESCE(a.title, '') || ' ' || COALESCE(a.content, '')),
                plainto_tsquery('english', $1)
              ) AS rank,
              ROW_NUMBER() OVER (ORDER BY ts_rank(
                to_tsvector('english', COALESCE(a.title, '') || ' ' || COALESCE(a.content, '')),
                plainto_tsquery('english', $1)
              ) DESC) AS rn
       FROM kb_articles a
       WHERE ${whereClause}
         AND to_tsvector('english', COALESCE(a.title, '') || ' ' || COALESCE(a.content, ''))
             @@ plainto_tsquery('english', $1)
     ),
     vec AS (
       SELECT a.id,
              1 - (a.embedding <=> $2::public.vector) AS similarity,
              ROW_NUMBER() OVER (ORDER BY a.embedding <=> $2::public.vector) AS rn
       FROM kb_articles a
       WHERE ${whereClause}
         AND a.embedding IS NOT NULL
         AND 1 - (a.embedding <=> $2::public.vector) >= $3
     ),
     merged AS (
       SELECT COALESCE(fts.id, vec.id) AS id,
              COALESCE(1.0 / ($4 + fts.rn), 0) + COALESCE(1.0 / ($4 + vec.rn), 0) AS rrf_score,
              COALESCE(fts.rank, 0) AS fts_rank,
              COALESCE(vec.similarity, 0) AS similarity
       FROM fts
       FULL OUTER JOIN vec ON fts.id = vec.id
     )
     SELECT m.rrf_score, m.fts_rank, m.similarity,
            a.id, a.slug, a.title, a.content, a.excerpt, a.category_id, a.tags,
            a.is_published, a.is_internal, a.view_count, a.helpful_count, a.not_helpful_count,
            a.author_id, a.meta_title, a.meta_description, a.created_at, a.updated_at, a.published_at,
            c.name as category_name, c.slug as category_slug,
            u.name as author_name, u.email as author_email
     FROM merged m
     JOIN kb_articles a ON a.id = m.id
     LEFT JOIN kb_categories c ON a.category_id = c.id
     LEFT JOIN public.users u ON a.author_id = u.id
     ORDER BY m.rrf_score DESC
     LIMIT $5`,
    [query, vectorStr, minSimilarity, rffK, limit]
  )

  return result.rows.map((row: Record<string, unknown>) => ({
    article: rowToArticleWithCategory(row as unknown as KBArticleRow),
    score: Number(row.rrf_score),
    ftsRank: Number(row.fts_rank),
    similarity: Number(row.similarity),
  }))
}

/**
 * Backfill embeddings for articles that don't have one yet
 */
export async function backfillArticleEmbeddings(batchSize = 20): Promise<number> {
  const result = await sql<{ id: string; title: string; content: string }>`
    SELECT id, title, content FROM kb_articles
    WHERE embedding IS NULL
    LIMIT ${batchSize}
  `

  let count = 0
  for (const row of result.rows) {
    await generateAndStoreArticleEmbedding(row.id, row.title, row.content)
    count++
  }
  return count
}

// Re-use the same row-to-model mapping from db.ts (duplicated here to avoid circular imports)
function rowToArticleWithCategory(row: KBArticleRow): KBArticleWithCategory {
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
    category: row.category_id ? {
      id: row.category_id,
      slug: row.category_slug || '',
      name: row.category_name || '',
      icon: null,
    } : null,
    author: row.author_id ? {
      id: row.author_id,
      name: row.author_name || '',
      email: row.author_email || '',
    } : null,
  }
}
