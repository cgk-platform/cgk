'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, Input, Badge } from '@cgk/ui'
import { Mic, Volume2, AudioLines, Save, Play, Plus, X } from 'lucide-react'

import type { VoiceConfig } from '@/lib/bri/types'

interface VoiceConfigViewProps {
  tenantSlug: string
  initialConfig: VoiceConfig | null
}

const DEFAULT_CONFIG: VoiceConfig = {
  ttsProvider: 'elevenlabs',
  ttsVoiceId: null,
  ttsModel: 'eleven_turbo_v2_5',
  ttsStability: 0.5,
  ttsSimilarityBoost: 0.75,
  ttsSpeed: 1.0,
  sttProvider: 'assemblyai',
  sttModel: null,
  sttLanguage: 'en',
  acknowledgments: ['Got it', 'Understood', 'Sure thing'],
  thinkingPhrases: ['Let me check...', 'One moment...'],
  speechSpeed: 1.0,
}

const TTS_PROVIDERS = [
  { id: 'elevenlabs', name: 'ElevenLabs' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'google', name: 'Google Cloud' },
]

const STT_PROVIDERS = [
  { id: 'assemblyai', name: 'AssemblyAI' },
  { id: 'deepgram', name: 'Deepgram' },
  { id: 'whisper', name: 'Whisper' },
]

const TTS_MODELS = [
  { id: 'eleven_turbo_v2_5', name: 'Eleven Turbo v2.5' },
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_monolingual_v1', name: 'Eleven Monolingual v1' },
]

export function VoiceConfigView({ initialConfig }: VoiceConfigViewProps) {
  const [config, setConfig] = useState<VoiceConfig>(initialConfig ?? DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [newAcknowledgment, setNewAcknowledgment] = useState('')
  const [newThinkingPhrase, setNewThinkingPhrase] = useState('')

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/bri/voice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } catch (error) {
      console.error('Failed to save voice config:', error)
    } finally {
      setSaving(false)
    }
  }

  const addAcknowledgment = () => {
    if (newAcknowledgment.trim()) {
      setConfig({
        ...config,
        acknowledgments: [...config.acknowledgments, newAcknowledgment.trim()],
      })
      setNewAcknowledgment('')
    }
  }

  const removeAcknowledgment = (index: number) => {
    setConfig({
      ...config,
      acknowledgments: config.acknowledgments.filter((_, i) => i !== index),
    })
  }

  const addThinkingPhrase = () => {
    if (newThinkingPhrase.trim()) {
      setConfig({
        ...config,
        thinkingPhrases: [...config.thinkingPhrases, newThinkingPhrase.trim()],
      })
      setNewThinkingPhrase('')
    }
  }

  const removeThinkingPhrase = (index: number) => {
    setConfig({
      ...config,
      thinkingPhrases: config.thinkingPhrases.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Voice Configuration</h1>
          <p className="text-sm text-muted-foreground">Configure TTS, STT, and voice personality</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* TTS Settings */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Text-to-Speech (TTS)
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Provider</label>
              <select
                value={config.ttsProvider}
                onChange={(e) => setConfig({ ...config, ttsProvider: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                {TTS_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Voice ID</label>
              <Input
                value={config.ttsVoiceId ?? ''}
                onChange={(e) => setConfig({ ...config, ttsVoiceId: e.target.value || null })}
                placeholder="Enter voice ID"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Model</label>
              <select
                value={config.ttsModel}
                onChange={(e) => setConfig({ ...config, ttsModel: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                {TTS_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Stability: {config.ttsStability}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.ttsStability}
                onChange={(e) => setConfig({ ...config, ttsStability: parseFloat(e.target.value) })}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Similarity Boost: {config.ttsSimilarityBoost}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.ttsSimilarityBoost}
                onChange={(e) => setConfig({ ...config, ttsSimilarityBoost: parseFloat(e.target.value) })}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Speed: {config.ttsSpeed}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={config.ttsSpeed}
                onChange={(e) => setConfig({ ...config, ttsSpeed: parseFloat(e.target.value) })}
                className="mt-1 w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* STT Settings */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Speech-to-Text (STT)
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Provider</label>
              <select
                value={config.sttProvider}
                onChange={(e) => setConfig({ ...config, sttProvider: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                {STT_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Model</label>
              <Input
                value={config.sttModel ?? ''}
                onChange={(e) => setConfig({ ...config, sttModel: e.target.value || null })}
                placeholder="Default model"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Language</label>
              <select
                value={config.sttLanguage}
                onChange={(e) => setConfig({ ...config, sttLanguage: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Personality - Acknowledgments */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AudioLines className="h-4 w-4" />
              Acknowledgments
            </h3>
            <p className="text-xs text-muted-foreground">Phrases Bri uses to confirm understanding</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {config.acknowledgments.map((phrase, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {phrase}
                  <button
                    onClick={() => removeAcknowledgment(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAcknowledgment}
                onChange={(e) => setNewAcknowledgment(e.target.value)}
                placeholder="Add new phrase"
                onKeyDown={(e) => e.key === 'Enter' && addAcknowledgment()}
              />
              <Button variant="outline" size="sm" onClick={addAcknowledgment}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personality - Thinking Phrases */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AudioLines className="h-4 w-4" />
              Thinking Phrases
            </h3>
            <p className="text-xs text-muted-foreground">Phrases Bri uses while processing</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {config.thinkingPhrases.map((phrase, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {phrase}
                  <button
                    onClick={() => removeThinkingPhrase(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newThinkingPhrase}
                onChange={(e) => setNewThinkingPhrase(e.target.value)}
                placeholder="Add new phrase"
                onKeyDown={(e) => e.key === 'Enter' && addThinkingPhrase()}
              />
              <Button variant="outline" size="sm" onClick={addThinkingPhrase}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voice Testing */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Play className="h-4 w-4" />
            Voice Testing
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter text to test voice"
              className="flex-1"
            />
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure a voice ID above to enable voice preview
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
