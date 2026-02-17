'use client'

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Switch,
} from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  SkipForward,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useState } from 'react'

/**
 * Step 5: Integrations
 *
 * Configure third-party integrations for the new brand:
 * - Analytics (GA4)
 * - Email Provider (Resend)
 * - Video (Mux)
 */

interface IntegrationConfig {
  ga4: {
    enabled: boolean
    measurementId: string
    apiSecret: string
  }
  resend: {
    enabled: boolean
    apiKey: string
    fromEmail: string
    fromName: string
  }
  mux: {
    enabled: boolean
    tokenId: string
    tokenSecret: string
  }
}

function IntegrationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandId = searchParams.get('brandId')
  const brandSlug = searchParams.get('slug')

  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showResendKey, setShowResendKey] = useState(false)
  const [showMuxSecret, setShowMuxSecret] = useState(false)
  const [showGa4Secret, setShowGa4Secret] = useState(false)

  const [config, setConfig] = useState<IntegrationConfig>({
    ga4: {
      enabled: false,
      measurementId: '',
      apiSecret: '',
    },
    resend: {
      enabled: false,
      apiKey: '',
      fromEmail: '',
      fromName: '',
    },
    mux: {
      enabled: false,
      tokenId: '',
      tokenSecret: '',
    },
  })

  const updateConfig = useCallback(
    <K extends keyof IntegrationConfig>(
      integration: K,
      field: keyof IntegrationConfig[K],
      value: string | boolean
    ) => {
      setConfig((prev) => ({
        ...prev,
        [integration]: {
          ...prev[integration],
          [field]: value,
        },
      }))
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!brandId) return

    setIsSaving(true)
    setError(null)

    try {
      // Save each enabled integration
      const savePromises: Promise<Response>[] = []

      if (config.ga4.enabled && config.ga4.measurementId) {
        savePromises.push(
          fetch(`/api/platform/brands/${brandId}/integrations/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'ga4',
              measurementId: config.ga4.measurementId,
              apiSecret: config.ga4.apiSecret || undefined,
            }),
          })
        )
      }

      if (config.resend.enabled && config.resend.apiKey) {
        savePromises.push(
          fetch(`/api/platform/brands/${brandId}/integrations/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'resend',
              apiKey: config.resend.apiKey,
              fromEmail: config.resend.fromEmail || undefined,
              fromName: config.resend.fromName || undefined,
            }),
          })
        )
      }

      if (config.mux.enabled && config.mux.tokenId && config.mux.tokenSecret) {
        savePromises.push(
          fetch(`/api/platform/brands/${brandId}/integrations/video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'mux',
              tokenId: config.mux.tokenId,
              tokenSecret: config.mux.tokenSecret,
            }),
          })
        )
      }

      if (savePromises.length === 0) {
        // No integrations to save, just continue
        router.push(`/brands/new/wizard/step-6?brandId=${brandId}&slug=${brandSlug}`)
        return
      }

      const results = await Promise.all(savePromises)
      const failedResults = results.filter((r) => !r.ok)

      if (failedResults.length > 0) {
        setStatus('error')
        setError(`${failedResults.length} integration(s) failed to save`)
      } else {
        setStatus('success')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to save integrations')
    } finally {
      setIsSaving(false)
    }
  }, [brandId, brandSlug, config, router])

  const handleSkip = useCallback(() => {
    router.push(`/brands/new/wizard/step-6?brandId=${brandId}&slug=${brandSlug}`)
  }, [brandId, brandSlug, router])

  const handleContinue = useCallback(() => {
    router.push(`/brands/new/wizard/step-6?brandId=${brandId}&slug=${brandSlug}`)
  }, [brandId, brandSlug, router])

  const hasAnyEnabled = config.ga4.enabled || config.resend.enabled || config.mux.enabled

  if (!brandId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-muted-foreground">
          Brand ID is required to continue setup.
        </p>
        <Link href="/brands/new">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Step 5 of 6 - Configure analytics, email, and video
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full ${
              step <= 5 ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {status !== 'success' ? (
        <div className="space-y-4">
          {/* Google Analytics 4 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Google Analytics 4</h3>
                    <p className="text-sm text-muted-foreground">Track website traffic and events</p>
                  </div>
                </div>
                <Switch
                  checked={config.ga4.enabled}
                  onCheckedChange={(checked) => updateConfig('ga4', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {config.ga4.enabled && (
              <CardContent className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="ga4MeasurementId">Measurement ID</Label>
                  <Input
                    id="ga4MeasurementId"
                    placeholder="G-XXXXXXXXXX"
                    value={config.ga4.measurementId}
                    onChange={(e) => updateConfig('ga4', 'measurementId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ga4ApiSecret">API Secret (optional)</Label>
                  <div className="relative">
                    <Input
                      id="ga4ApiSecret"
                      type={showGa4Secret ? 'text' : 'password'}
                      placeholder="For server-side events"
                      value={config.ga4.apiSecret}
                      onChange={(e) => updateConfig('ga4', 'apiSecret', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGa4Secret(!showGa4Secret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showGa4Secret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Resend Email */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Mail className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Resend</h3>
                    <p className="text-sm text-muted-foreground">
                      Transactional email delivery
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.resend.enabled}
                  onCheckedChange={(checked) => updateConfig('resend', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {config.resend.enabled && (
              <CardContent className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="resendApiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="resendApiKey"
                      type={showResendKey ? 'text' : 'password'}
                      placeholder="re_..."
                      value={config.resend.apiKey}
                      onChange={(e) => updateConfig('resend', 'apiKey', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResendKey(!showResendKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showResendKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resendFromEmail">From Email</Label>
                    <Input
                      id="resendFromEmail"
                      type="email"
                      placeholder="noreply@example.com"
                      value={config.resend.fromEmail}
                      onChange={(e) => updateConfig('resend', 'fromEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resendFromName">From Name</Label>
                    <Input
                      id="resendFromName"
                      placeholder="Brand Name"
                      value={config.resend.fromName}
                      onChange={(e) => updateConfig('resend', 'fromName', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Mux Video */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <Video className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Mux</h3>
                    <p className="text-sm text-muted-foreground">Video hosting and streaming</p>
                  </div>
                </div>
                <Switch
                  checked={config.mux.enabled}
                  onCheckedChange={(checked) => updateConfig('mux', 'enabled', checked)}
                />
              </div>
            </CardHeader>
            {config.mux.enabled && (
              <CardContent className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="muxTokenId">Access Token ID</Label>
                  <Input
                    id="muxTokenId"
                    placeholder="Token ID"
                    value={config.mux.tokenId}
                    onChange={(e) => updateConfig('mux', 'tokenId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muxTokenSecret">Access Token Secret</Label>
                  <div className="relative">
                    <Input
                      id="muxTokenSecret"
                      type={showMuxSecret ? 'text' : 'password'}
                      placeholder="Token Secret"
                      value={config.mux.tokenSecret}
                      onChange={(e) => updateConfig('mux', 'tokenSecret', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMuxSecret(!showMuxSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showMuxSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        /* Success State */
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Integrations Configured</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Selected integrations have been set up for this brand.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <h3 className="text-sm font-medium">About Integrations</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>- Each brand uses their own integration accounts</li>
            <li>- API keys are encrypted before storage</li>
            <li>- You can add or modify integrations later</li>
            <li>- Additional integrations available in brand settings</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <Link href={`/brands/new/wizard/step-4?brandId=${brandId}&slug=${brandSlug}`}>
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          {status !== 'success' && (
            <Button variant="outline" onClick={handleSkip}>
              <SkipForward className="mr-2 h-4 w-4" />
              Skip for Now
            </Button>
          )}

          {status !== 'success' ? (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : hasAnyEnabled ? (
                <>
                  Save & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleContinue}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  )
}
