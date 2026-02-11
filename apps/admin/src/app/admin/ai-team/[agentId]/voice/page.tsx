'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Slider,
  Textarea,
  Alert,
  AlertDescription,
} from '@cgk/ui'
import { Loader2, Play, Phone, Mic, Volume2, Settings2 } from 'lucide-react'

interface VoiceConfig {
  id: string
  agentId: string
  ttsProvider: string
  ttsVoiceId: string | null
  ttsVoiceName: string | null
  ttsFallbackProvider: string | null
  sttProvider: string
  sttLanguage: string
  sttModel: string | null
  speakingRate: number
  pitch: number
  volumeGainDb: number
  phoneNumber: string | null
  voicemailEnabled: boolean
  voicemailGreeting: string | null
  maxCallDurationMinutes: number
}

interface Voice {
  id: string
  name: string
  gender: string
  language: string
  accent?: string
  previewUrl?: string
  provider: string
}

const TTS_PROVIDERS = [
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Best quality, voice cloning' },
  { id: 'openai', name: 'OpenAI TTS', description: 'Good quality, fast' },
  { id: 'google', name: 'Google Cloud TTS', description: 'Many voices, stable' },
]

const STT_PROVIDERS = [
  { id: 'assemblyai', name: 'AssemblyAI', description: 'Best accuracy, real-time' },
  { id: 'whisper', name: 'OpenAI Whisper', description: 'Good accuracy, simple' },
  { id: 'google', name: 'Google Cloud STT', description: 'Real-time, stable' },
]

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
]

