/**
 * Payout Module
 *
 * Unified payout orchestration for creator payments.
 * Automatically selects Stripe (US) or Wise (international) based on country.
 */

import { createStripeConnectProvider } from './stripe-connect'
import { createWiseBusinessProvider } from './wise-business'
import type {
  PayoutProvider,
  PayoutRequest,
  PayoutResult,
  PayoutProviderName,
} from './types'
import { isWiseSupportedCountry } from './types'

// Re-export types
export type {
  PayoutProvider,
  PayoutProviderName,
  PayoutRequest,
  PayoutResult,
  CreateAccountParams,
  CreateAccountResult,
  AccountStatus,
  PayoutStatusResult,
  WiseSupportedCountry,
} from './types'

export {
  WISE_SUPPORTED_COUNTRIES,
  STRIPE_STANDARD_REQUIRED_COUNTRIES,
  isWiseSupportedCountry,
  requiresStripeStandardAccount,
} from './types'

// Re-export providers
export { createStripeConnectProvider } from './stripe-connect'
export type { StripeConnectConfig } from './stripe-connect'
export {
  createStripeAccountLink,
  completeStripeOAuth,
  createStripeDashboardLink,
} from './stripe-connect'

export { createWiseBusinessProvider } from './wise-business'
export type { WiseBusinessConfig } from './wise-business'
export {
  createWiseRecipient,
  getWiseAccountRequirements,
} from './wise-business'

/**
 * Provider selection criteria
 */
export interface ProviderSelectionCriteria {
  /** ISO country code */
  country: string
  /** Currency */
  currency?: string
  /** Preferred provider (optional override) */
  preferredProvider?: PayoutProviderName
}

/**
 * Select the appropriate payout provider for a given country
 *
 * Logic:
 * - US -> Stripe Connect (faster, simpler for domestic)
 * - International (Wise supported) -> Wise (better FX rates)
 * - International (not Wise supported) -> Stripe Custom
 *
 * @param criteria Selection criteria
 * @returns Provider name to use
 */
export function selectProvider(criteria: ProviderSelectionCriteria): PayoutProviderName {
  const { country, preferredProvider } = criteria

  // Honor explicit preference if valid for the country
  if (preferredProvider) {
    if (preferredProvider === 'wise' && isWiseSupportedCountry(country)) {
      return 'wise'
    }
    if (preferredProvider === 'stripe') {
      return 'stripe'
    }
  }

  // US creators always use Stripe
  if (country === 'US') {
    return 'stripe'
  }

  // International creators use Wise if supported
  if (isWiseSupportedCountry(country)) {
    return 'wise'
  }

  // Fallback to Stripe for unsupported countries
  return 'stripe'
}

/**
 * Payout orchestrator configuration
 */
export interface PayoutOrchestratorConfig {
  /** Stripe configuration */
  stripe: {
    secretKey: string
    platformFeePercent?: number
  }
  /** Wise configuration */
  wise: {
    apiToken: string
    profileId: string
    sandbox?: boolean
  }
}

/**
 * Payout orchestrator
 *
 * Manages multiple payout providers and routes requests appropriately.
 */
export interface PayoutOrchestrator {
  /** Get a specific provider */
  getProvider(name: PayoutProviderName): PayoutProvider

  /** Select and get the best provider for a country */
  selectProvider(country: string): PayoutProvider

  /** Execute a payout with automatic provider selection */
  executePayout(request: PayoutRequest): Promise<PayoutResult>

  /** Get payout status from the appropriate provider */
  getPayoutStatus(
    transferId: string,
    provider: PayoutProviderName
  ): ReturnType<PayoutProvider['getPayoutStatus']>

  /** Cancel a payout */
  cancelPayout(
    transferId: string,
    provider: PayoutProviderName
  ): ReturnType<PayoutProvider['cancelPayout']>
}

/**
 * Create a payout orchestrator
 */
export function createPayoutOrchestrator(config: PayoutOrchestratorConfig): PayoutOrchestrator {
  const stripeProvider = createStripeConnectProvider({
    secretKey: config.stripe.secretKey,
    platformFeePercent: config.stripe.platformFeePercent,
  })

  const wiseProvider = createWiseBusinessProvider({
    apiToken: config.wise.apiToken,
    profileId: config.wise.profileId,
    sandbox: config.wise.sandbox,
  })

  const providers: Record<PayoutProviderName, PayoutProvider> = {
    stripe: stripeProvider,
    wise: wiseProvider,
  }

  return {
    getProvider(name: PayoutProviderName): PayoutProvider {
      return providers[name]
    },

    selectProvider(country: string): PayoutProvider {
      const providerName = selectProvider({ country })
      return providers[providerName]
    },

    async executePayout(request: PayoutRequest): Promise<PayoutResult> {
      // Select provider based on country
      const providerName = selectProvider({ country: request.country })
      const provider = providers[providerName]

      // Execute payout
      const result = await provider.createPayout(request)

      return result
    },

    async getPayoutStatus(transferId: string, providerName: PayoutProviderName) {
      return providers[providerName].getPayoutStatus(transferId)
    },

    async cancelPayout(transferId: string, providerName: PayoutProviderName) {
      return providers[providerName].cancelPayout(transferId)
    },
  }
}

/**
 * Default orchestrator instance (lazily initialized)
 */
let defaultOrchestrator: PayoutOrchestrator | null = null

/**
 * Get or create the default payout orchestrator
 * Configuration is read from environment variables
 */
export function getPayoutOrchestrator(): PayoutOrchestrator {
  if (defaultOrchestrator) {
    return defaultOrchestrator
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const wiseApiToken = process.env.WISE_API_KEY
  const wiseProfileId = process.env.WISE_PROFILE_ID

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for payout orchestrator')
  }

  if (!wiseApiToken || !wiseProfileId) {
    console.warn('Wise credentials not configured. International payouts will fall back to Stripe.')
  }

  defaultOrchestrator = createPayoutOrchestrator({
    stripe: {
      secretKey: stripeSecretKey,
      platformFeePercent: 0,
    },
    wise: {
      apiToken: wiseApiToken || '',
      profileId: wiseProfileId || '',
      sandbox: process.env.NODE_ENV !== 'production',
    },
  })

  return defaultOrchestrator
}

/**
 * Reset the default orchestrator (for testing)
 */
export function resetPayoutOrchestrator(): void {
  defaultOrchestrator = null
}

/**
 * Convenience function to execute a payout
 */
export async function executePayout(request: PayoutRequest): Promise<PayoutResult> {
  return getPayoutOrchestrator().executePayout(request)
}
