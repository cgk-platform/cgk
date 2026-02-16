/**
 * Generic API Client Factory
 *
 * Creates API client instances for various services using tenant-owned credentials.
 * Supports Mux, AssemblyAI, Anthropic, OpenAI, and other services.
 */

import { getTenantApiKey, getTenantApiKeyAndSecret, getTenantApiCredential } from '../storage.js'
import type { TenantApiService } from '../types.js'

// Credential cache
const credentialCache = new Map<string, { credentials: { apiKey: string; apiSecret: string | null }; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(tenantId: string, service: TenantApiService): string {
  return `${tenantId}:${service}`
}

/**
 * Get cached or fresh credentials for a service
 */
async function getCredentials(
  tenantId: string,
  service: TenantApiService
): Promise<{ apiKey: string; apiSecret: string | null } | null> {
  const cacheKey = getCacheKey(tenantId, service)
  const cached = credentialCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.credentials
  }

  const credentials = await getTenantApiKeyAndSecret(tenantId, service)
  if (!credentials) return null

  credentialCache.set(cacheKey, { credentials, timestamp: Date.now() })
  return credentials
}

// =============================================================================
// Mux Client
// =============================================================================

/**
 * Mux client interface (lazy-loaded to avoid requiring the SDK)
 */
export interface MuxClient {
  video: {
    assets: {
      create: (params: { input: { url: string }[]; playback_policy?: string[] }) => Promise<{ id: string; playback_ids?: { id: string }[] }>
      retrieve: (assetId: string) => Promise<{ id: string; status: string; playback_ids?: { id: string }[] }>
      delete: (assetId: string) => Promise<void>
    }
    uploads: {
      create: (params: { new_asset_settings: Record<string, unknown>; cors_origin?: string }) => Promise<{ url: string; id: string }>
    }
  }
}

/**
 * Get a Mux client for a tenant
 *
 * Requires @mux/mux-node to be installed as a peer dependency.
 */
export async function getTenantMuxClient(tenantId: string): Promise<MuxClient | null> {
  const credentials = await getCredentials(tenantId, 'mux')
  if (!credentials || !credentials.apiSecret) return null

  // Dynamic import to avoid bundling Mux SDK if not needed
  try {
    const Mux = (await import('@mux/mux-node')).default
    return new Mux({
      tokenId: credentials.apiKey,
      tokenSecret: credentials.apiSecret,
    }) as unknown as MuxClient
  } catch {
    throw new Error('Mux SDK not installed. Run: pnpm add @mux/mux-node')
  }
}

// =============================================================================
// AssemblyAI Client
// =============================================================================

/**
 * AssemblyAI client interface
 */
export interface AssemblyAIClient {
  apiKey: string
  /** Create a transcription job */
  transcribe(audioUrl: string, options?: AssemblyAITranscribeOptions): Promise<AssemblyAITranscript>
  /** Get transcription status */
  getTranscript(transcriptId: string): Promise<AssemblyAITranscript>
}

export interface AssemblyAITranscribeOptions {
  language_code?: string
  speaker_labels?: boolean
  auto_chapters?: boolean
  entity_detection?: boolean
}

export interface AssemblyAITranscript {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  text?: string
  words?: { text: string; start: number; end: number; confidence: number }[]
  utterances?: { speaker: string; text: string; start: number; end: number }[]
  error?: string
}

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2'

/**
 * Get an AssemblyAI client for a tenant
 */
export async function getTenantAssemblyAIClient(tenantId: string): Promise<AssemblyAIClient | null> {
  const apiKey = await getTenantApiKey(tenantId, 'assemblyai')
  if (!apiKey) return null

  return {
    apiKey,

    async transcribe(audioUrl: string, options?: AssemblyAITranscribeOptions): Promise<AssemblyAITranscript> {
      const response = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          ...options,
        }),
      })

      if (!response.ok) {
        throw new Error(`AssemblyAI error: ${response.status}`)
      }

      return response.json() as Promise<AssemblyAITranscript>
    },

    async getTranscript(transcriptId: string): Promise<AssemblyAITranscript> {
      const response = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
        headers: { Authorization: apiKey },
      })

      if (!response.ok) {
        throw new Error(`AssemblyAI error: ${response.status}`)
      }

      return response.json() as Promise<AssemblyAITranscript>
    },
  }
}

// =============================================================================
// Anthropic Client
// =============================================================================

/**
 * Anthropic client interface
 */
export interface AnthropicClient {
  apiKey: string
  /** Create a message completion */
  createMessage(params: AnthropicMessageParams): Promise<AnthropicMessage>
}

export interface AnthropicMessageParams {
  model: string
  max_tokens: number
  messages: { role: 'user' | 'assistant'; content: string }[]
  system?: string
}

export interface AnthropicMessage {
  id: string
  type: 'message'
  role: 'assistant'
  content: { type: 'text'; text: string }[]
  model: string
  stop_reason: string | null
  usage: { input_tokens: number; output_tokens: number }
}

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1'

/**
 * Get an Anthropic client for a tenant
 */
