/**
 * Voice system tests
 *
 * Tests for TTS, STT, and voice call functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateVoiceConfig,
  estimateMonthlyVoiceCost,
  DEFAULT_VOICE_CONFIG,
  getTTSProviderInfo,
  getSTTProviderInfo,
  getProvidersForLanguage,
  supportsRealtime,
  supportsVoiceCloning,
  TTS_PROVIDERS,
  STT_PROVIDERS,
} from '../index.js'

describe('Voice Configuration', () => {
  describe('validateVoiceConfig', () => {
    it('should accept valid configuration', () => {
      const errors = validateVoiceConfig({
        speakingRate: 1.0,
        pitch: 0,
        volumeGainDb: 0,
        maxCallDurationMinutes: 30,
        phoneNumber: '+15551234567',
      })
      expect(errors).toHaveLength(0)
    })

    it('should reject invalid speaking rate', () => {
      const errors = validateVoiceConfig({ speakingRate: 3.0 })
      expect(errors).toContain('Speaking rate must be between 0.5 and 2.0')
    })

    it('should reject invalid pitch', () => {
      const errors = validateVoiceConfig({ pitch: 25 })
      expect(errors).toContain('Pitch must be between -20 and 20')
    })

    it('should reject invalid volume gain', () => {
      const errors = validateVoiceConfig({ volumeGainDb: 20 })
      expect(errors).toContain('Volume gain must be between -96 and 16 dB')
    })

    it('should reject invalid max call duration', () => {
      const errors = validateVoiceConfig({ maxCallDurationMinutes: 200 })
      expect(errors).toContain('Max call duration must be between 1 and 120 minutes')
    })

    it('should reject invalid phone number format', () => {
      const errors = validateVoiceConfig({ phoneNumber: '555-123-4567' })
      expect(errors).toContain('Phone number must be in E.164 format (e.g., +15551234567)')
    })

    it('should accept valid E.164 phone number', () => {
      const errors = validateVoiceConfig({ phoneNumber: '+15551234567' })
      expect(errors.some(e => e.includes('Phone number'))).toBe(false)
    })
  })

  describe('estimateMonthlyVoiceCost', () => {
    it('should estimate ElevenLabs + AssemblyAI costs correctly', () => {
      const result = estimateMonthlyVoiceCost({
        ttsProvider: 'elevenlabs',
        sttProvider: 'assemblyai',
        estimatedTTSCharacters: 100000, // 100k chars
        estimatedSTTMinutes: 100, // 100 minutes
      })

      // ElevenLabs: $5 per 100k chars = $5
      // AssemblyAI: $0.37 per minute = $37
      expect(result.ttsCost).toBe(5)
      expect(result.sttCost).toBe(37)
      expect(result.totalCost).toBe(42)
    })

    it('should estimate OpenAI + Whisper costs correctly', () => {
      const result = estimateMonthlyVoiceCost({
        ttsProvider: 'openai',
        sttProvider: 'whisper',
        estimatedTTSCharacters: 1000000, // 1M chars
        estimatedSTTMinutes: 1000, // 1000 minutes
      })

      // OpenAI TTS: $15 per 1M chars = $15
      // Whisper: $0.006 per minute = $6
      expect(result.ttsCost).toBe(15)
      expect(result.sttCost).toBe(6)
      expect(result.totalCost).toBe(21)
    })

    it('should estimate Google costs correctly', () => {
      const result = estimateMonthlyVoiceCost({
        ttsProvider: 'google',
        sttProvider: 'google',
        estimatedTTSCharacters: 1000000, // 1M chars
        estimatedSTTMinutes: 1000, // 1000 minutes
      })

      // Google TTS: $16 per 1M chars = $16
      // Google STT: $0.024 per minute = $24
      expect(result.ttsCost).toBe(16)
      expect(result.sttCost).toBe(24)
      expect(result.totalCost).toBe(40)
    })
  })

  describe('DEFAULT_VOICE_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_VOICE_CONFIG.ttsProvider).toBe('elevenlabs')
      expect(DEFAULT_VOICE_CONFIG.sttProvider).toBe('assemblyai')
      expect(DEFAULT_VOICE_CONFIG.speakingRate).toBe(1.0)
      expect(DEFAULT_VOICE_CONFIG.pitch).toBe(0.0)
      expect(DEFAULT_VOICE_CONFIG.voicemailEnabled).toBe(true)
      expect(DEFAULT_VOICE_CONFIG.maxCallDurationMinutes).toBe(30)
    })
  })
})

describe('Provider Information', () => {
  describe('getTTSProviderInfo', () => {
    it('should return ElevenLabs info', () => {
      const info = getTTSProviderInfo('elevenlabs')
      expect(info).toBeDefined()
      expect(info?.name).toBe('ElevenLabs')
      expect(info?.supportsVoiceCloning).toBe(true)
      expect(info?.supportsStreaming).toBe(true)
    })

    it('should return OpenAI info', () => {
      const info = getTTSProviderInfo('openai')
      expect(info).toBeDefined()
      expect(info?.name).toBe('OpenAI TTS')
      expect(info?.supportsVoiceCloning).toBe(false)
    })

    it('should return Google info', () => {
      const info = getTTSProviderInfo('google')
      expect(info).toBeDefined()
      expect(info?.name).toBe('Google Cloud TTS')
    })

    it('should return undefined for unknown provider', () => {
      const info = getTTSProviderInfo('unknown' as never)
      expect(info).toBeUndefined()
    })
  })

  describe('getSTTProviderInfo', () => {
    it('should return AssemblyAI info', () => {
      const info = getSTTProviderInfo('assemblyai')
      expect(info).toBeDefined()
      expect(info?.name).toBe('AssemblyAI')
      expect(info?.supportsRealtime).toBe(true)
      expect(info?.supportsSpeakerDiarization).toBe(true)
    })

    it('should return Whisper info', () => {
      const info = getSTTProviderInfo('whisper')
      expect(info).toBeDefined()
      expect(info?.name).toBe('OpenAI Whisper')
      expect(info?.supportsRealtime).toBe(false)
    })

    it('should return Google info', () => {
      const info = getSTTProviderInfo('google')
      expect(info).toBeDefined()
      expect(info?.supportsRealtime).toBe(true)
    })
  })

  describe('getProvidersForLanguage', () => {
    it('should return providers for English', () => {
      const providers = getProvidersForLanguage('en-US')
      expect(providers.tts).toContain('elevenlabs')
      expect(providers.tts).toContain('openai')
      expect(providers.tts).toContain('google')
      expect(providers.stt).toContain('assemblyai')
      expect(providers.stt).toContain('whisper')
      expect(providers.stt).toContain('google')
    })

    it('should return providers for Spanish', () => {
      const providers = getProvidersForLanguage('es-ES')
      expect(providers.tts).toContain('elevenlabs')
      expect(providers.tts).toContain('google')
      expect(providers.stt).toContain('assemblyai')
    })

    it('should return empty arrays for unknown language', () => {
      const providers = getProvidersForLanguage('xx-XX')
      expect(providers.tts).toHaveLength(0)
      expect(providers.stt).toHaveLength(0)
    })
  })

  describe('supportsRealtime', () => {
    it('should return true for AssemblyAI', () => {
      expect(supportsRealtime('assemblyai')).toBe(true)
    })

    it('should return false for Whisper', () => {
      expect(supportsRealtime('whisper')).toBe(false)
    })

    it('should return true for Google', () => {
      expect(supportsRealtime('google')).toBe(true)
    })
  })

  describe('supportsVoiceCloning', () => {
    it('should return true for ElevenLabs', () => {
      expect(supportsVoiceCloning('elevenlabs')).toBe(true)
    })

    it('should return false for OpenAI', () => {
      expect(supportsVoiceCloning('openai')).toBe(false)
    })

    it('should return false for Google', () => {
      expect(supportsVoiceCloning('google')).toBe(false)
    })
  })
})

describe('Provider Constants', () => {
  it('should have 3 TTS providers', () => {
    expect(TTS_PROVIDERS).toHaveLength(3)
  })

  it('should have 3 STT providers', () => {
    expect(STT_PROVIDERS).toHaveLength(3)
  })

  it('all TTS providers should have required fields', () => {
    for (const provider of TTS_PROVIDERS) {
      expect(provider.id).toBeDefined()
      expect(provider.name).toBeDefined()
      expect(provider.description).toBeDefined()
      expect(provider.pricing).toBeDefined()
      expect(provider.features).toBeDefined()
      expect(typeof provider.maxTextLength).toBe('number')
      expect(typeof provider.supportsStreaming).toBe('boolean')
      expect(typeof provider.supportsVoiceCloning).toBe('boolean')
    }
  })

  it('all STT providers should have required fields', () => {
    for (const provider of STT_PROVIDERS) {
      expect(provider.id).toBeDefined()
      expect(provider.name).toBeDefined()
      expect(provider.description).toBeDefined()
      expect(provider.pricing).toBeDefined()
      expect(provider.features).toBeDefined()
      expect(typeof provider.supportsRealtime).toBe('boolean')
      expect(typeof provider.supportsSpeakerDiarization).toBe('boolean')
    }
  })
})
