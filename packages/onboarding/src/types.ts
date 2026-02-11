/**
 * Onboarding Types
 *
 * Type definitions for the brand onboarding wizard.
 */

/**
 * Onboarding session status
 */
export type OnboardingSessionStatus = 'in_progress' | 'completed' | 'abandoned'

/**
 * Individual step status
 */
export type OnboardingStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

/**
 * Step numbers (1-9)
 */
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/**
 * Step names mapped to numbers
 */
export const STEP_NAMES: Record<StepNumber, string> = {
  1: 'basic_info',
  2: 'shopify',
  3: 'domains',
  4: 'payments',
  5: 'integrations',
  6: 'features',
  7: 'products',
  8: 'users',
  9: 'launch',
} as const

/**
 * Step configuration
 */
export interface StepConfig {
  number: StepNumber
  name: string
  label: string
  description: string
  required: boolean
  canSkip: boolean
}

/**
 * All wizard steps configuration
 */
export const WIZARD_STEPS: StepConfig[] = [
  {
    number: 1,
    name: 'basic_info',
    label: 'Basic Info',
    description: 'Brand name, slug, colors, and logo',
    required: true,
    canSkip: false,
  },
  {
    number: 2,
    name: 'shopify',
    label: 'Shopify',
    description: 'Connect your Shopify store',
    required: true,
    canSkip: false,
  },
  {
    number: 3,
    name: 'domains',
    label: 'Domains',
    description: 'Custom domain configuration',
    required: false,
    canSkip: true,
  },
  {
    number: 4,
    name: 'payments',
    label: 'Payments',
    description: 'Stripe Connect and Wise setup',
    required: false,
    canSkip: true,
  },
  {
    number: 5,
    name: 'integrations',
    label: 'Integrations',
    description: 'Third-party services',
    required: false,
    canSkip: true,
  },
  {
    number: 6,
    name: 'features',
    label: 'Features',
    description: 'Enable platform features',
    required: true,
    canSkip: false,
  },
  {
    number: 7,
    name: 'products',
    label: 'Products',
    description: 'Import products from Shopify',
    required: false,
    canSkip: true,
  },
  {
    number: 8,
    name: 'users',
    label: 'Users',
    description: 'Invite team members',
    required: false,
    canSkip: true,
  },
  {
    number: 9,
    name: 'launch',
    label: 'Launch',
    description: 'Review and go live',
    required: true,
    canSkip: false,
  },
]

/**
 * Feature modules available for brands
 */
export interface FeatureModule {
  key: string
  name: string
  description: string
  icon: string
  requires?: string[]
}

/**
 * Available feature modules
 */
export const FEATURE_MODULES: FeatureModule[] = [
  {
    key: 'creator_portal',
    name: 'Creator Portal',
    description: 'UGC creator management, applications, and payouts',
    icon: 'Users',
    requires: ['stripe'],
  },
  {
    key: 'reviews',
    name: 'Reviews System',
    description: 'Product reviews with email automation',
    icon: 'Star',
  },
  {
    key: 'attribution',
    name: 'Marketing Attribution',
    description: 'Touchpoint tracking and conversion attribution',
    icon: 'Target',
  },
  {
    key: 'ab_testing',
    name: 'A/B Testing',
    description: 'Experiments on pricing, shipping, checkout',
    icon: 'FlaskConical',
  },
  {
    key: 'subscriptions',
    name: 'Subscriptions',
    description: 'Recurring billing products',
    icon: 'RefreshCw',
    requires: ['shopify'],
  },
  {
    key: 'mcp',
    name: 'MCP Integration',
    description: 'AI assistant access via Model Context Protocol',
    icon: 'Bot',
  },
]

/**
 * Onboarding session
 */
