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
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  SkipForward,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useState } from 'react'

/**
 * Step 4: Payment Configuration
 *
 * Configure Stripe for the new brand:
 * - Secret API key
 * - Publishable key
 * - Webhook secret
 * - Live/test mode toggle
 */

function PaymentConfigurationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandId = searchParams.get('brandId')
  const brandSlug = searchParams.get('slug')

  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  const [formData, setFormData] = useState({
    secretKey: '',
    publishableKey: '',
    webhookSecret: '',
    liveMode: false,
  })

  const [validation, setValidation] = useState({
    secretKey: true,
    publishableKey: true,
  })

  const validateForm = useCallback(() => {
    const isSecretKeyValid =
      !formData.secretKey ||
      (formData.liveMode
        ? formData.secretKey.startsWith('sk_live_')
        : formData.secretKey.startsWith('sk_test_'))

    const isPublishableKeyValid =
      !formData.publishableKey ||
      (formData.liveMode
        ? formData.publishableKey.startsWith('pk_live_')
        : formData.publishableKey.startsWith('pk_test_'))

    setValidation({
      secretKey: isSecretKeyValid,
      publishableKey: isPublishableKeyValid,
    })

    return isSecretKeyValid && isPublishableKeyValid
  }, [formData])

  const handleSave = useCallback(async () => {
    if (!validateForm()) return
    if (!brandId || !formData.secretKey) {
      // Skip if no credentials provided
      router.push(`/brands/new/wizard/step-5?brandId=${brandId}&slug=${brandSlug}`)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/brands/${brandId}/integrations/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: formData.secretKey,
          publishableKey: formData.publishableKey || undefined,
          webhookSecret: formData.webhookSecret || undefined,
          livemode: formData.liveMode,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setError(data.error || 'Failed to configure Stripe')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to configure Stripe')
    } finally {
      setIsSaving(false)
    }
  }, [brandId, brandSlug, formData, router, validateForm])

  const handleSkip = useCallback(() => {
    router.push(`/brands/new/wizard/step-5?brandId=${brandId}&slug=${brandSlug}`)
  }, [brandId, brandSlug, router])

  const handleContinue = useCallback(() => {
    router.push(`/brands/new/wizard/step-5?brandId=${brandId}&slug=${brandSlug}`)
  }, [brandId, brandSlug, router])

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
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Configuration</h1>
          <p className="text-muted-foreground">
            Step 4 of 6 - Configure Stripe for payments
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full ${
              step <= 4 ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Form */}
      {status !== 'success' ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Stripe Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Enter the brand&apos;s Stripe API credentials. These will be encrypted and stored
              securely.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Live Mode Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Live Mode</p>
                <p className="text-sm text-muted-foreground">
                  {formData.liveMode
                    ? 'Using production Stripe keys'
                    : 'Using test Stripe keys'}
                </p>
              </div>
              <Switch
                checked={formData.liveMode}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, liveMode: checked }))
                }
              />
            </div>

            {/* Secret Key */}
            <div className="space-y-2">
              <Label htmlFor="secretKey">
                Secret Key <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecretKey ? 'text' : 'password'}
                  placeholder={formData.liveMode ? 'sk_live_...' : 'sk_test_...'}
                  value={formData.secretKey}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, secretKey: e.target.value }))
                  }
                  className={!validation.secretKey ? 'border-destructive' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!validation.secretKey && (
                <p className="text-xs text-destructive">
                  {formData.liveMode
                    ? 'Live mode requires a key starting with sk_live_'
                    : 'Test mode requires a key starting with sk_test_'}
                </p>
              )}
            </div>

            {/* Publishable Key */}
            <div className="space-y-2">
              <Label htmlFor="publishableKey">Publishable Key</Label>
              <Input
                id="publishableKey"
                placeholder={formData.liveMode ? 'pk_live_...' : 'pk_test_...'}
                value={formData.publishableKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, publishableKey: e.target.value }))
                }
                className={!validation.publishableKey ? 'border-destructive' : ''}
              />
              {!validation.publishableKey && (
                <p className="text-xs text-destructive">
                  {formData.liveMode
                    ? 'Live mode requires a key starting with pk_live_'
                    : 'Test mode requires a key starting with pk_test_'}
                </p>
              )}
            </div>

            {/* Webhook Secret */}
            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Webhook Secret</Label>
              <div className="relative">
                <Input
                  id="webhookSecret"
                  type={showWebhookSecret ? 'text' : 'password'}
                  placeholder="whsec_..."
                  value={formData.webhookSecret}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, webhookSecret: e.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showWebhookSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Found in Stripe Dashboard under Webhooks
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Success State */
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Stripe Configured</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Payment processing has been set up for this brand.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <h3 className="text-sm font-medium">About Stripe Setup</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>- Each brand uses their own Stripe account</li>
            <li>- Credentials are encrypted with AES-256-GCM</li>
            <li>- You can configure Stripe later in brand settings</li>
            <li>- Webhooks can be set up after the brand is created</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <Link href={`/brands/new/wizard/step-3?brandId=${brandId}&slug=${brandSlug}`}>
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
            <Button onClick={handleSave} disabled={isSaving || !formData.secretKey}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save & Continue
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

export default function PaymentConfigurationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PaymentConfigurationContent />
    </Suspense>
  )
}
