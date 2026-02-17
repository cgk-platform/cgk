/**
 * Step 9 Utilities
 *
 * Helper functions for the launch step.
 */

import type { LaunchChecklistItem, StepData } from '@cgk-platform/onboarding'

/**
 * Generate checklist from step data
 */
export function generateChecklist(stepData: StepData): LaunchChecklistItem[] {
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

  // Checkout redirects
  items.push({
    key: 'checkout_configured',
    label: 'Checkout redirects configured',
    required: true,
    status: stepData.shopify?.checkoutConfigured ? 'pass' : 'fail',
  })

  // Webhooks
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
    message:
      stepData.domains?.customDomain && !stepData.domains.verified
        ? 'DNS verification pending'
        : undefined,
  })

  // Stripe - Optional
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
    label: 'Products imported',
    required: false,
    status: stepData.products?.imported ? 'pass' : 'pending',
    message: !stepData.products?.imported
      ? 'Products will sync on first storefront load'
      : undefined,
  })

  // Team - Optional
  items.push({
    key: 'team_invited',
    label: 'Team members invited',
    required: false,
    status:
      stepData.users?.invitations && stepData.users.invitations.length > 0
        ? 'pass'
        : 'pending',
    message:
      !stepData.users?.invitations || stepData.users.invitations.length === 0
        ? 'You can invite team members later'
        : undefined,
  })

  return items
}

/**
 * Confetti piece interface
 */
export interface ConfettiPiece {
  id: number
  x: number
  delay: number
  duration: number
  color: string
  rotation: number
}

/**
 * Generate confetti pieces for the success animation
 */
export function generateConfettiPieces(count: number = 100): ConfettiPiece[] {
  const colors = ['#0d9488', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2.5 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)] || '#0d9488',
    rotation: Math.random() * 360,
  }))
}
