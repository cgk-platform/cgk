/**
 * Onboarding Validation
 *
 * Validates step data and generates launch checklists.
 */

import type {
  BasicInfoData,
  DomainData,
  FeaturesData,
  IntegrationsData,
  LaunchChecklistItem,
  LaunchVerificationResult,
  PaymentData,
  ProductImportData,
  ShopifyConnectionData,
  StepData,
  UsersData,
  ValidationResult,
} from './types.js'
import { isValidSlug } from './organization.js'

/**
 * Validate Step 1: Basic Info
 */
export function validateBasicInfo(data: BasicInfoData | undefined): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data) {
    return { valid: false, errors: { _form: 'Basic info is required' } }
  }

  if (!data.brandName || data.brandName.trim().length < 2) {
    errors.brandName = 'Brand name must be at least 2 characters'
  }

  if (!data.slug) {
    errors.slug = 'Slug is required'
  } else if (!isValidSlug(data.slug)) {
    errors.slug = 'Slug must be lowercase alphanumeric with underscores only (3-50 chars)'
  }

  if (data.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(data.primaryColor)) {
    errors.primaryColor = 'Invalid color format (must be #RRGGBB)'
  }

  if (data.customDomain) {
    const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/
    if (!domainPattern.test(data.customDomain)) {
      errors.customDomain = 'Invalid domain format'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate Step 2: Shopify Connection
 */
export function validateShopifyConnection(
  data: ShopifyConnectionData | undefined
): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data) {
    return { valid: false, errors: { _form: 'Shopify connection is required' } }
  }

  if (!data.shopDomain) {
    errors.shopDomain = 'Shopify store domain is required'
  } else {
    const shopifyDomainPattern = /^[a-zA-Z0-9-]+\.myshopify\.com$/
    if (!shopifyDomainPattern.test(data.shopDomain)) {
      errors.shopDomain = 'Must be a valid Shopify domain (yourstore.myshopify.com)'
    }
  }

  if (!data.connected) {
    errors.connected = 'Store must be connected to continue'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate Step 3: Domains (optional step)
 */
export function validateDomains(data: DomainData | undefined): ValidationResult {
  const errors: Record<string, string> = {}

  // Domains step is optional
  if (!data || data.useSubdomain) {
    return { valid: true, errors: {} }
  }

  if (data.customDomain) {
    const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/
    if (!domainPattern.test(data.customDomain)) {
      errors.customDomain = 'Invalid domain format'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate Step 4: Payments (optional step)
 */
export function validatePayments(data: PaymentData | undefined): ValidationResult {
  // Payments step is optional
  if (!data) {
    return { valid: true, errors: {} }
  }

  // No additional validation needed - fields are optional
  return { valid: true, errors: {} }
}

/**
 * Validate Step 5: Integrations (optional step)
 */
export function validateIntegrations(data: IntegrationsData | undefined): ValidationResult {
  // Integrations step is optional
  return { valid: true, errors: {} }
}

/**
 * Validate Step 6: Features
 */
export function validateFeatures(data: FeaturesData | undefined): ValidationResult {
  // Features selection is required but can be empty (no features enabled)
  if (!data) {
    return { valid: false, errors: { _form: 'Feature selection is required' } }
  }

  // enabledFeatures is an array, which is valid even if empty
  return { valid: true, errors: {} }
}

/**
 * Validate Step 7: Products (optional step)
 */
export function validateProducts(data: ProductImportData | undefined): ValidationResult {
  // Products step is optional
  return { valid: true, errors: {} }
}

/**
 * Validate Step 8: Users (optional step)
 */
export function validateUsers(data: UsersData | undefined): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data || !data.invitations) {
    return { valid: true, errors: {} }
  }

  // Validate each invitation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  data.invitations.forEach((inv, index) => {
    if (!emailPattern.test(inv.email)) {
      errors[`invitations.${index}.email`] = 'Invalid email address'
    }
  })

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Generate launch checklist based on step data
 */
export function generateLaunchChecklist(stepData: StepData): LaunchChecklistItem[] {
  const items: LaunchChecklistItem[] = []

  // Basic Info - Required
  items.push({
    key: 'basic_info',
    label: 'Basic information configured',
    required: true,
    status: stepData.basicInfo?.brandName ? 'pass' : 'fail',
  })

  // Shopify - Required
  items.push({
    key: 'shopify_connected',
    label: 'Shopify store connected',
    required: true,
    status: stepData.shopify?.connected ? 'pass' : 'fail',
  })

  // Checkout redirects - Required if Shopify connected
  items.push({
    key: 'checkout_configured',
    label: 'Checkout redirects configured',
    required: true,
    status: stepData.shopify?.checkoutConfigured ? 'pass' : 'fail',
  })

  // Webhooks - Required if Shopify connected
  items.push({
    key: 'webhooks_registered',
    label: 'Webhooks verified',
    required: true,
    status: stepData.shopify?.webhooksRegistered ? 'pass' : 'fail',
  })

  // Custom Domain - Optional
  items.push({
    key: 'custom_domain',
    label: 'Custom domain configured',
    required: false,
    status: stepData.domains?.customDomain
      ? stepData.domains.verified
        ? 'pass'
        : 'warning'
      : 'pending',
    message: stepData.domains?.customDomain && !stepData.domains.verified
      ? 'DNS verification pending'
      : undefined,
  })

  // Stripe - Optional but recommended
  items.push({
    key: 'stripe_connected',
    label: 'Stripe connected',
    required: false,
    status: stepData.payments?.stripeConnected ? 'pass' : 'warning',
    message: !stepData.payments?.stripeConnected
      ? 'Recommended for creator payouts'
      : undefined,
  })

  // Features - Required
  items.push({
    key: 'features_configured',
    label: 'Features configured',
    required: true,
    status: stepData.features ? 'pass' : 'fail',
  })

  // Products - Optional
  items.push({
    key: 'products_imported',
    label: 'Products imported to local DB',
    required: false,
    status: stepData.products?.imported ? 'pass' : 'pending',
    message: !stepData.products?.imported
      ? 'Products will sync on first storefront load'
      : undefined,
  })

  // Test order - Optional
  items.push({
    key: 'test_order',
    label: 'Test order placed',
    required: false,
    status: 'pending',
    message: 'Optional but recommended',
  })

  return items
}

/**
 * Verify if organization can be launched
 */
export function verifyLaunchReadiness(stepData: StepData): LaunchVerificationResult {
  const checklist = generateLaunchChecklist(stepData)

  const blockers: string[] = []

  for (const item of checklist) {
    if (item.required && item.status === 'fail') {
      blockers.push(item.label)
    }
  }

  return {
    canLaunch: blockers.length === 0,
    checklist,
    blockers,
  }
}

/**
 * Validate all step data
 */
export function validateAllSteps(stepData: StepData): Record<number, ValidationResult> {
  return {
    1: validateBasicInfo(stepData.basicInfo),
    2: validateShopifyConnection(stepData.shopify),
    3: validateDomains(stepData.domains),
    4: validatePayments(stepData.payments),
    5: validateIntegrations(stepData.integrations),
    6: validateFeatures(stepData.features),
    7: validateProducts(stepData.products),
    8: validateUsers(stepData.users),
  }
}
