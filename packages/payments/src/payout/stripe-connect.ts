/**
 * Stripe Connect Provider
 *
 * Implements PayoutProvider for US creators using Stripe Connect Express accounts.
 * Handles account creation, onboarding, and payouts.
 */

import Stripe from 'stripe'

import type {
  PayoutProvider,
  CreateAccountParams,
  CreateAccountResult,
  AccountStatus,
  PayoutRequest,
  PayoutResult,
  PayoutStatusResult,
} from './types'
import { requiresStripeStandardAccount } from './types'

export interface StripeConnectConfig {
  /** Stripe secret key */
  secretKey: string
  /** Stripe API version */
  apiVersion?: Stripe.LatestApiVersion
  /** Platform fee percentage (0-100) */
  platformFeePercent?: number
}

/**
 * Create a Stripe Connect payout provider
 */
export function createStripeConnectProvider(config: StripeConnectConfig): PayoutProvider {
  const stripe = new Stripe(config.secretKey, {
    apiVersion: config.apiVersion ?? '2025-02-24.acacia',
  })

  const platformFeePercent = config.platformFeePercent ?? 0

  return {
    name: 'stripe',

    async createAccount(params: CreateAccountParams): Promise<CreateAccountResult> {
      try {
        const useStandardAccount = params.accountType === 'standard' ||
          requiresStripeStandardAccount(params.country)

        // Create account based on type
        const account = await stripe.accounts.create({
          type: useStandardAccount ? 'standard' : 'express',
          country: params.country,
          email: params.email,
          capabilities: useStandardAccount ? undefined : {
            transfers: { requested: true },
          },
          business_type: params.businessType || 'individual',
          metadata: {
            creator_id: params.creatorId,
          },
        })

        // For Express accounts, create an account link for onboarding
        if (!useStandardAccount) {
          const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: params.refreshUrl || `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings/payout-methods/stripe-setup?refresh=true`,
            return_url: params.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings/payout-methods?setup=complete`,
            type: 'account_onboarding',
          })

          return {
            success: true,
            accountId: account.id,
            onboardingUrl: accountLink.url,
            requiresOnboarding: true,
          }
        }

        // For Standard accounts, return OAuth URL
        const state = Buffer.from(JSON.stringify({
          creatorId: params.creatorId,
          accountId: account.id,
        })).toString('base64url')

        const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CLIENT_ID}&scope=read_write&state=${state}`

        return {
          success: true,
          accountId: account.id,
          onboardingUrl: oauthUrl,
          requiresOnboarding: true,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error creating Stripe account'
        return {
          success: false,
          requiresOnboarding: false,
          error: message,
        }
      }
    },

    async getAccountStatus(accountId: string): Promise<AccountStatus> {
      const account = await stripe.accounts.retrieve(accountId)

      return {
        accountId: account.id,
        isActive: account.payouts_enabled === true,
        chargesEnabled: account.charges_enabled === true,
        payoutsEnabled: account.payouts_enabled === true,
        onboardingComplete: account.details_submitted === true,
        country: account.country ?? undefined,
        defaultCurrency: account.default_currency ?? undefined,
        pendingRequirements: account.requirements?.currently_due ?? [],
        detailsSubmitted: account.details_submitted ?? undefined,
      }
    },

    async createPayout(request: PayoutRequest): Promise<PayoutResult> {
      try {
        // Get the payment method to find the Stripe account ID
        // This would be fetched from the database in practice
        // For now, we expect paymentMethodId to be the Stripe account ID
        const destinationAccountId = request.paymentMethodId

        if (!destinationAccountId) {
          return {
            success: false,
            provider: 'stripe',
            error: 'No Stripe account ID provided',
            errorCode: 'missing_account',
          }
        }

        // Calculate platform fee if configured
        const platformFeeCents = platformFeePercent > 0
          ? Math.round(request.amountCents * (platformFeePercent / 100))
          : 0

        // Create a transfer to the connected account
        const transfer = await stripe.transfers.create({
          amount: request.amountCents - platformFeeCents,
          currency: request.currency.toLowerCase(),
          destination: destinationAccountId,
          description: `Payout for creator ${request.creatorId}`,
          metadata: {
            creator_id: request.creatorId,
            reference_id: request.referenceId,
            ...request.metadata,
          },
          transfer_group: request.referenceId,
        })

        // Estimate arrival (Stripe transfers are usually instant to connected accounts)
        const estimatedArrival = new Date()
        estimatedArrival.setDate(estimatedArrival.getDate() + 2) // 2 business days typical

        return {
          success: true,
          provider: 'stripe',
          transferId: transfer.id,
          estimatedArrival,
          amountSent: transfer.amount,
          currency: transfer.currency.toUpperCase(),
          feeCents: platformFeeCents,
        }
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError
        return {
          success: false,
          provider: 'stripe',
          error: stripeError.message || 'Unknown error creating Stripe transfer',
          errorCode: stripeError.code || 'unknown',
        }
      }
    },

    async getPayoutStatus(transferId: string): Promise<PayoutStatusResult> {
      const transfer = await stripe.transfers.retrieve(transferId)

      // Map Stripe transfer status
      let status: PayoutStatusResult['status'] = 'processing'
      if (transfer.reversed) {
        status = 'cancelled'
      } else if (transfer.amount > 0) {
        // Stripe transfers are typically completed immediately
        status = 'completed'
      }

      return {
        transferId: transfer.id,
        status,
        amountCents: transfer.amount,
        currency: transfer.currency.toUpperCase(),
        arrivalDate: new Date(transfer.created * 1000),
        rawData: transfer,
      }
    },

    async cancelPayout(transferId: string): Promise<boolean> {
      try {
        // Create a reversal for the transfer
        await stripe.transfers.createReversal(transferId)
        return true
      } catch {
        return false
      }
    },
  }
}

/**
 * Create an account link for additional onboarding
 */
export async function createStripeAccountLink(
  secretKey: string,
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
  type: 'account_onboarding' | 'account_update' = 'account_update'
): Promise<string> {
  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  })

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type,
  })

  return accountLink.url
}

/**
 * Complete OAuth flow for Standard accounts
 */
export async function completeStripeOAuth(
  secretKey: string,
  authorizationCode: string
): Promise<{ accountId: string; stripeUserId: string }> {
  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  })

  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code: authorizationCode,
  })

  if (!response.stripe_user_id) {
    throw new Error('No Stripe user ID in OAuth response')
  }

  return {
    accountId: response.stripe_user_id,
    stripeUserId: response.stripe_user_id,
  }
}

/**
 * Create a login link for connected account dashboard
 */
export async function createStripeDashboardLink(
  secretKey: string,
  accountId: string
): Promise<string> {
  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  })

  const loginLink = await stripe.accounts.createLoginLink(accountId)
  return loginLink.url
}
