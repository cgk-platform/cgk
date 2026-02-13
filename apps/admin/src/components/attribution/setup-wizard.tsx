'use client'

import { Button, Card, CardContent, cn } from '@cgk-platform/ui'
import { CheckCircle, Circle, ArrowRight, ArrowLeft, ExternalLink, Copy, Loader2 } from 'lucide-react'
import { useState, useCallback } from 'react'

import type { SetupWizardState } from '@/lib/attribution'

interface SetupWizardProps {
  onComplete: () => void
}

const WIZARD_STEPS = [
  { id: 1, title: 'Introduction', description: 'Learn about attribution tracking' },
  { id: 2, title: 'Platform Connections', description: 'Connect your ad platforms' },
  { id: 3, title: 'Tracking Parameters', description: 'Configure URL parameters' },
  { id: 4, title: 'Pixel Installation', description: 'Install tracking scripts' },
  { id: 5, title: 'Attribution Defaults', description: 'Choose your default settings' },
  { id: 6, title: 'Verification', description: 'Test your setup' },
]

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [state, setState] = useState<SetupWizardState>({
    currentStep: 1,
    completedSteps: [],
    platformConnections: { meta: false, google: false, tiktok: false },
    pixelVerified: { firstParty: false, ga4: false, meta: false },
    testConversionPassed: false,
  })

  const [isVerifying, setIsVerifying] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 6),
      completedSteps: prev.completedSteps.includes(prev.currentStep)
        ? prev.completedSteps
        : [...prev.completedSteps, prev.currentStep],
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }))
  }, [])

  const verifyPixel = useCallback(async (pixelType: 'firstParty' | 'ga4' | 'meta') => {
    setIsVerifying(true)
    try {
      const response = await fetch('/api/admin/attribution/setup/verify-pixel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixelType }),
      })
      const data = await response.json()
      if (data.verified) {
        setState((prev) => ({
          ...prev,
          pixelVerified: { ...prev.pixelVerified, [pixelType]: true },
        }))
      }
    } finally {
      setIsVerifying(false)
    }
  }, [])

  const runTestConversion = useCallback(async () => {
    setIsTesting(true)
    try {
      const response = await fetch('/api/admin/attribution/setup/test-conversion', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.passed) {
        setState((prev) => ({
          ...prev,
          testConversionPassed: true,
          completedSteps: [...prev.completedSteps, 6],
        }))
      }
    } finally {
      setIsTesting(false)
    }
  }, [])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return <IntroductionStep />
      case 2:
        return (
          <PlatformConnectionsStep
            connections={state.platformConnections}
            onChange={(platform, connected) =>
              setState((prev) => ({
                ...prev,
                platformConnections: { ...prev.platformConnections, [platform]: connected },
              }))
            }
          />
        )
      case 3:
        return <TrackingParametersStep onCopy={copyToClipboard} />
      case 4:
        return (
          <PixelInstallationStep
            verified={state.pixelVerified}
            onVerify={verifyPixel}
            isVerifying={isVerifying}
            onCopy={copyToClipboard}
          />
        )
      case 5:
        return <AttributionDefaultsStep />
      case 6:
        return (
          <VerificationStep
            passed={state.testConversionPassed}
            onTest={runTestConversion}
            isTesting={isTesting}
          />
        )
      default:
        return null
    }
  }

  const canProceed = () => {
    switch (state.currentStep) {
      case 1:
        return true
      case 2:
        return Object.values(state.platformConnections).some(Boolean)
      case 3:
        return true
      case 4:
        return Object.values(state.pixelVerified).some(Boolean)
      case 5:
        return true
      case 6:
        return state.testConversionPassed
      default:
        return false
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Progress Steps */}
      <nav className="flex justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = state.completedSteps.includes(step.id)
          const isCurrent = state.currentStep === step.id

          return (
            <button
              key={step.id}
              onClick={() => goToStep(step.id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-2 border-t-2 pt-4 text-center transition-colors',
                isCurrent
                  ? 'border-primary'
                  : isCompleted
                  ? 'border-emerald-500'
                  : 'border-muted',
                index < WIZARD_STEPS.length - 1 && 'mr-2'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.id}
              </div>
              <div className="hidden sm:block">
                <p className={cn('text-sm font-medium', isCurrent && 'text-primary')}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </button>
          )
        })}
      </nav>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={state.currentStep === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        {state.currentStep === 6 ? (
          <Button onClick={onComplete} disabled={!state.testConversionPassed}>
            Complete Setup
            <CheckCircle className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Step Components

function IntroductionStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome to Attribution Setup</h2>
        <p className="mt-2 text-muted-foreground">
          This wizard will help you configure attribution tracking for your store. Attribution
          tracking helps you understand which marketing channels are driving sales.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <span className="text-lg">1</span>
          </div>
          <h3 className="font-medium">Connect Platforms</h3>
          <p className="text-sm text-muted-foreground">
            Link your Meta, Google, and TikTok ad accounts
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <span className="text-lg">2</span>
          </div>
          <h3 className="font-medium">Install Tracking</h3>
          <p className="text-sm text-muted-foreground">
            Set up first-party tracking and pixel verification
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <span className="text-lg">3</span>
          </div>
          <h3 className="font-medium">Verify & Test</h3>
          <p className="text-sm text-muted-foreground">
            Confirm everything is working correctly
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm">
          <strong>Estimated time:</strong> 10-15 minutes
        </p>
        <p className="text-sm text-muted-foreground">
          You can save your progress and return at any time.
        </p>
      </div>
    </div>
  )
}

function PlatformConnectionsStep({
  connections,
  onChange,
}: {
  connections: SetupWizardState['platformConnections']
  onChange: (platform: 'meta' | 'google' | 'tiktok', connected: boolean) => void
}) {
  const platforms = [
    { id: 'meta' as const, name: 'Meta Ads', description: 'Facebook & Instagram' },
    { id: 'google' as const, name: 'Google Ads', description: 'Search, Display & YouTube' },
    { id: 'tiktok' as const, name: 'TikTok Ads', description: 'TikTok For Business' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connect Your Ad Platforms</h2>
        <p className="mt-2 text-muted-foreground">
          Connect your advertising accounts to enable cost data import and advanced attribution.
        </p>
      </div>

      <div className="space-y-4">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-4">
              {connections[platform.id] ? (
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">{platform.name}</p>
                <p className="text-sm text-muted-foreground">{platform.description}</p>
              </div>
            </div>
            <Button
              variant={connections[platform.id] ? 'outline' : 'default'}
              onClick={() => onChange(platform.id, !connections[platform.id])}
            >
              {connections[platform.id] ? 'Connected' : 'Connect'}
              {!connections[platform.id] && <ExternalLink className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        At least one platform connection is required to proceed.
      </p>
    </div>
  )
}

function TrackingParametersStep({ onCopy }: { onCopy: (text: string) => void }) {
  const parameters = [
    {
      platform: 'Meta',
      params: 'fbclid={fbclid}&nbt={{campaign.name}}~{{adset.name}}~{{ad.name}}',
      description: 'Add to your ad URL parameters in Meta Ads Manager',
    },
    {
      platform: 'Google',
      params: 'gclid={gclid}&utm_source=google&utm_medium=cpc&utm_campaign={campaignid}',
      description: 'Use ValueTrack parameters in your tracking template',
    },
    {
      platform: 'TikTok',
      params: 'ttclid=__CLICKID__&utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__',
      description: 'Add to your TikTok ad click-through URL',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Configure Tracking Parameters</h2>
        <p className="mt-2 text-muted-foreground">
          Add these URL parameters to your ad campaigns to enable accurate attribution tracking.
        </p>
      </div>

      <div className="space-y-4">
        {parameters.map((param) => (
          <div key={param.platform} className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">{param.platform}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(param.params)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <code className="block rounded bg-muted p-2 text-sm">{param.params}</code>
            <p className="mt-2 text-sm text-muted-foreground">{param.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PixelInstallationStep({
  verified,
  onVerify,
  isVerifying,
  onCopy,
}: {
  verified: SetupWizardState['pixelVerified']
  onVerify: (type: 'firstParty' | 'ga4' | 'meta') => void
  isVerifying: boolean
  onCopy: (text: string) => void
}) {
  const trackingScript = `<script src="https://cdn.cgk.io/tracking.js" data-tenant="YOUR_TENANT_ID"></script>`

  const pixels = [
    { id: 'firstParty' as const, name: 'First-Party Tracking', description: 'CGK tracking script' },
    { id: 'ga4' as const, name: 'GA4', description: 'Google Analytics 4' },
    { id: 'meta' as const, name: 'Meta Pixel', description: 'Facebook Pixel' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Install Tracking Pixels</h2>
        <p className="mt-2 text-muted-foreground">
          Install and verify your tracking scripts to capture visitor touchpoints.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">First-Party Tracking Script</h3>
          <Button variant="ghost" size="sm" onClick={() => onCopy(trackingScript)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        </div>
        <code className="block rounded bg-muted p-2 text-sm">{trackingScript}</code>
        <p className="mt-2 text-sm text-muted-foreground">
          Add this script to your store&apos;s &lt;head&gt; section
        </p>
      </div>

      <div className="space-y-3">
        {pixels.map((pixel) => (
          <div
            key={pixel.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-4">
              {verified[pixel.id] ? (
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">{pixel.name}</p>
                <p className="text-sm text-muted-foreground">{pixel.description}</p>
              </div>
            </div>
            <Button
              variant={verified[pixel.id] ? 'outline' : 'default'}
              onClick={() => onVerify(pixel.id)}
              disabled={isVerifying || verified[pixel.id]}
            >
              {isVerifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : verified[pixel.id] ? (
                'Verified'
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AttributionDefaultsStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Choose Attribution Defaults</h2>
        <p className="mt-2 text-muted-foreground">
          Select your preferred attribution model and window. You can change these later in Settings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Default Model</label>
          <select className="w-full rounded-md border p-2">
            <option value="time_decay">Time Decay (Recommended)</option>
            <option value="first_touch">First Touch</option>
            <option value="last_touch">Last Touch</option>
            <option value="linear">Linear</option>
            <option value="position_based">Position Based</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Time Decay gives more credit to touchpoints closer to conversion.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Default Window</label>
          <select className="w-full rounded-md border p-2">
            <option value="7d">7 Days (Recommended)</option>
            <option value="14d">14 Days</option>
            <option value="28d">28 Days</option>
            <option value="30d">30 Days</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Touchpoints within this window before conversion receive credit.
          </p>
        </div>
      </div>
    </div>
  )
}

function VerificationStep({
  passed,
  onTest,
  isTesting,
}: {
  passed: boolean
  onTest: () => void
  isTesting: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Verify Your Setup</h2>
        <p className="mt-2 text-muted-foreground">
          Run a test conversion to verify everything is working correctly.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-8">
        {passed ? (
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
            <h3 className="mt-4 text-lg font-medium">All Tests Passed!</h3>
            <p className="text-muted-foreground">
              Your attribution tracking is configured correctly.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <Button onClick={onTest} disabled={isTesting} size="lg">
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Test Conversion'
              )}
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              This will simulate a conversion to verify tracking is working.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