export interface OnboardingSession {
  id: string
  organizationId: string | null
  createdBy: string | null
  status: OnboardingSessionStatus
  currentStep: StepNumber
  stepData: StepData
  startedAt: Date
  completedAt: Date | null
  lastActivityAt: Date
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Step progress record
 */
export interface OnboardingStepProgress {
  id: string
  sessionId: string
  stepNumber: StepNumber
  stepName: string
  status: OnboardingStepStatus
  data: Record<string, unknown>
  errors: Record<string, string> | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Step 1: Basic Info data
 */
export interface BasicInfoData {
  brandName: string
  slug: string
  customDomain?: string
  primaryColor: string
  logoUrl?: string
}

/**
 * Step 2: Shopify connection data
 */
export interface ShopifyConnectionData {
  shopDomain: string
  connected: boolean
  accessToken?: string
  shopName?: string
  webhooksRegistered: boolean
  checkoutConfigured: boolean
}

/**
 * Step 3: Domain configuration data
 */
export interface DomainData {
  customDomain?: string
  verified: boolean
  dnsRecords?: DnsRecord[]
  useSubdomain: boolean
}

/**
 * DNS record for domain verification
 */
export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT'
  name: string
  value: string
  priority?: number
}

/**
 * Step 4: Payment providers data
 */
export interface PaymentData {
  stripeConnected: boolean
  stripeAccountId?: string
  wiseConfigured: boolean
  wiseApiKey?: string
}

/**
 * Step 5: Integrations data
 */
export interface IntegrationsData {
  metaAds?: { configured: boolean; pixelId?: string }
  googleAds?: { configured: boolean; conversionId?: string }
  tiktokAds?: { configured: boolean; pixelId?: string }
  ga4?: { configured: boolean; measurementId?: string }
  klaviyo?: { configured: boolean; apiKey?: string }
  yotpo?: { configured: boolean; appKey?: string }
  slack?: { configured: boolean; webhookUrl?: string }
}

/**
 * Step 6: Feature modules data
 */
export interface FeaturesData {
  enabledFeatures: string[]
}

/**
 * Step 7: Product import data
 */
export interface ProductImportData {
  imported: boolean
  productCount: number
  importJobId?: string
  lastSyncAt?: Date
}

/**
 * Step 8: User invitations data
 */
export interface UsersData {
  invitations: UserInvitation[]
}

/**
 * User invitation
 */
export interface UserInvitation {
  id?: string
  email: string
  role: 'admin' | 'member'
  status: 'pending' | 'sent' | 'accepted' | 'expired'
  invitedAt?: Date
}

/**
 * Step 9: Launch checklist data
 */
export interface LaunchData {
  checklist: LaunchChecklistItem[]
  launched: boolean
  launchedAt?: Date
}

/**
 * Launch checklist item
 */
export interface LaunchChecklistItem {
  key: string
  label: string
  required: boolean
  status: 'pass' | 'fail' | 'warning' | 'pending'
  message?: string
}

/**
 * Combined step data for session
 */
export interface StepData {
  basicInfo?: BasicInfoData
  shopify?: ShopifyConnectionData
  domains?: DomainData
  payments?: PaymentData
  integrations?: IntegrationsData
  features?: FeaturesData
  products?: ProductImportData
  users?: UsersData
  launch?: LaunchData
}

/**
 * Create session input
 */
export interface CreateSessionInput {
  createdBy: string
}

/**
 * Update step input
 */
export interface UpdateStepInput {
  sessionId: string
  stepNumber: StepNumber
  data: Record<string, unknown>
  status?: OnboardingStepStatus
}

/**
 * Session with step progress
 */
export interface SessionWithProgress extends OnboardingSession {
  steps: OnboardingStepProgress[]
}

/**
 * Organization summary for onboarding display
 */
export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  status: string
  shopifyDomain?: string
  customDomain?: string
  enabledFeatures: string[]
  productCount: number
  userCount: number
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

/**
 * Launch verification result
 */
export interface LaunchVerificationResult {
  canLaunch: boolean
  checklist: LaunchChecklistItem[]
  blockers: string[]
}
