/**
 * Creator Application Form Validation
 *
 * Step-by-step validation logic for the application form.
 */

import type { CreatorApplicationForm, SurveyQuestion } from './types'

/** Validation error structure */
export interface ValidationErrors {
  [key: string]: string
}

/** Email regex pattern */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Phone regex pattern - US format */
const PHONE_REGEX = /^[\d\s\-().+]+$/

/** URL regex pattern */
const URL_REGEX = /^https?:\/\/.+/

/** Postal code regex - US format */
const POSTAL_REGEX = /^\d{5}(-\d{4})?$/

/**
 * Validate Step 1: Basic Info
 */
export function validateStep1(data: Partial<CreatorApplicationForm>): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required'
  }

  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required'
  }

  if (!data.email?.trim()) {
    errors.email = 'Email is required'
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!data.phone?.trim()) {
    errors.phone = 'Phone number is required'
  } else if (!PHONE_REGEX.test(data.phone)) {
    errors.phone = 'Please enter a valid phone number'
  }

  return errors
}

/**
 * Validate Step 2: Social Media (all optional)
 */
export function validateStep2(data: Partial<CreatorApplicationForm>): ValidationErrors {
  const errors: ValidationErrors = {}

  // Instagram handle validation (optional but if provided, validate format)
  if (data.instagram && data.instagram.includes('@')) {
    errors.instagram = 'Please enter your handle without the @ symbol'
  }

  // TikTok handle validation (optional but if provided, validate format)
  if (data.tiktok && data.tiktok.includes('@')) {
    errors.tiktok = 'Please enter your handle without the @ symbol'
  }

  // YouTube URL validation (optional but if provided, validate format)
  if (data.youtube && !URL_REGEX.test(data.youtube)) {
    errors.youtube = 'Please enter a valid YouTube channel URL'
  }

  // Portfolio URL validation (optional but if provided, validate format)
  if (data.portfolioUrl && !URL_REGEX.test(data.portfolioUrl)) {
    errors.portfolioUrl = 'Please enter a valid URL starting with http:// or https://'
  }

  return errors
}

/**
 * Validate Step 3: Shipping Address
 */
export function validateStep3(data: Partial<CreatorApplicationForm>): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.addressLine1?.trim()) {
    errors.addressLine1 = 'Street address is required'
  }

  if (!data.city?.trim()) {
    errors.city = 'City is required'
  }

  if (!data.state?.trim()) {
    errors.state = 'State is required'
  }

  if (!data.postalCode?.trim()) {
    errors.postalCode = 'Postal code is required'
  } else if (data.country === 'US' && !POSTAL_REGEX.test(data.postalCode)) {
    errors.postalCode = 'Please enter a valid US postal code'
  }

  return errors
}

/**
 * Validate Step 4: Content Interests
 * Requires TikTok handle if TikTok Shop creator is checked
 */
export function validateStep4(
  data: Partial<CreatorApplicationForm>,
  surveyQuestions: SurveyQuestion[]
): ValidationErrors {
  const errors: ValidationErrors = {}

  // Conditional validation: TikTok Shop requires TikTok handle
  if (data.tiktokShopCreator && !data.tiktok?.trim()) {
    errors.tiktok = 'TikTok handle is required for TikTok Shop creators'
  }

  // Validate required survey questions
  for (const question of surveyQuestions) {
    if (question.required) {
      const response = data.surveyResponses?.[question.id]
      if (!response || (Array.isArray(response) && response.length === 0)) {
        errors[`survey_${question.id}`] = `${question.question} is required`
      }
    }
  }

  return errors
}

/**
 * Validate a specific step
 */
export function validateStep(
  step: number,
  data: Partial<CreatorApplicationForm>,
  surveyQuestions: SurveyQuestion[] = []
): ValidationErrors {
  switch (step) {
    case 1:
      return validateStep1(data)
    case 2:
      return validateStep2(data)
    case 3:
      return validateStep3(data)
    case 4:
      return validateStep4(data, surveyQuestions)
    default:
      return {}
  }
}

/**
 * Check if a step has any errors
 */
export function isStepValid(
  step: number,
  data: Partial<CreatorApplicationForm>,
  surveyQuestions: SurveyQuestion[] = []
): boolean {
  const errors = validateStep(step, data, surveyQuestions)
  return Object.keys(errors).length === 0
}

/**
 * Validate entire form
 */
export function validateForm(
  data: Partial<CreatorApplicationForm>,
  surveyQuestions: SurveyQuestion[] = []
): ValidationErrors {
  return {
    ...validateStep1(data),
    ...validateStep2(data),
    ...validateStep3(data),
    ...validateStep4(data, surveyQuestions),
  }
}

/**
 * Check if entire form is valid
 */
export function isFormValid(
  data: Partial<CreatorApplicationForm>,
  surveyQuestions: SurveyQuestion[] = []
): boolean {
  const errors = validateForm(data, surveyQuestions)
  return Object.keys(errors).length === 0
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

/**
 * Sanitize social handle (remove @ if present)
 */
export function sanitizeSocialHandle(handle: string): string {
  return handle.replace(/^@/, '').trim()
}
