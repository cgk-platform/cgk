/**
 * Ambient module declarations for external workspace packages.
 *
 * These packages form circular dependencies (jobs <-> video <-> integrations)
 * and are marked as --external in the tsup build. They're loaded via dynamic
 * import() at runtime only, so they don't need to be built before this package.
 *
 * These declarations provide type information for DTS generation without
 * requiring the external package dist to exist at build time.
 *
 * When adding new dynamic imports from these packages, add the corresponding
 * type declarations here to keep Vercel builds working.
 */

declare module '@cgk-platform/video/transcription' {
  export interface TranscriptionWord {
    text: string
    startMs: number
    endMs: number
    confidence: number
    speaker?: string
    isFiller?: boolean
  }

  export interface TranscriptionChapter {
    headline: string
    summary: string
    startMs: number
    endMs: number
  }

  export type TranscriptionJobStatus = 'queued' | 'processing' | 'completed' | 'error'
  export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed'

  export interface TranscribeOptions {
    languageCode?: string
    speakerDiarization?: boolean
    maxSpeakers?: number
    autoChapters?: boolean
    filterProfanity?: boolean
    detectFillers?: boolean
    webhookUrl?: string
  }

  export interface TranscriptionJob {
    id: string
    provider: string
    status: TranscriptionJobStatus
  }

  export interface ITranscriptionProvider {
    name: string
    transcribe(audioUrl: string, options?: TranscribeOptions): Promise<TranscriptionJob>
    getStatus(jobId: string): Promise<TranscriptionJobStatus>
    getResult(jobId: string): Promise<{
      text: string
      words: TranscriptionWord[]
      durationMs: number
      confidence: number
      speakers?: string[]
      chapters?: TranscriptionChapter[]
    }>
  }

  export interface AITask {
    text: string
    timestampSeconds?: number
    completed: boolean
  }

  export interface VideoWithTranscription {
    id: string
    tenantId: string
    title: string
    transcriptionStatus: TranscriptionStatus
    transcriptionJobId: string | null
    transcriptionText: string | null
    transcriptionWords: TranscriptionWord[] | null
    aiTitle: string | null
    aiSummary: string | null
    aiChapters: TranscriptionChapter[] | null
    aiTasks: AITask[] | null
  }

  export function getTranscriptionProvider(): ITranscriptionProvider
  export function getVideoTranscription(tenantId: string, videoId: string): Promise<VideoWithTranscription | null>
  export function startTranscription(tenantId: string, videoId: string, jobId: string): Promise<void>
  export function saveTranscriptionResult(
    tenantId: string,
    videoId: string,
    text: string,
    words: TranscriptionWord[],
    chapters: TranscriptionChapter[]
  ): Promise<void>
  export function failTranscription(tenantId: string, videoId: string, error: string): Promise<void>
  export function saveAIContent(
    tenantId: string,
    videoId: string,
    content: { title: string; summary: string; tasks: AITask[] }
  ): Promise<void>
  export function getVideosPendingTranscription(tenantId: string): Promise<VideoWithTranscription[]>
}

declare module '@cgk-platform/shopify' {
  export interface ShopifyCredentials {
    shop: string
    accessToken: string
    webhookSecret: string | null
    scopes: string[]
    apiVersion: string
  }

  export function getShopifyCredentials(tenantId: string): Promise<ShopifyCredentials>
}

declare module '@cgk-platform/shopify/webhooks' {
  export interface WebhookSyncResult {
    added: string[]
    removed: string[]
    unchanged: string[]
    errors: Array<{ topic: string; error: string }>
  }

  export interface ShopifyCredentials {
    shop: string
    accessToken: string
    webhookSecret: string | null
  }

  export function syncWebhookRegistrations(
    tenantId: string,
    shop: string,
    credentials: ShopifyCredentials,
    webhookUrl: string
  ): Promise<WebhookSyncResult>
}

declare module '@cgk-platform/integrations' {
  import type Stripe from 'stripe'

  // Tenant credential client factories
  export function getTenantStripeClient(tenantId: string): Promise<Stripe | null>
  export function requireTenantStripeClient(tenantId: string): Promise<Stripe>
  export function hasTenantStripeConfig(tenantId: string): Promise<boolean>

  export function getTenantResendClient(tenantId: string): Promise<import('resend').Resend | null>
  export function requireTenantResendClient(tenantId: string): Promise<import('resend').Resend>
  export function hasTenantResendConfig(tenantId: string): Promise<boolean>

  export function getTenantAssemblyAIClient(tenantId: string): Promise<{
    getTranscript(jobId: string): Promise<{
      status: string
      text?: string
      error?: string
      words?: Array<{ text: string; start: number; end: number; confidence: number }>
    }>
  } | null>

  export function getTenantAnthropicClient(tenantId: string): Promise<{
    createMessage(params: {
      model: string
      max_tokens: number
      messages: Array<{ role: string; content: string }>
    }): Promise<{
      content: Array<{ text?: string }>
    }>
  } | null>
}
