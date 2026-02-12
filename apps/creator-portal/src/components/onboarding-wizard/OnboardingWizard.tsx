'use client'

import { cn } from '@cgk/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { AgreementStep } from './steps/AgreementStep'
import { CompleteStep } from './steps/CompleteStep'
import { PaymentStep } from './steps/PaymentStep'
import { ProfileStep } from './steps/ProfileStep'
import { SocialStep } from './steps/SocialStep'
import { TaxStep } from './steps/TaxStep'
import { WelcomeCallStep } from './steps/WelcomeCallStep'
import { AutoSaveStatus } from './AutoSaveStatus'
import { StepNavigation } from './StepNavigation'
import { WizardProgress } from './WizardProgress'
import {
  calculateProgress,
  getInitialWizardData,
  getNextStepId,
  getPreviousStepId,
  getStep,
  WIZARD_STEPS,
  type OnboardingWizardData,
  type WizardStepId,
} from '../../lib/onboarding-wizard/types'
import { validateStep } from '../../lib/onboarding-wizard/validation'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Creator Onboarding Wizard
 *
 * Multi-step wizard for new creators to complete their account setup.
 * Features an editorial design with progress persistence.
 */
export function OnboardingWizard(): React.JSX.Element {
  const router = useRouter()

  // State
  const [wizardData, setWizardData] = useState<OnboardingWizardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Load existing progress on mount
  useEffect(() => {
    async function loadProgress(): Promise<void> {
      try {
        const response = await fetch('/api/creator/onboarding-wizard')

        if (response.ok) {
          const data = await response.json()
          if (data.wizardData) {
            setWizardData(data.wizardData)
          } else {
            // Initialize new wizard data (creatorId and tenantId would come from auth context)
            setWizardData(getInitialWizardData('creator_temp', 'tenant_temp'))
          }
        } else if (response.status === 404) {
          // No existing progress, start fresh
          setWizardData(getInitialWizardData('creator_temp', 'tenant_temp'))
        }
      } catch (error) {
        console.error('Failed to load onboarding progress:', error)
        setWizardData(getInitialWizardData('creator_temp', 'tenant_temp'))
      } finally {
        setIsLoading(false)
      }
    }

    loadProgress()
  }, [])

  // Auto-save after changes
  useEffect(() => {
    if (!wizardData || isLoading) return

    const timer = setTimeout(async () => {
      setSaveStatus('saving')

      try {
        const response = await fetch('/api/creator/onboarding-wizard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wizardData }),
        })

        if (response.ok) {
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } else {
          setSaveStatus('error')
        }
      } catch (error) {
        console.error('Failed to save progress:', error)
        setSaveStatus('error')
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [wizardData, isLoading])

  // Update wizard data
  const updateData = useCallback((
    updates: Partial<OnboardingWizardData>
  ) => {
    setWizardData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        ...updates,
        lastUpdatedAt: new Date().toISOString(),
      }
    })
  }, [])

  // Handle step change
  const handleStepChange = useCallback((stepId: WizardStepId) => {
    if (!wizardData) return

    setIsTransitioning(true)
    setErrors({})

    setTimeout(() => {
      updateData({ currentStep: stepId })
      setIsTransitioning(false)
    }, 300)
  }, [wizardData, updateData])

  // Handle next step
  const handleNext = useCallback(() => {
    if (!wizardData) return

    const currentStepErrors = validateStep(wizardData.currentStep, wizardData)

    if (Object.keys(currentStepErrors).length > 0) {
      setErrors(currentStepErrors)
      return
    }

    const nextStepId = getNextStepId(wizardData.currentStep)

    if (nextStepId) {
      // Mark current step as completed
      const completedSteps = wizardData.completedSteps.includes(wizardData.currentStep)
        ? wizardData.completedSteps
        : [...wizardData.completedSteps, wizardData.currentStep]

      setIsTransitioning(true)
      setErrors({})

      setTimeout(() => {
        updateData({
          currentStep: nextStepId,
          completedSteps,
        })
        setIsTransitioning(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 300)
    }
  }, [wizardData, updateData])

  // Handle previous step
  const handleBack = useCallback(() => {
    if (!wizardData) return

    const prevStepId = getPreviousStepId(wizardData.currentStep)

    if (prevStepId) {
      handleStepChange(prevStepId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [wizardData, handleStepChange])

  // Handle skip (for optional steps)
  const handleSkip = useCallback(() => {
    if (!wizardData) return

    const currentStep = getStep(wizardData.currentStep)
    if (!currentStep?.isOptional) return

    const nextStepId = getNextStepId(wizardData.currentStep)

    if (nextStepId) {
      const skippedSteps = wizardData.skippedSteps.includes(wizardData.currentStep)
        ? wizardData.skippedSteps
        : [...wizardData.skippedSteps, wizardData.currentStep]

      setIsTransitioning(true)

      setTimeout(() => {
        updateData({
          currentStep: nextStepId,
          skippedSteps,
        })
        setIsTransitioning(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 300)
    }
  }, [wizardData, updateData])

  // Handle complete
  const handleComplete = useCallback(async () => {
    if (!wizardData) return

    try {
      const response = await fetch('/api/creator/onboarding-wizard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wizardData }),
      })

      if (response.ok) {
        updateData({ completedAt: new Date().toISOString() })
        router.push('/dashboard?onboarding=complete')
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      setErrors({ submit: 'Failed to complete onboarding. Please try again.' })
    }
  }, [wizardData, updateData, router])

  // Memoized values
  const currentStep = useMemo(() => {
    if (!wizardData) return null
    return getStep(wizardData.currentStep)
  }, [wizardData])

  const progress = useMemo(() => {
    if (!wizardData) return 0
    return calculateProgress(wizardData)
  }, [wizardData])

  const canGoBack = useMemo(() => {
    if (!wizardData) return false
    return getPreviousStepId(wizardData.currentStep) !== null
  }, [wizardData])


  // Loading state
  if (isLoading || !wizardData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 font-serif text-lg text-wizard-muted">
            Loading your progress...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-wizard-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-wizard-border bg-wizard-bg/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-medium text-wizard-text">
                Welcome to the Creator Program
              </h1>
              <p className="mt-1 text-sm text-wizard-muted">
                Complete your profile to start earning
              </p>
            </div>
            <AutoSaveStatus status={saveStatus} />
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-wizard-muted">
              <span>{progress}% complete</span>
              <span>
                {currentStep && `${currentStep.estimatedMinutes} min remaining`}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-wizard-border">
              <div
                className="h-full bg-wizard-accent transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:flex lg:gap-12">
        {/* Step navigation sidebar - desktop */}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          <div className="sticky top-32">
            <WizardProgress
              steps={WIZARD_STEPS}
              currentStep={wizardData.currentStep}
              completedSteps={wizardData.completedSteps}
              skippedSteps={wizardData.skippedSteps}
              onStepClick={handleStepChange}
            />
          </div>
        </aside>

        {/* Step content */}
        <main className="flex-1">
          {/* Mobile step indicator */}
          <div className="mb-6 lg:hidden">
            <StepNavigation
              steps={WIZARD_STEPS}
              currentStep={wizardData.currentStep}
              completedSteps={wizardData.completedSteps}
            />
          </div>

          {/* Step content card */}
          <div
            className={cn(
              'rounded-xl border border-wizard-border bg-white p-6 shadow-sm transition-all duration-300 sm:p-8',
              isTransitioning && 'opacity-0 translate-y-2'
            )}
          >
            {/* Step header */}
            {currentStep && (
              <div className="mb-8 border-b border-wizard-border pb-6">
                <div className="flex items-center gap-3">
                  <StepIcon icon={currentStep.icon} />
                  <div>
                    <h2 className="font-serif text-2xl font-medium text-wizard-text">
                      {currentStep.title}
                    </h2>
                    <p className="text-wizard-muted">{currentStep.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step content */}
            {wizardData.currentStep === 'profile' && (
              <ProfileStep
                data={wizardData.profile}
                errors={errors}
                onChange={(profile) => updateData({ profile })}
              />
            )}
            {wizardData.currentStep === 'social' && (
              <SocialStep
                data={wizardData.social}
                errors={errors}
                onChange={(social) => updateData({ social })}
              />
            )}
            {wizardData.currentStep === 'payment' && (
              <PaymentStep
                data={wizardData.payment}
                errors={errors}
                onChange={(payment) => updateData({ payment })}
              />
            )}
            {wizardData.currentStep === 'tax' && (
              <TaxStep
                data={wizardData.tax}
                errors={errors}
                onChange={(tax) => updateData({ tax })}
              />
            )}
            {wizardData.currentStep === 'agreement' && (
              <AgreementStep
                data={wizardData.agreement}
                errors={errors}
                onChange={(agreement) => updateData({ agreement })}
              />
            )}
            {wizardData.currentStep === 'welcome-call' && (
              <WelcomeCallStep
                data={wizardData.welcomeCall}
                errors={errors}
                onChange={(welcomeCall) => updateData({ welcomeCall })}
              />
            )}
            {wizardData.currentStep === 'complete' && (
              <CompleteStep
                data={wizardData}
                onComplete={handleComplete}
              />
            )}

            {/* Navigation buttons */}
            {wizardData.currentStep !== 'complete' && (
              <div className="mt-8 flex items-center justify-between border-t border-wizard-border pt-6">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={!canGoBack}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
                    canGoBack
                      ? 'text-wizard-muted hover:bg-wizard-hover hover:text-wizard-text'
                      : 'cursor-not-allowed text-wizard-border'
                  )}
                >
                  <ArrowLeftIcon />
                  Back
                </button>

                <div className="flex items-center gap-3">
                  {currentStep?.isOptional && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="rounded-lg px-5 py-2.5 text-sm font-medium text-wizard-muted transition-colors hover:bg-wizard-hover hover:text-wizard-text"
                    >
                      Skip for now
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-lg bg-wizard-accent px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-wizard-accent-hover hover:shadow-md active:scale-[0.98]"
                  >
                    Continue
                    <ArrowRightIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// Helper components

function LoadingSpinner(): React.JSX.Element {
  return (
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-wizard-border border-t-wizard-accent" />
  )
}

function StepIcon({ icon }: { icon: string }): React.JSX.Element {
  const iconMap: Record<string, React.JSX.Element> = {
    user: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    share: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    wallet: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    'file-text': (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    pen: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    calendar: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    'check-circle': (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-wizard-accent/10 text-wizard-accent">
      {iconMap[icon] || iconMap.user}
    </div>
  )
}

function ArrowLeftIcon(): React.JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ArrowRightIcon(): React.JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
