/**
 * AssemblyAI STT Provider Implementation
 *
 * Primary STT provider with best accuracy and real-time support.
 * Supports speaker diarization, punctuation, and sentiment analysis.
 *
 * Pricing: ~$0.37 per minute
 */

import type {
  RealtimeSTTOptions,
  RealtimeTranscriberHandle,
  STTOptions,
  STTProviderType,
  Transcription,
} from '../types.js'
import { BaseSTTProvider } from './provider.js'

const ASSEMBLYAI_API_BASE = 'https://api.assemblyai.com/v2'
const ASSEMBLYAI_REALTIME_WS = 'wss://api.assemblyai.com/v2/realtime/ws'

interface AssemblyAITranscript {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  text?: string
  confidence?: number
  utterances?: Array<{
    speaker: string
    text: string
    start: number
    end: number
    confidence: number
  }>
  error?: string
}

export class AssemblyAISTT extends BaseSTTProvider {
  name: STTProviderType = 'assemblyai'
  private apiKey: string

  constructor(apiKey: string) {
    super()
    if (!apiKey) {
      throw new Error('AssemblyAI API key is required')
    }
    this.apiKey = apiKey
  }

  async transcribeFile(audioUrl: string, options?: STTOptions): Promise<Transcription> {
    this.validateAudioUrl(audioUrl)

    // Start transcription
    const startResponse = await fetch(`${ASSEMBLYAI_API_BASE}/transcript`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: options?.speakerLabels ?? true,
        language_code: this.normalizeLanguageCode(options?.language),
      }),
    })

    if (!startResponse.ok) {
      const errorText = await startResponse.text()
      throw new Error(`AssemblyAI transcription start failed: ${startResponse.status} - ${errorText}`)
    }

    const { id } = (await startResponse.json()) as { id: string }

    // Poll for completion
    const transcript = await this.pollForCompletion(id)

    return {
      text: transcript.text || '',
      speakers: transcript.utterances?.map((u) => ({
        speaker: u.speaker,
        text: u.text,
        start: u.start,
        end: u.end,
        confidence: u.confidence,
      })),
      confidence: transcript.confidence,
    }
  }

  async transcribeRealtime(options: RealtimeSTTOptions): Promise<RealtimeTranscriberHandle> {
    const sampleRate = options.sampleRate || 16000

    // Get temporary token for WebSocket
    const tokenResponse = await fetch(`${ASSEMBLYAI_API_BASE}/realtime/token`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_in: 3600, // 1 hour
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Failed to get AssemblyAI realtime token: ${tokenResponse.status} - ${errorText}`)
    }

    const { token } = (await tokenResponse.json()) as { token: string }

    // Connect to WebSocket
    const wsUrl = `${ASSEMBLYAI_REALTIME_WS}?sample_rate=${sampleRate}&token=${token}`

    return new Promise((resolve, reject) => {
      // Note: In a real implementation, you would use the 'ws' package for Node.js
      // This is a simplified version that shows the API structure
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        const handle: RealtimeTranscriberHandle = {
          sendAudio: (audioData: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) {
              // Convert to base64 for transmission
              ws.send(JSON.stringify({
                audio_data: audioData.toString('base64'),
              }))
            }
          },
          close: async () => {
            ws.send(JSON.stringify({ terminate_session: true }))
            ws.close()
          },
        }
        resolve(handle)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string)
          if (message.message_type === 'FinalTranscript' || message.message_type === 'PartialTranscript') {
            options.onTranscript({
              text: message.text,
              isFinal: message.message_type === 'FinalTranscript',
              confidence: message.confidence,
              startTime: message.audio_start,
              endTime: message.audio_end,
            })
          }
        } catch (error) {
          options.onError?.(error as Error)
        }
      }

      ws.onerror = (error) => {
        options.onError?.(new Error(`WebSocket error: ${error}`))
        reject(error)
      }

      ws.onclose = () => {
        // Connection closed
      }
    })
  }

  estimateCost(durationSeconds: number): number {
    // AssemblyAI pricing: $0.37 per minute
    return (durationSeconds / 60) * 0.37
  }

  private async pollForCompletion(transcriptId: string): Promise<AssemblyAITranscript> {
    const maxAttempts = 60 // 5 minutes max (5s * 60)
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await fetch(`${ASSEMBLYAI_API_BASE}/transcript/${transcriptId}`, {
        headers: {
          Authorization: this.apiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`AssemblyAI polling failed: ${response.status} - ${errorText}`)
      }

      const transcript = (await response.json()) as AssemblyAITranscript

      if (transcript.status === 'completed') {
        return transcript
      }

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`)
      }

      // Wait 5 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 5000))
      attempts++
    }

    throw new Error('Transcription timed out')
  }
}

/**
 * AssemblyAI supported languages
 */
export const ASSEMBLYAI_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'en_au', name: 'English (Australia)' },
  { code: 'en_uk', name: 'English (UK)' },
  { code: 'en_us', name: 'English (US)' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'fi', name: 'Finnish' },
  { code: 'ko', name: 'Korean' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'vi', name: 'Vietnamese' },
] as const
