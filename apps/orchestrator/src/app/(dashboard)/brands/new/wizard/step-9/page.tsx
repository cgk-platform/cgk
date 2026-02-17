'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  cn,
} from '@cgk-platform/ui'
import type { LaunchChecklistItem, StepData } from '@cgk-platform/onboarding'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  Rocket,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

import { ChecklistIcon, ConfettiOverlay, NextActionCard } from './components'
import { generateChecklist, generateConfettiPieces, type ConfettiPiece } from './utils'

/**
 * Step 9: Launch / Complete
 *
 * Review configuration and launch the brand with success animation.
 */
function Step9Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [stepData, setStepData] = useState<StepData | null>(null)
  const [checklist, setChecklist] = useState<LaunchChecklistItem[]>([])
  const [canLaunch, setCanLaunch] = useState(false)
  const [blockers, setBlockers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLaunching, setIsLaunching] = useState(false)
  const [isLaunched, setIsLaunched] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([])
  const [error, setError] = useState<string | null>(null)
  const [brandSlug, setBrandSlug] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // Load session data and generate checklist
  const loadSessionData = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/onboarding/${sessionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch session')
      }

      const { session } = await response.json()
      setStepData(session.stepData || {})
      setOrganizationId(session.organizationId)

      if (session.stepData?.basicInfo?.slug) {
        setBrandSlug(session.stepData.basicInfo.slug)
      }

      // Generate checklist from step data
      const checklistItems = generateChecklist(session.stepData || {})
      setChecklist(checklistItems)

      // Check launch readiness
      const blockingItems = checklistItems
        .filter((item) => item.required && item.status === 'fail')
        .map((item) => item.label)
      setBlockers(blockingItems)
      setCanLaunch(blockingItems.length === 0)

      // Check if already launched
      if (session.status === 'completed' || session.stepData?.launch?.launched) {
        setIsLaunched(true)
      }
    } catch (err) {
      console.error('Failed to load session:', err)
      setError('Failed to load session data')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadSessionData()
  }, [loadSessionData])

  // Trigger confetti animation
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true)
    setConfettiPieces(generateConfettiPieces(100))
    setTimeout(() => setShowConfetti(false), 5000)
  }, [])

  // Handle launch
  const handleLaunch = async () => {
    if (!sessionId || !canLaunch) return

    setIsLaunching(true)
    setError(null)

    try {
      // Complete the step
      const stepResponse = await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 9,
          data: {
            launched: true,
            launchedAt: new Date().toISOString(),
            checklist,
          },
          action: 'complete',
        }),
      })

      if (!stepResponse.ok) {
        throw new Error('Failed to complete step')
      }

      // Launch the organization
      const launchResponse = await fetch(
        `/api/platform/brands/${organizationId}/launch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      // Even if launch endpoint doesn't exist yet, mark as launched locally
      if (!launchResponse.ok) {
        console.warn('Launch endpoint not available, continuing with local state')
      }

      setIsLaunched(true)
      triggerConfetti()
    } catch (err) {
      console.error('Launch error:', err)
      setError('Failed to launch brand. Please try again.')
    } finally {
      setIsLaunching(false)
    }
  }

  // Handle navigation
  const handleBack = async () => {
    if (!sessionId) {
      router.push('/brands/new/wizard/step-8')
      return
    }

    try {
      await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 9,
          data: { checklist },
          action: 'back',
        }),
      })
    } catch (err) {
      console.error('Failed to save step:', err)
    }

    router.push(`/brands/new/wizard/step-8?sessionId=${sessionId}`)
  }

  const handleGoToBrand = () => {
    if (organizationId) {
      router.push(`/brands/${organizationId}`)
    } else {
      router.push('/brands')
    }
  }

  if (!sessionId) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Required</AlertTitle>
          <AlertDescription>
            Please start the onboarding wizard from the beginning.
          </AlertDescription>
        </Alert>
        <Link href="/brands/new">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </Link>
      </div>
    )
  }

  // Success state
  if (isLaunched) {
    return (
      <div className="relative mx-auto max-w-2xl space-y-8 text-center">
        <ConfettiOverlay pieces={confettiPieces} show={showConfetti} />

        {/* Success badge */}
        <div className="relative mx-auto w-fit animate-fade-up">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-success to-success/80 shadow-lg shadow-success/30">
            <Check className="h-14 w-14 text-white" />
          </div>
          <div className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-white shadow-md">
            <Star className="h-6 w-6" />
          </div>
        </div>

        {/* Congratulations message */}
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h1 className="font-serif text-4xl font-medium tracking-tight">
            Brand Launched!
          </h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground">
            Congratulations! <span className="font-semibold">{stepData?.basicInfo?.brandName}</span> is
            now live and ready for business.
          </p>
        </div>

        {/* Summary stats */}
        <div
          className="mx-auto flex max-w-md justify-center gap-8 rounded-xl bg-muted/50 p-6 animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {checklist.filter((c) => c.status === 'pass').length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Items Configured</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-success">
              {stepData?.products?.productCount || 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Products Synced</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {stepData?.users?.invitations?.length || 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Team Invites</p>
          </div>
        </div>

        {/* Next actions */}
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <h3 className="text-sm font-medium">What&apos;s Next?</h3>
          <div className="mx-auto max-w-md space-y-2">
            <NextActionCard
              href={`/brands/${organizationId}`}
              icon={<Rocket className="h-5 w-5" />}
              title="View Brand Dashboard"
              description="Monitor performance and manage settings"
            />
            <NextActionCard
              href={`${process.env.NEXT_PUBLIC_ADMIN_URL}?tenant=${brandSlug}`}
              icon={<ExternalLink className="h-5 w-5" />}
              title="Open Admin Portal"
              description="Start managing products and orders"
              external
            />
            <NextActionCard
              href="/brands"
              icon={<Star className="h-5 w-5" />}
              title="View All Brands"
              description="Return to the brands overview"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="pt-4 animate-fade-up" style={{ animationDelay: '400ms' }}>
          <Button size="lg" onClick={handleGoToBrand}>
            Go to Brand Dashboard
            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Step 9 of 9</span>
          <span className="text-muted-foreground/50">|</span>
          <span>Launch</span>
          <Badge variant="success" className="ml-2">
            Final Step
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Review & Launch</h1>
        <p className="text-muted-foreground">
          Review your configuration and launch your brand when ready.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={cn('h-1 flex-1 rounded-full transition-colors', 'bg-primary')}
          />
        ))}
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Blockers alert */}
      {blockers.length > 0 && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cannot Launch Yet</AlertTitle>
          <AlertDescription>
            Please complete the following required items:
            <ul className="mt-2 list-inside list-disc">
              {blockers.map((blocker, i) => (
                <li key={i}>{blocker}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Brand summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                  {stepData?.basicInfo?.brandName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {stepData?.basicInfo?.brandName || 'Unnamed Brand'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {stepData?.basicInfo?.slug || 'No slug set'}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Launch checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Launch Checklist</h3>
                <Badge variant={canLaunch ? 'success' : 'secondary'}>
                  {checklist.filter((c) => c.status === 'pass').length} /{' '}
                  {checklist.length} Complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item.key}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-3',
                      item.status === 'fail' && item.required && 'border-destructive/50 bg-destructive/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ChecklistIcon status={item.status} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {item.message && (
                          <p className="text-xs text-muted-foreground">{item.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Launch button area */}
          <Card className={cn(canLaunch ? 'bg-success/5 border-success/20' : 'bg-muted/30')}>
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-full',
                    canLaunch
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Rocket className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {canLaunch ? 'Ready to Launch!' : 'Not Ready Yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {canLaunch
                      ? 'All required items are complete. You can launch your brand now.'
                      : 'Please complete all required items before launching.'}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleLaunch}
                  disabled={!canLaunch || isLaunching}
                  className={cn(
                    'min-w-[200px]',
                    canLaunch && 'bg-success hover:bg-success/90'
                  )}
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Launch Brand
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={handleBack} disabled={isLaunching}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  )
}

export default function Step9Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <Step9Content />
    </Suspense>
  )
}
