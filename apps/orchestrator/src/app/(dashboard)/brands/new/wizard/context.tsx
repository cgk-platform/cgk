'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Wizard step definitions
 */
export interface WizardStep {
  id: string
  label: string
  description: string
  optional?: boolean
}

/**
 * All 9 wizard steps for brand onboarding
 */
export const WIZARD_STEPS: WizardStep[] = [
  { id: 'basic-info', label: 'Basic Info', description: 'Brand name, slug, and description' },
  { id: 'shopify', label: 'Shopify', description: 'Connect Shopify store' },
  { id: 'domain', label: 'Domain', description: 'Configure custom domain' },
  { id: 'branding', label: 'Branding', description: 'Logo, colors, and theme', optional: true },
  { id: 'payments', label: 'Payments', description: 'Stripe and payment settings' },
  { id: 'email', label: 'Email', description: 'Email provider configuration', optional: true },
  { id: 'team', label: 'Team', description: 'Invite initial team members', optional: true },
  { id: 'features', label: 'Features', description: 'Enable platform features' },
  { id: 'review', label: 'Review', description: 'Review and launch' },
]

/**
 * Brand data collected during wizard
 */
export interface BrandWizardData {
  // Step 1: Basic Info
  name: string
  slug: string
  description: string

  // Step 2: Shopify
  shopifyConnected: boolean
  shopifyStoreDomain?: string
  shopifyAccessToken?: string

  // Step 3: Domain
  primaryDomain: string
  customDomain?: string
  domainVerified: boolean

  // Step 4: Branding (optional)
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string

  // Step 5: Payments
  stripeConnected: boolean
  stripeAccountId?: string

  // Step 6: Email (optional)
  emailProvider?: 'resend' | 'sendgrid' | 'none'
  emailApiKey?: string

  // Step 7: Team (optional)
  teamInvites: Array<{ email: string; role: string }>

  // Step 8: Features
  enabledFeatures: string[]
}

/**
 * Initial empty wizard data
 */
const initialWizardData: BrandWizardData = {
  name: '',
  slug: '',
  description: '',
  shopifyConnected: false,
  primaryDomain: '',
  domainVerified: false,
  stripeConnected: false,
  teamInvites: [],
  enabledFeatures: [],
}

/**
 * Wizard context value
 */
interface WizardContextValue {
  /** Current step number (1-indexed) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Current step definition */
  currentStepDef: WizardStep
  /** All step definitions */
  steps: WizardStep[]
  /** Collected wizard data */
  data: BrandWizardData
  /** Step completion status */
  stepStatus: Record<string, boolean>
  /** Update wizard data */
  updateData: (updates: Partial<BrandWizardData>) => void
  /** Mark current step as complete and go to next */
  completeStep: () => void
  /** Go to previous step */
  goBack: () => void
  /** Go to specific step */
  goToStep: (step: number) => void
  /** Check if we can proceed to next step */
  canProceed: boolean
  /** Whether current step is valid */
  isStepValid: boolean
  /** Mark step as complete without navigation */
  markStepComplete: (stepId: string) => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

/**
 * Wizard context provider
 */
export function WizardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current step from URL or default to 1
  const currentStep = parseInt(searchParams.get('step') || '1', 10)
  const totalSteps = WIZARD_STEPS.length

  // Load wizard data from localStorage
  const [data, setData] = useState<BrandWizardData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('brand-wizard-data')
      if (saved) {
        try {
          return { ...initialWizardData, ...JSON.parse(saved) }
        } catch {
          return initialWizardData
        }
      }
    }
    return initialWizardData
  })

  // Load step status from localStorage
  const [stepStatus, setStepStatus] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('brand-wizard-status')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return {}
        }
      }
    }
    return {}
  })

  // Persist data to localStorage
  useEffect(() => {
    localStorage.setItem('brand-wizard-data', JSON.stringify(data))
  }, [data])

  // Persist step status to localStorage
  useEffect(() => {
    localStorage.setItem('brand-wizard-status', JSON.stringify(stepStatus))
  }, [stepStatus])

  // Get current step definition (guaranteed to exist due to WIZARD_STEPS being a non-empty array)
  // We use a fallback to the first step and non-null assertion since we control the array
  const fallbackStep = WIZARD_STEPS[0]!
  const currentStepDef: WizardStep = WIZARD_STEPS[currentStep - 1] ?? fallbackStep

  // Update wizard data
  const updateData = useCallback((updates: Partial<BrandWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Mark a step as complete
  const markStepComplete = useCallback((stepId: string) => {
    setStepStatus((prev) => ({ ...prev, [stepId]: true }))
  }, [])

  // Check if current step is valid (basic validation)
  const isStepValid = useMemo(() => {
    switch (currentStepDef.id) {
      case 'basic-info':
        return data.name.trim().length >= 2 && data.slug.trim().length >= 2
      case 'shopify':
        return data.shopifyConnected || true // Can skip for now
      case 'domain':
        return data.primaryDomain.trim().length >= 3 || true // Can proceed without
      default:
        return true
    }
  }, [currentStepDef.id, data])

  // Can proceed to next step
  const canProceed = useMemo(() => {
    if (currentStepDef.optional) return true
    return isStepValid
  }, [currentStepDef.optional, isStepValid])

  // Go to specific step
  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        router.push(`/brands/new/wizard/step-${step}`)
      }
    },
    [router, totalSteps]
  )

  // Complete current step and proceed
  const completeStep = useCallback(() => {
    markStepComplete(currentStepDef.id)
    if (currentStep < totalSteps) {
      goToStep(currentStep + 1)
    } else {
      // Final step - go to review or completion
      router.push('/brands/new/wizard/complete')
    }
  }, [currentStep, currentStepDef.id, goToStep, markStepComplete, router, totalSteps])

  // Go back to previous step
  const goBack = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    } else {
      router.push('/brands/new')
    }
  }, [currentStep, goToStep, router])

  const value: WizardContextValue = {
    currentStep,
    totalSteps,
    currentStepDef,
    steps: WIZARD_STEPS,
    data,
    stepStatus,
    updateData,
    completeStep,
    goBack,
    goToStep,
    canProceed,
    isStepValid,
    markStepComplete,
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

/**
 * Hook to access wizard context
 */
export function useWizard() {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}
