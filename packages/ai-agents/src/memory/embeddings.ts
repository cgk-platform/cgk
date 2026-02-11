/**
 * Embedding generation using OpenAI text-embedding-3-large
 *
 * Generates 3072-dimension vectors for semantic search and RAG.
 */

import OpenAI from 'openai'

// Lazy initialization to avoid issues if OPENAI_API_KEY not set
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embeddings')
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/**
 * Embedding model configuration
 */
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-large',
  dimensions: 3072,
  maxInputTokens: 8191,
} as const

/**
 * Generate embedding for a single text
 *
 * @param text - Text to embed
 * @returns 3072-dimension vector
 *
 * @example
 * ```ts
 * const embedding = await generateEmbedding('Sarah prefers Slack over email')
 * // Returns number[] with 3072 dimensions
 * ```
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI()

  // Truncate if too long (rough estimate: 4 chars per token)
  const maxChars = EMBEDDING_CONFIG.maxInputTokens * 4
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text

  const response = await openai.embeddings.create({
    model: EMBEDDING_CONFIG.model,
    input: truncatedText,
    dimensions: EMBEDDING_CONFIG.dimensions,
  })

  const firstResult = response.data[0]
  if (!firstResult) {
    throw new Error('No embedding returned from OpenAI')
  }
  return firstResult.embedding
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * More efficient than calling generateEmbedding multiple times.
 *
 * @param texts - Array of texts to embed
 * @returns Array of 3072-dimension vectors (same order as input)
 *
 * @example
 * ```ts
 * const embeddings = await generateEmbeddings([
 *   'Sarah prefers Slack',
 *   'Always confirm before payments over $500'
 * ])
 * // Returns number[][] with 2 vectors
 * ```
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  const openai = getOpenAI()

  // Truncate each text if too long
  const maxChars = EMBEDDING_CONFIG.maxInputTokens * 4
  const truncatedTexts = texts.map((text) =>
    text.length > maxChars ? text.slice(0, maxChars) : text
  )

  // OpenAI allows up to 2048 inputs per request
  const batchSize = 2048
  const results: number[][] = []

  for (let i = 0; i < truncatedTexts.length; i += batchSize) {
    const batch = truncatedTexts.slice(i, i + batchSize)

    const response = await openai.embeddings.create({
      model: EMBEDDING_CONFIG.model,
      input: batch,
      dimensions: EMBEDDING_CONFIG.dimensions,
    })

    // Maintain order - response.data is sorted by index
    const sortedData = response.data.sort((a, b) => a.index - b.index)
    results.push(...sortedData.map((d) => d.embedding))
  }

  return results
}

/**
 * Generate embedding for memory content
 *
 * Combines title and content for better semantic matching.
 *
 * @param title - Memory title
 * @param content - Memory content
 * @returns 3072-dimension vector
 */
export async function generateMemoryEmbedding(title: string, content: string): Promise<number[]> {
  const combinedText = `${title}\n\n${content}`
  return generateEmbedding(combinedText)
}

/**
 * Calculate cosine similarity between two embeddings
 *
 * Note: PostgreSQL pgvector handles this natively with the <=> operator,
 * but this is useful for client-side filtering.
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Similarity score 0.0-1.0
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimensions')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0
    const bVal = b[i] ?? 0
    dotProduct += aVal * bVal
    normA += aVal * aVal
    normB += bVal * bVal
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Estimate token count for text
 *
 * Rough approximation: ~4 characters per token for English text.
 *
 * @param text - Text to estimate
 * @returns Approximate token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
