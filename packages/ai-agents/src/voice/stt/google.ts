/**
 * Google Cloud STT Provider Implementation
 *
 * Alternative STT provider with real-time support and good accuracy.
 * Best for streaming applications and multi-language support.
 *
 * Pricing: ~$0.024 per minute (enhanced model)
 */

import type {
  RealtimeSTTOptions,
  RealtimeTranscriberHandle,
  STTOptions,
  STTProviderType,
  Transcription,
} from '../types.js'
import { BaseSTTProvider } from './provider.js'

const GOOGLE_STT_API_BASE = 'https://speech.googleapis.com/v1'

interface GoogleRecognitionResult {
  alternatives: Array<{
    transcript: string
    confidence?: number
    words?: Array<{
      word: string
      startTime: string
      endTime: string
      speakerTag?: number
    }>
  }>
  resultEndTime?: string
  channelTag?: number
}

interface GoogleRecognizeResponse {
  results?: GoogleRecognitionResult[]
}

// GoogleLongRunningResponse would be used for long audio files (> 1 minute)
// Keeping for future implementation of longrunningrecognize endpoint

export class GoogleSTT extends BaseSTTProvider {
  name: STTProviderType = 'google'
  private apiKey: string

  constructor(apiKey: string) {
    super()
    if (!apiKey) {
      throw new Error('Google Cloud API key is required')
    }
    this.apiKey = apiKey
  }

  async transcribeFile(audioUrl: string, options?: STTOptions): Promise<Transcription> {
    this.validateAudioUrl(audioUrl)

    // Download audio and convert to base64
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`)
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioContent = Buffer.from(audioBuffer).toString('base64')

    const languageCode = this.normalizeLanguageCode(options?.language)

    // Use longrunningrecognize for files > 1 minute
    // For simplicity, we'll use recognize for shorter files
    const response = await fetch(`${GOOGLE_STT_API_BASE}/speech:recognize?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'MP3',
          languageCode,
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableSpeakerDiarization: options?.speakerLabels ?? false,
          diarizationSpeakerCount: 2,
          model: options?.model || 'latest_long',
        },
        audio: {
          content: audioContent,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google STT failed: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as GoogleRecognizeResponse

    if (!data.results || data.results.length === 0) {
      return { text: '', speakers: [] }
    }

    // Combine all results
    const fullText = data.results
      .map((result) => result.alternatives[0]?.transcript || '')
      .join(' ')
      .trim()

    // Extract speaker segments if available
    const speakers = this.extractSpeakerSegments(data.results)

    // Calculate average confidence
    const confidences = data.results
      .map((result) => result.alternatives[0]?.confidence)
      .filter((c): c is number => c !== undefined)
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : undefined

    return {
      text: fullText,
      speakers,
      confidence: avgConfidence,
    }
  }

  async transcribeRealtime(options: RealtimeSTTOptions): Promise<RealtimeTranscriberHandle> {
    // Google Cloud Speech-to-Text streaming requires gRPC
    // For HTTP-based real-time, we'd need to implement chunked requests
    // This is a simplified implementation that shows the structure

    const languageCode = this.normalizeLanguageCode(options.language)

    // In a real implementation, you would use the Google Cloud Speech client library
    // which handles the gRPC streaming connection
    throw new Error(
      'Google Cloud STT real-time transcription requires the gRPC client library. ' +
        'For HTTP-only environments, consider using AssemblyAI for real-time use cases. ' +
        `Language code would be: ${languageCode}`
    )
  }

  estimateCost(durationSeconds: number): number {
    // Google Cloud STT pricing: $0.024 per minute (enhanced model)
    return (durationSeconds / 60) * 0.024
  }

  private extractSpeakerSegments(results: GoogleRecognitionResult[]) {
    const segments: Array<{
      speaker: string
      text: string
      start: number
      end: number
    }> = []

    for (const result of results) {
      const words = result.alternatives[0]?.words
      if (!words) continue

      let currentSpeaker: number | undefined
      let currentText: string[] = []
      let startTime = 0
      let endTime = 0

      for (const word of words) {
        const speakerTag = word.speakerTag || 1

        if (currentSpeaker === undefined) {
          currentSpeaker = speakerTag
          startTime = this.parseTime(word.startTime)
        }

        if (speakerTag !== currentSpeaker) {
          // Speaker changed, save current segment
          segments.push({
            speaker: `Speaker ${currentSpeaker}`,
            text: currentText.join(' '),
            start: startTime,
            end: endTime,
          })

          // Start new segment
          currentSpeaker = speakerTag
          currentText = []
          startTime = this.parseTime(word.startTime)
        }

        currentText.push(word.word)
        endTime = this.parseTime(word.endTime)
      }

      // Save final segment
      if (currentText.length > 0 && currentSpeaker !== undefined) {
        segments.push({
          speaker: `Speaker ${currentSpeaker}`,
          text: currentText.join(' '),
          start: startTime,
          end: endTime,
        })
      }
    }

    return segments
  }

  private parseTime(timeString?: string): number {
    if (!timeString) return 0
    // Google returns time as "1.5s" or "1500ms"
    const seconds = parseFloat(timeString.replace('s', ''))
    return Math.round(seconds * 1000) // Convert to ms
  }
}

/**
 * Google Cloud STT supported languages
 */
export const GOOGLE_STT_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'es-US', name: 'Spanish (US)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'fr-CA', name: 'French (Canada)' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
  { code: 'ar-EG', name: 'Arabic (Egypt)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'tr-TR', name: 'Turkish' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'sv-SE', name: 'Swedish' },
  { code: 'da-DK', name: 'Danish' },
  { code: 'fi-FI', name: 'Finnish' },
  { code: 'no-NO', name: 'Norwegian' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'id-ID', name: 'Indonesian' },
  { code: 'ms-MY', name: 'Malay' },
  { code: 'fil-PH', name: 'Filipino' },
  { code: 'uk-UA', name: 'Ukrainian' },
  { code: 'cs-CZ', name: 'Czech' },
  { code: 'el-GR', name: 'Greek' },
  { code: 'ro-RO', name: 'Romanian' },
  { code: 'hu-HU', name: 'Hungarian' },
  { code: 'he-IL', name: 'Hebrew' },
  { code: 'sk-SK', name: 'Slovak' },
  { code: 'bg-BG', name: 'Bulgarian' },
  { code: 'hr-HR', name: 'Croatian' },
  { code: 'ca-ES', name: 'Catalan' },
  { code: 'sr-RS', name: 'Serbian' },
  { code: 'sl-SI', name: 'Slovenian' },
  { code: 'lt-LT', name: 'Lithuanian' },
  { code: 'lv-LV', name: 'Latvian' },
  { code: 'et-EE', name: 'Estonian' },
] as const

/**
 * Google Cloud STT models
 */
export const GOOGLE_STT_MODELS = {
  latest_long: 'Best for long-form audio (> 1 minute)',
  latest_short: 'Best for short-form audio (< 1 minute)',
  phone_call: 'Optimized for phone call audio',
  video: 'Optimized for video audio',
  command_and_search: 'Best for voice commands and search queries',
  default: 'Standard model',
} as const
