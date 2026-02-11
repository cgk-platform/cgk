/**
 * OpenAI Whisper STT Provider Implementation
 *
 * Fallback STT provider with good accuracy and simple API.
 * Best for batch transcription of recorded audio.
 *
 * Pricing: ~$0.006 per minute
 */

import type {
  RealtimeSTTOptions,
  RealtimeTranscriberHandle,
  STTOptions,
  STTProviderType,
  Transcription,
} from '../types.js'
import { BaseSTTProvider } from './provider.js'

const OPENAI_API_BASE = 'https://api.openai.com/v1'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB max

interface WhisperResponse {
  text: string
  segments?: Array<{
    id: number
    seek: number
    start: number
    end: number
    text: string
    tokens: number[]
    temperature: number
    avg_logprob: number
    compression_ratio: number
    no_speech_prob: number
  }>
  language?: string
}

export class WhisperSTT extends BaseSTTProvider {
  name: STTProviderType = 'whisper'
  private apiKey: string

  constructor(apiKey: string) {
    super()
    if (!apiKey) {
      throw new Error('OpenAI API key is required')
    }
    this.apiKey = apiKey
  }

  async transcribeFile(audioUrl: string, options?: STTOptions): Promise<Transcription> {
    this.validateAudioUrl(audioUrl)

    // Download the audio file first
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`)
    }

    const audioBlob = await audioResponse.blob()
    if (audioBlob.size > MAX_FILE_SIZE) {
      throw new Error(`Audio file exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Create form data
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', options?.model || 'whisper-1')
    formData.append('response_format', 'verbose_json')

    if (options?.language) {
      formData.append('language', options.language.split('-')[0]) // Whisper uses 2-letter codes
    }

    const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Whisper transcription failed: ${response.status} - ${errorText}`)
    }

    const result = (await response.json()) as WhisperResponse

    return {
      text: result.text,
      // Whisper doesn't provide speaker diarization out of the box
      // Segments are time-based, not speaker-based
      speakers: result.segments?.map((segment, index) => ({
        speaker: `segment_${index}`,
        text: segment.text,
        start: segment.start * 1000, // Convert to ms
        end: segment.end * 1000,
      })),
      durationMs: result.segments && result.segments.length > 0
        ? result.segments[result.segments.length - 1]!.end * 1000
        : undefined,
    }
  }

  async transcribeRealtime(_options: RealtimeSTTOptions): Promise<RealtimeTranscriberHandle> {
    // Whisper doesn't natively support real-time transcription
    // This would require chunking audio and making multiple API calls
    throw new Error(
      'Real-time transcription is not supported by Whisper. ' +
        'Consider using AssemblyAI for real-time use cases.'
    )
  }

  estimateCost(durationSeconds: number): number {
    // Whisper pricing: $0.006 per minute
    return (durationSeconds / 60) * 0.006
  }
}

/**
 * Whisper supported languages (ISO 639-1 codes)
 */
export const WHISPER_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'ru', name: 'Russian' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'ca', name: 'Catalan' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ar', name: 'Arabic' },
  { code: 'sv', name: 'Swedish' },
  { code: 'it', name: 'Italian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'fi', name: 'Finnish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'he', name: 'Hebrew' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'el', name: 'Greek' },
  { code: 'ms', name: 'Malay' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'da', name: 'Danish' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ta', name: 'Tamil' },
  { code: 'no', name: 'Norwegian' },
  { code: 'th', name: 'Thai' },
  { code: 'ur', name: 'Urdu' },
  { code: 'hr', name: 'Croatian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'la', name: 'Latin' },
  { code: 'mi', name: 'Maori' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'cy', name: 'Welsh' },
  { code: 'sk', name: 'Slovak' },
  { code: 'te', name: 'Telugu' },
  { code: 'fa', name: 'Persian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'sr', name: 'Serbian' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'kn', name: 'Kannada' },
  { code: 'et', name: 'Estonian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'br', name: 'Breton' },
  { code: 'eu', name: 'Basque' },
  { code: 'is', name: 'Icelandic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'ne', name: 'Nepali' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'sq', name: 'Albanian' },
  { code: 'sw', name: 'Swahili' },
  { code: 'gl', name: 'Galician' },
  { code: 'mr', name: 'Marathi' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'si', name: 'Sinhala' },
  { code: 'km', name: 'Khmer' },
  { code: 'sn', name: 'Shona' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'so', name: 'Somali' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'oc', name: 'Occitan' },
  { code: 'ka', name: 'Georgian' },
  { code: 'be', name: 'Belarusian' },
  { code: 'tg', name: 'Tajik' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'am', name: 'Amharic' },
  { code: 'yi', name: 'Yiddish' },
  { code: 'lo', name: 'Lao' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'fo', name: 'Faroese' },
  { code: 'ht', name: 'Haitian Creole' },
  { code: 'ps', name: 'Pashto' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'nn', name: 'Nynorsk' },
  { code: 'mt', name: 'Maltese' },
  { code: 'sa', name: 'Sanskrit' },
  { code: 'lb', name: 'Luxembourgish' },
  { code: 'my', name: 'Myanmar' },
  { code: 'bo', name: 'Tibetan' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'as', name: 'Assamese' },
  { code: 'tt', name: 'Tatar' },
  { code: 'haw', name: 'Hawaiian' },
  { code: 'ln', name: 'Lingala' },
  { code: 'ha', name: 'Hausa' },
  { code: 'ba', name: 'Bashkir' },
  { code: 'jw', name: 'Javanese' },
  { code: 'su', name: 'Sundanese' },
] as const