export default function VoiceSettingsPage() {
  const params = useParams()
  const agentId = params.agentId as string

  const [config, setConfig] = useState<VoiceConfig | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<VoiceConfig>>({})

  useEffect(() => {
    fetchVoiceConfig()
  }, [agentId])

  useEffect(() => {
    if (formData.ttsProvider) {
      fetchVoices(formData.ttsProvider)
    }
  }, [formData.ttsProvider])

  async function fetchVoiceConfig() {
    try {
      const response = await fetch(`/api/admin/ai-agents/${agentId}/voice`)
      if (response.ok) {
        const data = await response.json()
        if (data.config) {
          setConfig(data.config)
          setFormData(data.config)
        } else {
          // Set defaults if no config exists
          setFormData({
            ttsProvider: 'elevenlabs',
            sttProvider: 'assemblyai',
            sttLanguage: 'en',
            speakingRate: 1.0,
            pitch: 0,
            volumeGainDb: 0,
            voicemailEnabled: true,
            maxCallDurationMinutes: 30,
          })
        }
      }
    } catch {
      setError('Failed to fetch voice configuration')
    } finally {
      setLoading(false)
    }
  }

  async function fetchVoices(provider: string) {
    try {
      const response = await fetch(
        `/api/admin/ai-agents/${agentId}/voice/voices?provider=${provider}`
      )
      if (response.ok) {
        const data = await response.json()
        setVoices(data.voices || [])
      }
    } catch {
      console.error('Failed to fetch voices')
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const method = config ? 'PATCH' : 'POST'
      const response = await fetch(`/api/admin/ai-agents/${agentId}/voice`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
        setSuccess('Voice settings saved successfully')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save voice settings')
      }
    } catch {
      setError('Failed to save voice settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestTTS() {
    if (!formData.ttsProvider || !formData.ttsVoiceId) {
      setError('Please select a TTS provider and voice first')
      return
    }

    setTesting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/ai-agents/${agentId}/voice/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: 'tts',
          provider: formData.ttsProvider,
          voiceId: formData.ttsVoiceId,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('TTS test successful!')
      } else {
        setError(data.error || 'TTS test failed')
      }
    } catch {
      setError('TTS test failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Voice Settings</h1>
        <p className="text-muted-foreground">
          Configure text-to-speech, speech-to-text, and phone call settings for this agent.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Text-to-Speech Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Text-to-Speech
          </CardTitle>
          <CardDescription>
            Configure how the agent speaks during voice calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={formData.ttsProvider || 'elevenlabs'}
                onValueChange={(value) => setFormData({ ...formData, ttsProvider: value, ttsVoiceId: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTS_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div>
                        <div>{provider.name}</div>
                        <div className="text-xs text-muted-foreground">{provider.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Voice</Label>
              <Select
                value={formData.ttsVoiceId || ''}
                onValueChange={(value) => {
                  const voice = voices.find((v) => v.id === value)
                  setFormData({
                    ...formData,
                    ttsVoiceId: value,
                    ttsVoiceName: voice?.name || null,
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div>
                        <div>{voice.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {voice.gender} - {voice.accent || voice.language}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Speaking Rate ({formData.speakingRate?.toFixed(1)}x)</Label>
            <Slider
              value={[formData.speakingRate || 1.0]}
              min={0.5}
              max={2.0}
              step={0.1}
              onValueChange={([value]) => setFormData({ ...formData, speakingRate: value })}
            />
            <p className="text-xs text-muted-foreground">0.5x (slow) to 2.0x (fast)</p>
          </div>

          <div className="space-y-2">
            <Label>Pitch ({formData.pitch?.toFixed(0)})</Label>
            <Slider
              value={[formData.pitch || 0]}
              min={-20}
              max={20}
              step={1}
              onValueChange={([value]) => setFormData({ ...formData, pitch: value })}
            />
            <p className="text-xs text-muted-foreground">-20 (lower) to +20 (higher)</p>
          </div>

          <div className="space-y-2">
            <Label>Fallback Provider</Label>
            <Select
              value={formData.ttsFallbackProvider || ''}
              onValueChange={(value) => setFormData({ ...formData, ttsFallbackProvider: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No fallback" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No fallback</SelectItem>
                {TTS_PROVIDERS.filter((p) => p.id !== formData.ttsProvider).map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={handleTestTTS}
            disabled={testing || !formData.ttsVoiceId}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Test Voice
          </Button>
        </CardContent>
      </Card>

      {/* Speech-to-Text Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Speech-to-Text
          </CardTitle>
          <CardDescription>
            Configure how the agent understands spoken input
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={formData.sttProvider || 'assemblyai'}
                onValueChange={(value) => setFormData({ ...formData, sttProvider: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STT_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div>
                        <div>{provider.name}</div>
                        <div className="text-xs text-muted-foreground">{provider.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={formData.sttLanguage || 'en'}
                onValueChange={(value) => setFormData({ ...formData, sttLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Call Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Calls
          </CardTitle>
          <CardDescription>
            Configure phone number and voicemail settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              placeholder="+15551234567"
              value={formData.phoneNumber || ''}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              E.164 format (e.g., +15551234567). Provisioned through Retell.ai.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max Call Duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={formData.maxCallDurationMinutes || 30}
              onChange={(e) => setFormData({ ...formData, maxCallDurationMinutes: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Voicemail</Label>
              <p className="text-sm text-muted-foreground">
                Allow callers to leave voicemail if the agent is unavailable
              </p>
            </div>
            <Switch
              checked={formData.voicemailEnabled ?? true}
              onCheckedChange={(checked) => setFormData({ ...formData, voicemailEnabled: checked })}
            />
          </div>

          {formData.voicemailEnabled && (
            <div className="space-y-2">
              <Label>Voicemail Greeting</Label>
              <Textarea
                placeholder="Hi, this is [Agent Name]. I'm not available right now. Please leave a message and I'll get back to you soon."
                value={formData.voicemailGreeting || ''}
                onChange={(e) => setFormData({ ...formData, voicemailGreeting: e.target.value || null })}
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Settings2 className="h-4 w-4 mr-2" />
          )}
          Save Voice Settings
        </Button>
      </div>
    </div>
  )
}
