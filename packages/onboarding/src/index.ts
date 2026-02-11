/**
 * @cgk/onboarding - Brand Onboarding Wizard
 *
 * Provides services for the 9-step brand onboarding wizard:
 * 1. Basic Info - Brand name, slug, colors, logo
 * 2. Shopify - Connect Shopify store
 * 3. Domains - Custom domain configuration
 * 4. Payments - Stripe Connect, Wise setup
 * 5. Integrations - Third-party services
 * 6. Features - Enable platform features
 * 7. Products - Import products from Shopify
 * 8. Users - Invite team members
 * 9. Launch - Review and go live
 */

// Types
export type {
  BasicInfoData,
  CreateSessionInput,
  DnsRecord,
  DomainData,
  FeatureModule,
  FeaturesData,
  IntegrationsData,
  LaunchChecklistItem,
  LaunchData,
  LaunchVerificationResult,
  OnboardingSession,
  OnboardingSessionStatus,
  OnboardingStepProgress,
  OnboardingStepStatus,
  OrganizationSummary,
  PaymentData,
  ProductImportData,
  SessionWithProgress,
  ShopifyConnectionData,
  StepConfig,
  StepData,
  StepNumber,
  UpdateStepInput,
  UserInvitation,
  UsersData,
  ValidationResult,
} from './types.js'

export { FEATURE_MODULES, STEP_NAMES, WIZARD_STEPS } from './types.js'

// Session management
export {
  abandonSession,
  cleanupExpiredSessions,
  completeSession,
  completeStep,
  createSession,
  getActiveSessionForUser,
  getInProgressSessions,
  getSession,
  getSessionByOrganization,
  getSessionWithProgress,
  skipStep,
  updateSession,
  updateStepProgress,
} from './session.js'

// Organization management
export {
  addUserToOrganization,
  createOrganization,
  generateSlug,
  getOrganization,
  getOrganizationBySlug,
  isSlugAvailable,
  isValidSlug,
  launchOrganization,
  updateOrganization,
} from './organization.js'

// User invitations
export {
  acceptInvitation,
  cleanupExpiredInvitations,
  createInvitation,
  getInvitationByToken,
  getOrganizationInvitations,
  markInvitationSent,
  resendInvitation,
  revokeInvitation,
  toUserInvitations,
} from './invitations.js'

// Validation
export {
  generateLaunchChecklist,
  validateAllSteps,
  validateBasicInfo,
  validateDomains,
  validateFeatures,
  validateIntegrations,
  validatePayments,
  validateProducts,
  validateShopifyConnection,
  validateUsers,
  verifyLaunchReadiness,
} from './validation.js'
