/**
 * Onboarding Wizard Validation
 *
 * Step validation logic for the creator onboarding wizard.
 */

import type {
  OnboardingWizardData,
  WizardStepId,
  ProfileData,
  SocialData,
  PaymentData,
  TaxData,
  AgreementData,
  WelcomeCallData,
} from './types'

/** Validation error structure */
export interface ValidationErrors {
  [field: string]: string
}

/** URL validation regex */
const URL_REGEX = /^https?:\/\/.+\..+/

/** US postal code regex */
const US_POSTAL_REGEX = /^\d{5}(-\d{4})?$/

/** SSN/EIN last 4 digits regex */
const TAX_ID_REGEX = /^\d{4}$/

/**
 * Validate profile step
 */
export function validateProfile(data: ProfileData): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.displayName?.trim()) {
    errors.displayName = 'Display name is required'
  } else if (data.displayName.length < 2) {
    errors.displayName = 'Display name must be at least 2 characters'
  } else if (data.displayName.length > 50) {
    errors.displayName = 'Display name must be less than 50 characters'
  }

  if (!data.bio?.trim()) {
    errors.bio = 'Bio is required'
  } else if (data.bio.length < 20) {
    errors.bio = 'Bio must be at least 20 characters'
  } else if (data.bio.length > 500) {
    errors.bio = 'Bio must be less than 500 characters'
  }

  if (data.website && !URL_REGEX.test(data.website)) {
    errors.website = 'Please enter a valid URL'
  }

  return errors
}

/**
 * Validate social accounts step
 */
export function validateSocial(data: SocialData): ValidationErrors {
  const errors: ValidationErrors = {}

  if (data.connections.length === 0) {
    errors.connections = 'Please connect at least one social account'
  }

  if (!data.primaryPlatform && data.connections.length > 0) {
    errors.primaryPlatform = 'Please select your primary platform'
  }

  return errors
}

/**
 * Validate payment step
 */
export function validatePayment(data: PaymentData): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.method) {
    errors.method = 'Please select a payment method'
  }

  if (data.method === 'stripe_connect') {
    if (!data.stripeConnectId || data.stripeConnectStatus !== 'connected') {
      errors.stripeConnect = 'Please complete Stripe Connect setup'
    }
  }

  if (data.method === 'bank_transfer') {
    if (!data.bankDetails) {
      errors.bankDetails = 'Please enter your bank details'
    } else {
      if (!data.bankDetails.accountHolderName?.trim()) {
        errors.accountHolderName = 'Account holder name is required'
      }
      if (!data.bankDetails.routingNumber?.trim()) {
        errors.routingNumber = 'Routing number is required'
      }
      if (!data.bankDetails.accountNumberLast4?.trim()) {
        errors.accountNumber = 'Account number is required'
      }
    }
  }

  if (data.method === 'paypal') {
    if (!data.paypalEmail?.trim()) {
      errors.paypalEmail = 'PayPal email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paypalEmail)) {
      errors.paypalEmail = 'Please enter a valid email address'
    }
  }

  return errors
}

/**
 * Validate tax information step
 */
export function validateTax(data: TaxData): ValidationErrors {
  const errors: ValidationErrors = {}

  if (data.isUsPerson === null) {
    errors.isUsPerson = 'Please indicate if you are a US person for tax purposes'
  }

  if (!data.formType) {
    errors.formType = 'Please select a tax form type'
  }

  if (!data.legalName?.trim()) {
    errors.legalName = 'Legal name is required'
  }

  if (data.isUsPerson && data.formType === 'w9') {
    if (!data.taxClassification) {
      errors.taxClassification = 'Tax classification is required'
    }

    if (!data.taxIdLast4 || !TAX_ID_REGEX.test(data.taxIdLast4)) {
      errors.taxId = 'Please enter the last 4 digits of your SSN or EIN'
    }
  }

  // Address validation
  if (!data.address.street1?.trim()) {
    errors.street1 = 'Street address is required'
  }
  if (!data.address.city?.trim()) {
    errors.city = 'City is required'
  }
  if (!data.address.state?.trim()) {
    errors.state = 'State is required'
  }
  if (!data.address.postalCode?.trim()) {
    errors.postalCode = 'Postal code is required'
  } else if (data.address.country === 'US' && !US_POSTAL_REGEX.test(data.address.postalCode)) {
    errors.postalCode = 'Please enter a valid US postal code'
  }

  // Signature required
  if (!data.signatureData) {
    errors.signature = 'Please sign to certify your tax information'
  }

  return errors
}

/**
 * Validate agreement step
 */
export function validateAgreement(data: AgreementData): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.allRequiredSigned) {
    errors.agreements = 'Please sign all required agreements'
  }

  return errors
}

/**
 * Validate welcome call step (optional, so always valid)
 */
export function validateWelcomeCall(_data: WelcomeCallData): ValidationErrors {
  // Optional step - always valid
  return {}
}

/**
 * Validate a specific step
 */
export function validateStep(
  stepId: WizardStepId,
  data: OnboardingWizardData
): ValidationErrors {
  switch (stepId) {
    case 'profile':
      return validateProfile(data.profile)
    case 'social':
      return validateSocial(data.social)
    case 'payment':
      return validatePayment(data.payment)
    case 'tax':
      return validateTax(data.tax)
    case 'agreement':
      return validateAgreement(data.agreement)
    case 'welcome-call':
      return validateWelcomeCall(data.welcomeCall)
    case 'complete':
      return {}
    default:
      return {}
  }
}

/**
 * Check if a step is valid
 */
export function isStepValid(
  stepId: WizardStepId,
  data: OnboardingWizardData
): boolean {
  const errors = validateStep(stepId, data)
  return Object.keys(errors).length === 0
}

/**
 * Check if all required steps are complete
 */
export function areAllRequiredStepsComplete(data: OnboardingWizardData): boolean {
  const requiredSteps: WizardStepId[] = ['profile', 'social', 'payment', 'tax', 'agreement']
  return requiredSteps.every((stepId) => data.completedSteps.includes(stepId))
}
