/**
 * Claude AI Client
 *
 * Handles communication with Anthropic's Claude API
 * for video content generation
 *
 * @ai-pattern claude-client
 */

import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

/**
 * Get or create the Anthropic client instance
 */
export function getClaudeClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

/**
 * Generation options
 */
export interface GenerateOptions {
  /** Maximum tokens in response */
  maxTokens?: number
  /** Temperature (0-1) - lower is more deterministic */
  temperature?: number
  /** Model to use */
  model?: string
}

/**
 * Generate a completion using Claude
 *
 * Uses Claude Haiku by default for cost efficiency
 */
export async function generateCompletion(
  prompt: string,
  options?: GenerateOptions
): Promise<string> {
  const {
    maxTokens = 1024,
    temperature = 0.7,
    model = 'claude-3-haiku-20240307', // Use Haiku for fast, cheap generations
  } = options || {}

  console.log('[Claude AI] Generating completion...', {
    model,
    maxTokens,
    temperature,
    promptLength: prompt.length,
  })

  const anthropic = getClaudeClient()

  const startTime = Date.now()
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  })

  const duration = Date.now() - startTime
  console.log('[Claude AI] Completion received', {
    model,
    duration: `${duration}ms`,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  })

  // Extract text from response
  const content = response.content[0]
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  return content.text.trim()
}

/**
 * Check if Claude API is available
 */
export function isClaudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
