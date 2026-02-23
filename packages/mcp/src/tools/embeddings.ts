/**
 * Lightweight Edge-compatible embedding helper
 *
 * Uses fetch() directly (no openai SDK dependency) for Edge Runtime compatibility.
 * Returns empty array on failure — callers should treat embeddings as optional.
 */

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/**
 * Generate an embedding vector for the given text.
 * Returns empty array if API key is missing or on any error.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return []

  const baseUrl = process.env.LITELLM_BASE_URL || 'https://api.openai.com/v1'

  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000),
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    })

    if (!response.ok) return []

    const data = await response.json() as {
      data?: Array<{ embedding?: number[] }>
    }
    return data.data?.[0]?.embedding ?? []
  } catch {
    return []
  }
}
