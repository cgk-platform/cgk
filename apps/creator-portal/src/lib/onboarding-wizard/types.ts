/**
 * Creator Onboarding Wizard Types
 *
 * Type definitions for the multi-step onboarding wizard.
 */

/** All wizard steps */
export type WizardStepId =
  | 'profile'
  | 'social'
  | 'payment'
  | 'tax'
  | 'agreement'
  | 'welcome-call'
  | 'complete'

/** Step status */
export type StepStatus = 'pending' | 'current' | 'completed' | 'skipped'

/** Step metadata */
export interface WizardStep {
  id: WizardStepId
  title: string
  description: string
  icon: string
  isOptional: boolean
  estimatedMinutes: number
}

/** Profile step data */
export interface ProfileData {
  displayName: string
  bio: string
  photoUrl: string | null
  photoFile: File | null
  pronouns: string
  location: string
  website: string
}

/** Social platform connection */
export interface SocialConnection {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin'
  handle: string
  url: string
  verified: boolean
  followerCount: number | null
}

/** Social accounts step data */
export interface SocialData {
  connections: SocialConnection[]
  primaryPlatform: string | null
}

/** Payment method type */
export type PaymentMethodType = 'stripe_connect' | 'bank_transfer' | 'paypal'

/** Payment setup step data */
export interface PaymentData {
  method: PaymentMethodType | null
  stripeConnectId: string | null
  stripeConnectStatus: 'pending' | 'connected' | 'restricted' | null
  bankDetails: {
    accountHolderName: string
    routingNumber: string
    accountNumberLast4: string
    bankName: string
  } | null
  paypalEmail: string | null
}

/** Tax form type */
export type TaxFormType = 'w9' | 'w8ben' | 'w8bene' | 'none'

/** Tax information step data */
export interface TaxData {
  formType: TaxFormType | null
  isUsPerson: boolean | null
  taxIdLast4: string | null
  legalName: string
  businessName: string | null
  taxClassification: string | null
  address: {
    street1: string
    street2: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  certificationDate: string | null
  signatureData: string | null
}

/** Agreement document */
export interface AgreementDocument {
  id: string
  title: string
  version: string
  url: string
  required: boolean
}

/** Agreement signing step data */
export interface AgreementData {
  agreements: Array<{
    documentId: string
    signed: boolean
    signedAt: string | null
    signatureData: string | null
  }>
  allRequiredSigned: boolean
}

/** Welcome call scheduling data */
export interface WelcomeCallData {
  scheduled: boolean
  skipped: boolean
  bookingId: string | null
  scheduledTime: string | null
  timezone: string
}

/** Complete wizard data */
export interface OnboardingWizardData {
  creatorId: string
  tenantId: string
  currentStep: WizardStepId
  completedSteps: WizardStepId[]
  skippedSteps: WizardStepId[]
  profile: ProfileData
  social: SocialData
  payment: PaymentData
  tax: TaxData
  agreement: AgreementData
  welcomeCall: WelcomeCallData
  startedAt: string
  lastUpdatedAt: string
  completedAt: string | null
}

/** All wizard steps in order */
export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Tell us about yourself',
    icon: 'user',
    isOptional: false,
    estimatedMinutes: 3,
  },
  {
    id: 'social',
    title: 'Social Accounts',
    description: 'Connect your platforms',
    icon: 'share',
    isOptional: false,
    estimatedMinutes: 2,
  },
  {
    id: 'payment',
    title: 'Payment Setup',
    description: 'How you get paid',
    icon: 'wallet',
    isOptional: false,
    estimatedMinutes: 5,
  },
  {
    id: 'tax',
    title: 'Tax Information',
    description: 'Required for payouts',
    icon: 'file-text',
    isOptional: false,
    estimatedMinutes: 5,
  },
  {
    id: 'agreement',
    title: 'Agreements',
    description: 'Review and sign',
    icon: 'pen',
    isOptional: false,
    estimatedMinutes: 3,
  },
  {
    id: 'welcome-call',
    title: 'Welcome Call',
    description: 'Meet the team',
    icon: 'calendar',
    isOptional: true,
    estimatedMinutes: 2,
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Start creating',
    icon: 'check-circle',
    isOptional: false,
    estimatedMinutes: 1,
  },
]

/** Get initial empty wizard data */
export function getInitialWizardData(
  creatorId: string,
  tenantId: string
): OnboardingWizardData {
  return {
    creatorId,
    tenantId,
    currentStep: 'profile',
    completedSteps: [],
    skippedSteps: [],
    profile: {
      displayName: '',
      bio: '',
      photoUrl: null,
      photoFile: null,
      pronouns: '',
      location: '',
      website: '',
    },
    social: {
      connections: [],
      primaryPlatform: null,
    },
    payment: {
      method: null,
      stripeConnectId: null,
      stripeConnectStatus: null,
      bankDetails: null,
      paypalEmail: null,
    },
    tax: {
      formType: null,
      isUsPerson: null,
      taxIdLast4: null,
      legalName: '',
      businessName: null,
      taxClassification: null,
      address: {
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
      certificationDate: null,
      signatureData: null,
    },
    agreement: {
      agreements: [],
      allRequiredSigned: false,
    },
    welcomeCall: {
      scheduled: false,
      skipped: false,
      bookingId: null,
      scheduledTime: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    completedAt: null,
  }
}

/** Get step index from ID */
export function getStepIndex(stepId: WizardStepId): number {
  return WIZARD_STEPS.findIndex((s) => s.id === stepId)
}

/** Get step by ID */
export function getStep(stepId: WizardStepId): WizardStep | undefined {
  return WIZARD_STEPS.find((s) => s.id === stepId)
}

/** Get next step ID */
export function getNextStepId(currentStepId: WizardStepId): WizardStepId | null {
  const currentIndex = getStepIndex(currentStepId)
  if (currentIndex === -1 || currentIndex >= WIZARD_STEPS.length - 1) {
    return null
  }
  const nextStep = WIZARD_STEPS[currentIndex + 1]
  return nextStep ? nextStep.id : null
}

/** Get previous step ID */
export function getPreviousStepId(currentStepId: WizardStepId): WizardStepId | null {
  const currentIndex = getStepIndex(currentStepId)
  if (currentIndex <= 0) {
    return null
  }
  const prevStep = WIZARD_STEPS[currentIndex - 1]
  return prevStep ? prevStep.id : null
}

/** Calculate completion percentage */
export function calculateProgress(data: OnboardingWizardData): number {
  const totalSteps = WIZARD_STEPS.filter((s) => !s.isOptional).length
  const completedRequired = data.completedSteps.filter((id) => {
    const step = getStep(id)
    return step && !step.isOptional
  }).length
  return Math.round((completedRequired / totalSteps) * 100)
}
