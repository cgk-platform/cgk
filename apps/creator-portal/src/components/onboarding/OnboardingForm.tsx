'use client'

import { Button, Card, CardContent } from '@cgk/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { AutoSaveIndicator, type SaveStatus } from './AutoSaveIndicator'
import {
  Step1BasicInfo,
  Step2SocialMedia,
  Step3ShippingAddress,
  Step4ContentInterests,
} from './FormSteps'
import { ResumeBanner } from './ResumeBanner'
import { StepProgress } from './StepProgress'
import {
  FORM_STEPS,
  getInitialFormData,
  type CreatorApplicationForm,
  type OnboardingSettings,
} from '../../lib/onboarding/types'
import {
  validateStep,
  type ValidationErrors,
} from '../../lib/onboarding/validation'

interface OnboardingFormProps {
  tenantSlug: string  // Used for future tenant-specific features
}

/**
 * Main Creator Application Form
 *
 * 4-step wizard with auto-save, resume capability, and validation.
 */
export function OnboardingForm({
  tenantSlug: _tenantSlug,
}: OnboardingFormProps): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Form state
  const [formData, setFormData] = useState<CreatorApplicationForm>(getInitialFormData())
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [errors, setErrors] = useState<ValidationErrors>({})

  // Loading and save states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // Settings and resume state
  const [settings, setSettings] = useState<OnboardingSettings | null>(null)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [draftEmail, setDraftEmail] = useState<string | null>(null)
  const [draftStep, setDraftStep] = useState<number>(1)

  // Load settings on mount
  useEffect(() => {
    async function loadSettings(): Promise<void> {
      try {
        const response = await fetch('/api/creator/onboarding-settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(data.settings)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Check for resume parameter or existing draft
  useEffect(() => {
    async function checkForDraft(): Promise<void> {
      const resumeId = searchParams.get('resume')
      const resumeEmail = searchParams.get('email')

      if (resumeId || resumeEmail) {
        try {
          const params = resumeId ? `id=${resumeId}` : `email=${encodeURIComponent(resumeEmail || '')}`
          const response = await fetch(`/api/creator/onboarding/resume?${params}`)

          if (response.ok) {
            const data = await response.json()

            if (data.type === 'draft') {
              setDraftEmail(data.email)
              setDraftStep(data.step)
              setShowResumeBanner(true)
              // Store draft data for resume
              sessionStorage.setItem('onboarding_draft', JSON.stringify(data))
            } else if (data.type === 'submitted') {
              // Redirect to success or status page
              router.push('/creator/join/success?status=' + data.status)
              return
            }
          }
        } catch (error) {
          console.error('Failed to check for draft:', error)
        }
      }

      setIsLoading(false)
    }
    checkForDraft()
  }, [searchParams, router])

  // Auto-save draft after 1.5s of inactivity
  useEffect(() => {
    if (!formData.email || isLoading) return

    const timer = setTimeout(async () => {
      setSaveStatus('saving')

      try {
        const response = await fetch('/api/creator/onboarding/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            draftData: formData,
            step: currentStep,
            utmSource: searchParams.get('utm_source') || undefined,
            utmMedium: searchParams.get('utm_medium') || undefined,
            utmCampaign: searchParams.get('utm_campaign') || undefined,
            referrer: document.referrer || undefined,
          }),
        })

        if (response.ok) {
          setSaveStatus('saved')
          // Hide saved indicator after 2 seconds
          setTimeout(() => setSaveStatus('idle'), 2000)
        } else {
          setSaveStatus('error')
        }
      } catch (error) {
        console.error('Failed to save draft:', error)
        setSaveStatus('error')
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [formData, currentStep, isLoading, searchParams])

  // Handle resume
  const handleResume = useCallback(() => {
    const draftData = sessionStorage.getItem('onboarding_draft')
    if (draftData) {
      const draft = JSON.parse(draftData)
      setFormData({ ...getInitialFormData(), ...draft.formData })
      setCurrentStep(draft.step)
      // Mark previous steps as completed
      const completed = Array.from({ length: draft.step - 1 }, (_, i) => i + 1)
      setCompletedSteps(completed)
    }
    setShowResumeBanner(false)
  }, [])

  // Handle start fresh
  const handleStartFresh = useCallback(() => {
    sessionStorage.removeItem('onboarding_draft')
    setShowResumeBanner(false)
    setFormData(getInitialFormData())
    setCurrentStep(1)
    setCompletedSteps([])
  }, [])

  // Handle field change
  const handleChange = useCallback(
    (field: keyof CreatorApplicationForm, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      // Clear error for this field
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    },
    []
  )

  // Handle survey response change
  const handleSurveyChange = useCallback(
    (questionId: string, value: string | string[]) => {
      setFormData((prev) => ({
        ...prev,
        surveyResponses: {
          ...prev.surveyResponses,
          [questionId]: value,
        },
      }))
      // Clear error for this question
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`survey_${questionId}`]
        return next
      })
    },
    []
  )

  // Handle next step
  const handleNext = useCallback(() => {
    const stepErrors = validateStep(currentStep, formData, settings?.surveyQuestions || [])

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }

    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep]
    )
    setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length))
    setErrors({})

    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep, formData, settings?.surveyQuestions])

  // Handle previous step
  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setErrors({})
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const stepErrors = validateStep(currentStep, formData, settings?.surveyQuestions || [])

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/creator/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
          utmSource: searchParams.get('utm_source') || undefined,
          utmMedium: searchParams.get('utm_medium') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
          referrer: document.referrer || undefined,
          metaEventId: crypto.randomUUID(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Clear draft from session storage
        sessionStorage.removeItem('onboarding_draft')
        // Redirect to success page
        router.push(`/creator/join/success?id=${data.applicationId}`)
      } else {
        const data = await response.json()
        if (data.details) {
          setErrors(data.details)
        } else {
          setErrors({ submit: data.error || 'Failed to submit application' })
        }
      }
    } catch (error) {
      console.error('Failed to submit application:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [currentStep, formData, settings?.surveyQuestions, searchParams, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading application...</p>
        </div>
      </div>
    )
  }

  const isLastStep = currentStep === FORM_STEPS.length

  return (
    <div className="space-y-6">
      {/* Resume Banner */}
      {showResumeBanner && draftEmail && (
        <ResumeBanner
          email={draftEmail}
          step={draftStep}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
      )}

      {/* Progress Indicator */}
      <StepProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Auto-save Indicator */}
      <div className="flex justify-end">
        <AutoSaveIndicator status={saveStatus} />
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Step Content */}
          {currentStep === 1 && (
            <Step1BasicInfo
              formData={formData}
              errors={errors}
              onChange={handleChange}
            />
          )}
          {currentStep === 2 && (
            <Step2SocialMedia
              formData={formData}
              errors={errors}
              onChange={handleChange}
            />
          )}
          {currentStep === 3 && (
            <Step3ShippingAddress
              formData={formData}
              errors={errors}
              onChange={handleChange}
            />
          )}
          {currentStep === 4 && (
            <Step4ContentInterests
              formData={formData}
              errors={errors}
              onChange={handleChange}
              surveyQuestions={settings?.surveyQuestions || []}
              onSurveyChange={handleSurveyChange}
            />
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.submit}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Back
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