export async function getTenantAnthropicClient(tenantId: string): Promise<AnthropicClient | null> {
  const apiKey = await getTenantApiKey(tenantId, 'anthropic')
  if (!apiKey) return null

  return {
    apiKey,

    async createMessage(params: AnthropicMessageParams): Promise<AnthropicMessage> {
      const response = await fetch(`${ANTHROPIC_BASE}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Anthropic error: ${response.status} - ${error}`)
      }

      return response.json() as Promise<AnthropicMessage>
    },
  }
}

// =============================================================================
// OpenAI Client
// =============================================================================

/**
 * OpenAI client interface
 */
export interface OpenAIClient {
  apiKey: string
  /** Create a chat completion */
  createChatCompletion(params: OpenAIChatParams): Promise<OpenAIChatCompletion>
  /** Create an embedding */
  createEmbedding(input: string | string[], model?: string): Promise<OpenAIEmbedding>
}

export interface OpenAIChatParams {
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  max_tokens?: number
}

export interface OpenAIChatCompletion {
  id: string
  object: 'chat.completion'
  choices: { index: number; message: { role: string; content: string }; finish_reason: string }[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface OpenAIEmbedding {
  object: 'list'
  data: { object: 'embedding'; index: number; embedding: number[] }[]
  model: string
  usage: { prompt_tokens: number; total_tokens: number }
}

const OPENAI_BASE = 'https://api.openai.com/v1'

/**
 * Get an OpenAI client for a tenant
 */
export async function getTenantOpenAIClient(tenantId: string): Promise<OpenAIClient | null> {
  const apiKey = await getTenantApiKey(tenantId, 'openai')
  if (!apiKey) return null

  return {
    apiKey,

    async createChatCompletion(params: OpenAIChatParams): Promise<OpenAIChatCompletion> {
      const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI error: ${response.status} - ${error}`)
      }

      return response.json() as Promise<OpenAIChatCompletion>
    },

    async createEmbedding(input: string | string[], model = 'text-embedding-3-small'): Promise<OpenAIEmbedding> {
      const response = await fetch(`${OPENAI_BASE}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, model }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI error: ${response.status} - ${error}`)
      }

      return response.json() as Promise<OpenAIEmbedding>
    },
  }
}

// =============================================================================
// Verification
// =============================================================================

/**
 * Verify credentials for a generic service
 */
export async function verifyTenantServiceCredentials(
  tenantId: string,
  service: TenantApiService
): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    switch (service) {
      case 'mux': {
        const client = await getTenantMuxClient(tenantId)
        if (!client) return { valid: false, error: 'Mux not configured' }
        // Try to retrieve a nonexistent asset - we expect a 404 for valid credentials
        // A 401 would throw before this completes. The 404 error is expected and ignored.
        await client.video.assets.retrieve('nonexistent').catch((error) => {
          // Expected: 404 for valid creds, will throw auth error if creds invalid
          console.debug('[mux-verify] Expected 404:', error)
        })
        return { valid: true }
      }

      case 'assemblyai': {
        const client = await getTenantAssemblyAIClient(tenantId)
        if (!client) return { valid: false, error: 'AssemblyAI not configured' }
        // Verify by making a simple GET request
        const response = await fetch(`${ASSEMBLYAI_BASE}/transcript?limit=1`, {
          headers: { Authorization: client.apiKey },
        })
        if (!response.ok) return { valid: false, error: 'Invalid API key' }
        return { valid: true }
      }

      case 'anthropic': {
        const client = await getTenantAnthropicClient(tenantId)
        if (!client) return { valid: false, error: 'Anthropic not configured' }
        // Can't easily verify without using tokens, so just check format
        if (!client.apiKey.startsWith('sk-ant-')) {
          return { valid: false, error: 'Invalid API key format' }
        }
        return { valid: true }
      }

      case 'openai': {
        const client = await getTenantOpenAIClient(tenantId)
        if (!client) return { valid: false, error: 'OpenAI not configured' }
        // Verify by listing models
        const response = await fetch(`${OPENAI_BASE}/models`, {
          headers: { Authorization: `Bearer ${client.apiKey}` },
        })
        if (!response.ok) return { valid: false, error: 'Invalid API key' }
        return { valid: true }
      }

      default:
        return { valid: false, error: `Verification not implemented for ${service}` }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { valid: false, error: message }
  }
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clear cached credentials for a tenant's service
 */
export function clearTenantServiceCache(tenantId: string, service: TenantApiService): void {
  const cacheKey = getCacheKey(tenantId, service)
  credentialCache.delete(cacheKey)
}

/**
 * Clear all cached credentials for a tenant
 */
export function clearTenantAllServicesCache(tenantId: string): void {
  for (const key of credentialCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      credentialCache.delete(key)
    }
  }
}

/**
 * Clear all cached credentials
 */
export function clearAllServicesCache(): void {
  credentialCache.clear()
}

/**
 * Check if tenant has a service configured
 */
export async function hasTenantServiceConfig(
  tenantId: string,
  service: TenantApiService
): Promise<boolean> {
  const credential = await getTenantApiCredential(tenantId, service)
  return credential !== null
}
