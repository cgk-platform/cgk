/**
 * Creator Onboarding Types
 *
 * Type definitions for the creator application form,
 * draft storage, and onboarding configuration.
 */

/** Application form data - all steps combined */
export interface CreatorApplicationForm {
  // Step 1: Basic Info
  firstName: string
  lastName: string
  email: string
  phone: string

  // Step 2: Social Media
  instagram: string
  tiktok: string
  youtube: string
  portfolioUrl: string

  // Step 3: Shipping Address
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string

  // Step 4: Content Interests
  interestedInReviews: boolean
  interestedInPromotion: boolean
  tiktokShopCreator: boolean
  willingToPostTiktokShop: boolean
  openToCollabPosts: boolean
  surveyResponses: Record<string, string | string[]>
}

/** Survey question types for dynamic questions */
export type SurveyQuestionType = 'text' | 'textarea' | 'select' | 'multiselect'

/** Survey question definition from tenant config */
export interface SurveyQuestion {
  id: string
  question: string
  type: SurveyQuestionType
  options?: string[]
  placeholder?: string
  required?: boolean
}

/** Application draft stored in database */
export interface ApplicationDraft {
  id: string
  tenantId: string
  email: string
  draftData: Partial<CreatorApplicationForm>
  step: number
  createdAt: Date
  updatedAt: Date
}

/** Application submission record */
export interface CreatorApplication {
  id: string
  tenantId: string
  email: string
  status: ApplicationStatus
  formData: CreatorApplicationForm
  step: number
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  referrer: string | null
  metaEventId: string | null
  submittedAt: Date | null
  reviewedAt: Date | null
  reviewedBy: string | null
  createdAt: Date
  updatedAt: Date
}

/** Application status enum */
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'invited'

/** Onboarding settings from tenant config */
export interface OnboardingSettings {
  welcomeCall: {
    enabled: boolean
    mode: 'internal' | 'external' | 'disabled'
    isConfigured: boolean
    externalUrl?: string
    externalUrlBehavior?: 'redirect' | 'embed'
  }
  surveyQuestions: SurveyQuestion[]
}

/** Welcome call time slot */
export interface WelcomeCallSlot {
  start: string
  end: string
  hostId: string
  hostName: string
  eventTypeId: string
}

/** Step metadata for form wizard */
export interface StepMeta {
  id: number
  title: string
  description: string
  icon: string
}

/** Form step definitions */
export const FORM_STEPS: StepMeta[] = [
  {
    id: 1,
    title: 'Basic Info',
    description: 'Tell us about yourself',
    icon: 'user',
  },
  {
    id: 2,
    title: 'Social Media',
    description: 'Your online presence',
    icon: 'share',
  },
  {
    id: 3,
    title: 'Shipping',
    description: 'Where to send products',
    icon: 'package',
  },
  {
    id: 4,
    title: 'Interests',
    description: 'Content preferences',
    icon: 'heart',
  },
]

/** US state options for address */
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
] as const

/** Initial empty form data */
export function getInitialFormData(): CreatorApplicationForm {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    portfolioUrl: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    interestedInReviews: false,
    interestedInPromotion: false,
    tiktokShopCreator: false,
    willingToPostTiktokShop: false,
    openToCollabPosts: false,
    surveyResponses: {},
  }
}
