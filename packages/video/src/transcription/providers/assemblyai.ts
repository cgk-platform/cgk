/**
 * AssemblyAI Transcription Provider
 *
 * Primary transcription provider with:
 * - Word-level timestamps
 * - Speaker diarization
 * - Auto-generated chapters
 * - 60+ language support
 *
 * @ai-pattern assemblyai-provider
 */

import type {
  ITranscriptionProvider,
  TranscribeOptions,
  TranscriptionJob,
  TranscriptionJobStatus,
  TranscriptionResult,
  TranscriptionWord,
  TranscriptionChapter,
} from '../types'

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2'

/** Common filler words to detect */
const FILLER_WORDS = new Set([
  'um',
  'uh',
  'ah',
  'er',
  'like',
  'you know',
  'actually',
  'basically',
  'honestly',
  'literally',
  'so',
  'well',
  'i mean',
  'kind of',
  'sort of',
  'right',
])

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY
  if (!key) {
    throw new Error('ASSEMBLYAI_API_KEY environment variable is not set')
  }
  return key
}

/**
 * Make authenticated API request to AssemblyAI
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ASSEMBLYAI_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: getApiKey(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AssemblyAI API error: ${response.status} - ${error}`)
  }

  return response.json() as Promise<T>
}

/**
 * Map AssemblyAI status to our status type
 */
function mapStatus(status: string): TranscriptionJobStatus {
  switch (status) {
    case 'queued':
      return 'queued'
    case 'processing':
      return 'processing'
    case 'completed':
      return 'completed'
    case 'error':
      return 'error'
    default:
      return 'processing'
  }
}

/**
 * AssemblyAI Transcription Provider
 *
 * Recommended provider - includes:
 * - Word-level timestamps
 * - Speaker diarization (up to 10 speakers)
 * - Auto-generated chapters
 * - 60+ languages
 */
export class AssemblyAIProvider implements ITranscriptionProvider {
  name = 'assemblyai'

  /**
   * Upload audio/video file to AssemblyAI's servers
   *
   * Use this when the source URL isn't directly accessible by AssemblyAI
   * (e.g., requires authentication, is behind a firewall, etc.)
   *
   * @param fileBuffer - Buffer containing file data
   * @returns URL that can be used for transcription
   */
  async uploadFile(fileBuffer: Buffer | ArrayBuffer): Promise<string> {
    const bodyData =
      fileBuffer instanceof ArrayBuffer ? new Uint8Array(fileBuffer) : new Uint8Array(fileBuffer)

    const response = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: getApiKey(),
        'Content-Type': 'application/octet-stream',
      },
      body: bodyData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`AssemblyAI upload error: ${response.status} - ${error}`)
    }

    const result = (await response.json()) as { upload_url: string }
    return result.upload_url
  }

  /**
   * Start a transcription job
   *
   * @param audioUrl - Publicly accessible URL to audio/video file
   * @param options - Transcription configuration
   * @returns Job info with ID and initial status
   */
  async transcribe(audioUrl: string, options: TranscribeOptions = {}): Promise<TranscriptionJob> {
    const body: Record<string, unknown> = {
      audio_url: audioUrl,
      // Word boost - empty array (reserved for custom vocabulary)
      word_boost: [],
      // Speaker diarization
      speaker_labels: options.speakerDiarization ?? true,
      speakers_expected: options.maxSpeakers,
      // Auto chapters (AssemblyAI feature)
      auto_chapters: options.autoChapters ?? true,
      // Language
      language_code: options.languageCode || 'en',
      // Profanity filter
      filter_profanity: options.filterProfanity ?? false,
      // Filler word detection (um, uh, like, you know)
      disfluencies: options.detectFillers ?? true,
      // Webhook for completion callback
      webhook_url: options.webhookUrl,
    }

    const result = await apiRequest<{
      id: string
      status: string
    }>('/transcript', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    return {
      id: result.id,
      provider: this.name,
      status: mapStatus(result.status),
    }
  }

  /**
   * Get current job status
   */
  async getStatus(jobId: string): Promise<TranscriptionJobStatus> {
    const result = await apiRequest<{ status: string }>(`/transcript/${jobId}`)
    return mapStatus(result.status)
  }

  /**
   * Get completed transcription result
   *
   * @throws Error if transcription not complete or failed
   */
  async getResult(jobId: string): Promise<TranscriptionResult> {
    interface AssemblyAIResponse {
      status: string
      text: string
      words: Array<{
        text: string
        start: number
        end: number
        confidence: number
        speaker?: string
        type?: string
      }>
      audio_duration: number
      confidence: number
      utterances?: Array<{
        speaker: string
      }>
      chapters?: Array<{
        headline: string
        summary: string
        start: number
        end: number
      }>
      error?: string
    }

    const result = await apiRequest<AssemblyAIResponse>(`/transcript/${jobId}`)

    if (result.status === 'error') {
      throw new Error(`Transcription failed: ${result.error || 'Unknown error'}`)
    }

    if (result.status !== 'completed') {
      throw new Error(`Transcription not complete: ${result.status}`)
    }

    // Map words (detect fillers by pattern matching)
    const words: TranscriptionWord[] = result.words.map((w) => ({
      text: w.text,
      startMs: w.start,
      endMs: w.end,
      confidence: w.confidence,
      speaker: w.speaker,
      isFiller: FILLER_WORDS.has(w.text.toLowerCase().trim()),
    }))

    // Extract unique speakers
    const speakers = result.utterances
      ? [...new Set(result.utterances.map((u) => u.speaker))]
      : undefined

    // Map chapters
    const chapters: TranscriptionChapter[] | undefined = result.chapters?.map((c) => ({
      headline: c.headline,
      summary: c.summary,
      startMs: c.start,
      endMs: c.end,
    }))

    return {
      text: result.text,
      words,
      durationMs: Math.round(result.audio_duration * 1000),
      confidence: result.confidence,
      speakers,
      chapters,
    }
  }
}

/**
 * Verify AssemblyAI webhook signature
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from x-assemblyai-signature header
 * @param secret - Webhook secret from AssemblyAI dashboard
 * @returns Whether signature is valid
 */
export async function verifyAssemblyAIWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return signature === expectedSignature
}
