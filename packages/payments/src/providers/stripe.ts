/**
 * Stripe Payment Provider
 *
 * Implements PaymentProvider interface for Stripe using tenant-owned credentials.
 * Handles payment intents, creator payouts via Stripe Connect, and webhooks.
 */

import type Stripe from 'stripe'

import type {
  PaymentProvider,
  CreatePaymentIntentParams,
} from '../provider.js'
import type {
  PaymentIntent,
  PaymentResult,
  RefundResult,
  PaymentStatus,
} from '../types.js'

/**
 * Configuration for Stripe Provider
 */
export interface StripeProviderConfig {
  /** Tenant ID for credential lookup */
  tenantId: string
  /** Platform fee percentage for Connect payouts (0-100) */
  platformFeePercent?: number
}

/**
 * Payout batch item for creator payouts
 */
export interface PayoutBatchItem {
  /** Creator's Stripe Connect account ID */
  connectAccountId: string
  /** Amount in cents */
  amountCents: number
  /** Currency code (e.g., 'usd') */
  currency: string
  /** Creator ID for reference */
  creatorId: string
  /** Unique reference for idempotency */
  referenceId: string
  /** Optional metadata */
  metadata?: Record<string, string>
}

/**
 * Result of a payout batch operation
 */
export interface PayoutBatchResult {
  /** Whether the batch was successful */
  success: boolean
  /** Individual payout results */
  results: PayoutItemResult[]
  /** Total amount transferred */
  totalAmountCents: number
  /** Total fees collected */
  totalFeeCents: number
  /** Number of successful payouts */
  successCount: number
  /** Number of failed payouts */
  failedCount: number
}

/**
 * Result of an individual payout
 */
export interface PayoutItemResult {
  /** Creator ID */
  creatorId: string
  /** Reference ID */
  referenceId: string
  /** Whether this payout succeeded */
  success: boolean
  /** Stripe transfer ID if successful */
  transferId?: string
  /** Amount sent in cents */
  amountCents?: number
  /** Fee collected in cents */
  feeCents?: number
  /** Error message if failed */
  error?: string
  /** Error code if failed */
  errorCode?: string
}

/**
 * Payout status result
 */
export interface PayoutStatusResult {
  /** Transfer ID */
  transferId: string
  /** Status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed'
  /** Amount in cents */
  amountCents: number
  /** Currency */
  currency: string
  /** Created timestamp */
  createdAt: Date
  /** Reversal status */
  reversed: boolean
  /** Destination account ID */
  destinationAccountId: string
  /** Raw Stripe transfer object */
  rawData: Stripe.Transfer
}

/**
 * Connect account creation params
 */
export interface CreateConnectAccountParams {
  /** Creator ID */
  creatorId: string
  /** Creator email */
  email: string
  /** Country code (ISO) */
  country: string
  /** Account type */
  accountType?: 'express' | 'standard'
  /** Business type */
  businessType?: 'individual' | 'company'
  /** Return URL after onboarding */
  returnUrl?: string
  /** Refresh URL for expired links */
  refreshUrl?: string
}

/**
 * Connect account creation result
 */
export interface CreateConnectAccountResult {
  /** Whether creation was successful */
  success: boolean
  /** Stripe account ID */
  accountId?: string
  /** Onboarding URL */
  onboardingUrl?: string
  /** Whether onboarding is required */
  requiresOnboarding: boolean
  /** Error message if failed */
  error?: string
}

/**
 * Webhook processing result
 */
export interface WebhookResult {
  /** Whether processing was successful */
  success: boolean
  /** Event type that was processed */
  eventType: string
  /** Event ID */
  eventId: string
  /** Any relevant data from processing */
  data?: Record<string, unknown>
  /** Error message if failed */
  error?: string
}

/**
 * Stripe payment provider implementing PaymentProvider interface
 * with additional methods for creator payouts via Connect.
 */
export class StripeProvider implements PaymentProvider {
  readonly provider = 'stripe' as const
  private readonly tenantId: string
  private readonly platformFeePercent: number
  private stripeClient: Stripe | null = null

  constructor(config: StripeProviderConfig) {
    this.tenantId = config.tenantId
    this.platformFeePercent = config.platformFeePercent ?? 0
  }

  /**
   * Lazy-load the Stripe client using tenant credentials
   */
  private async getClient(): Promise<Stripe> {
    if (this.stripeClient) {
      return this.stripeClient
    }

    // Dynamic import to avoid circular dependencies
    const { requireTenantStripeClient } = await import('@cgk-platform/integrations')
    this.stripeClient = await requireTenantStripeClient(this.tenantId)
    return this.stripeClient
  }

  // ============================================================
  // PaymentProvider Interface Implementation
  // ============================================================

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentResult> {
    try {
      const stripe = await this.getClient()

      const intent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        customer: params.customerId,
        description: params.description,
        metadata: params.metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      })

      return {
        success: true,
        paymentIntent: this.mapPaymentIntent(intent),
        clientSecret: intent.client_secret ?? undefined,
        requiresAction: intent.status === 'requires_action',
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async confirmPaymentIntent(intentId: string): Promise<PaymentResult> {
    try {
      const stripe = await this.getClient()
      const intent = await stripe.paymentIntents.confirm(intentId)

      return {
        success: intent.status === 'succeeded',
        paymentIntent: this.mapPaymentIntent(intent),
        requiresAction: intent.status === 'requires_action',
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async cancelPaymentIntent(intentId: string): Promise<PaymentResult> {
    try {
      const stripe = await this.getClient()
      const intent = await stripe.paymentIntents.cancel(intentId)

      return {
        success: true,
        paymentIntent: this.mapPaymentIntent(intent),
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async refundPayment(intentId: string, amount?: number): Promise<RefundResult> {
    try {
      const stripe = await this.getClient()

      const refund = await stripe.refunds.create({
        payment_intent: intentId,
        amount,
      })

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount,
      }
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError
      return {
        success: false,
        error: {
          code: stripeError.code || 'unknown',
          message: stripeError.message || 'Unknown error creating refund',
        },
      }
    }
  }

  async getPaymentIntent(intentId: string): Promise<PaymentIntent | null> {
    try {
      const stripe = await this.getClient()
      const intent = await stripe.paymentIntents.retrieve(intentId)
      return this.mapPaymentIntent(intent)
    } catch {
      return null
    }
  }

  // ============================================================
  // Creator Payout Methods (Stripe Connect)
  // ============================================================

  /**
   * Create a batch of payouts to creator Connect accounts
   */
  async createPayoutBatch(items: PayoutBatchItem[]): Promise<PayoutBatchResult> {
    const stripe = await this.getClient()
    const results: PayoutItemResult[] = []
    let totalAmountCents = 0
    let totalFeeCents = 0
    let successCount = 0
    let failedCount = 0

    for (const item of items) {
      try {
        // Calculate platform fee
        const feeCents = this.platformFeePercent > 0
          ? Math.round(item.amountCents * (this.platformFeePercent / 100))
          : 0
        const transferAmount = item.amountCents - feeCents

        // Create transfer to connected account
        const transfer = await stripe.transfers.create({
          amount: transferAmount,
          currency: item.currency.toLowerCase(),
          destination: item.connectAccountId,
          description: `Payout for creator ${item.creatorId}`,
          transfer_group: item.referenceId,
          metadata: {
            creator_id: item.creatorId,
            reference_id: item.referenceId,
            tenant_id: this.tenantId,
            ...item.metadata,
          },
        }, {
          idempotencyKey: `payout-${item.referenceId}`,
        })

        results.push({
          creatorId: item.creatorId,
          referenceId: item.referenceId,
          success: true,
          transferId: transfer.id,
          amountCents: transfer.amount,
          feeCents,
        })

        totalAmountCents += transfer.amount
        totalFeeCents += feeCents
        successCount++
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError
        results.push({
          creatorId: item.creatorId,
          referenceId: item.referenceId,
          success: false,
          error: stripeError.message || 'Unknown error creating transfer',
          errorCode: stripeError.code || 'unknown',
        })
        failedCount++
      }
    }

    return {
      success: failedCount === 0,
      results,
      totalAmountCents,
      totalFeeCents,
      successCount,
      failedCount,
    }
  }

  /**
   * Get the status of a payout/transfer
   */
  async getPayoutStatus(transferId: string): Promise<PayoutStatusResult> {
    const stripe = await this.getClient()
    const transfer = await stripe.transfers.retrieve(transferId)

    // Determine status based on transfer state
    let status: PayoutStatusResult['status'] = 'completed'
    if (transfer.reversed) {
      status = 'reversed'
    }

    return {
      transferId: transfer.id,
      status,
      amountCents: transfer.amount,
      currency: transfer.currency.toUpperCase(),
      createdAt: new Date(transfer.created * 1000),
      reversed: transfer.reversed,
      destinationAccountId: typeof transfer.destination === 'string'
        ? transfer.destination
        : transfer.destination?.id ?? '',
      rawData: transfer,
    }
  }

  /**
   * Create a Stripe Connect account for a creator
   */
  async createConnectAccount(params: CreateConnectAccountParams): Promise<CreateConnectAccountResult> {
    try {
      const stripe = await this.getClient()

      // Determine account type (Express for most, Standard for some countries)
      const useStandardAccount = params.accountType === 'standard' ||
        this.requiresStandardAccount(params.country)

      // Create the Connect account
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
          tenant_id: this.tenantId,
        },
      })

      // For Express accounts, create an account link for onboarding
      if (!useStandardAccount) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: params.refreshUrl || `${baseUrl}/creator/settings/payout-methods/stripe-setup?refresh=true`,
          return_url: params.returnUrl || `${baseUrl}/creator/settings/payout-methods?setup=complete`,
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
      const clientId = process.env.STRIPE_CLIENT_ID
      if (!clientId) {
        return {
          success: false,
          requiresOnboarding: true,
          error: 'STRIPE_CLIENT_ID not configured for Standard accounts',
        }
      }

      const state = Buffer.from(JSON.stringify({
        creatorId: params.creatorId,
        accountId: account.id,
        tenantId: this.tenantId,
      })).toString('base64url')

      const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${state}`

      return {
        success: true,
        accountId: account.id,
        onboardingUrl: oauthUrl,
        requiresOnboarding: true,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error creating Stripe Connect account'
      return {
        success: false,
        requiresOnboarding: false,
        error: message,
      }
    }
  }

  /**
   * Get account link for additional onboarding/updates
   */
  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string,
    type: 'account_onboarding' | 'account_update' = 'account_update'
  ): Promise<string> {
    const stripe = await this.getClient()

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type,
    })

    return accountLink.url
  }

  /**
   * Get Connect account status
   */
  async getConnectAccountStatus(accountId: string): Promise<{
    accountId: string
    isActive: boolean
    chargesEnabled: boolean
    payoutsEnabled: boolean
    onboardingComplete: boolean
    country?: string
    defaultCurrency?: string
    pendingRequirements?: string[]
  }> {
    const stripe = await this.getClient()
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
    }
  }

  /**
   * Create a login link for connected account dashboard
   */
  async createDashboardLink(accountId: string): Promise<string> {
    const stripe = await this.getClient()
    const loginLink = await stripe.accounts.createLoginLink(accountId)
    return loginLink.url
  }

  // ============================================================
  // Webhook Handling
  // ============================================================

  /**
   * Handle incoming Stripe webhook events
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Promise<WebhookResult> {
    try {
      const stripe = await this.getClient()

      // Construct and verify the event
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

      // Process based on event type
      const result = await this.processWebhookEvent(event)

      return {
        success: true,
        eventType: event.type,
        eventId: event.id,
        data: result,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown webhook error'
      return {
        success: false,
        eventType: 'unknown',
        eventId: 'unknown',
        error: message,
      }
    }
  }

  /**
   * Process individual webhook events
   */
  private async processWebhookEvent(event: Stripe.Event): Promise<Record<string, unknown>> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        return {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customerId: paymentIntent.customer,
          metadata: paymentIntent.metadata,
        }
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        return {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          error: paymentIntent.last_payment_error?.message,
          errorCode: paymentIntent.last_payment_error?.code,
        }
      }

      case 'transfer.created':
      case 'transfer.updated':
      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer
        return {
          transferId: transfer.id,
          amount: transfer.amount,
          currency: transfer.currency,
          destination: transfer.destination,
          reversed: transfer.reversed,
          metadata: transfer.metadata,
        }
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        return {
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirements: account.requirements?.currently_due,
        }
      }

      case 'payout.created':
      case 'payout.paid':
      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout
        return {
          payoutId: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          arrivalDate: payout.arrival_date,
          failureCode: payout.failure_code,
          failureMessage: payout.failure_message,
        }
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        return {
          chargeId: charge.id,
          refundedAmount: charge.amount_refunded,
          fullyRefunded: charge.refunded,
        }
      }

      default:
        // Return basic event info for unhandled types
        return {
          eventType: event.type,
          objectId: (event.data.object as { id?: string }).id,
        }
    }
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Map Stripe PaymentIntent to our PaymentIntent type
   */
  private mapPaymentIntent(intent: Stripe.PaymentIntent): PaymentIntent {
    return {
      id: intent.id,
      provider: 'stripe',
      amount: intent.amount,
      currency: intent.currency.toUpperCase(),
      status: this.mapPaymentStatus(intent.status),
      metadata: intent.metadata as Record<string, string> | undefined,
      createdAt: new Date(intent.created * 1000),
      updatedAt: new Date(intent.created * 1000), // Stripe doesn't have separate updated field
    }
  }

  /**
   * Map Stripe status to our PaymentStatus type
   */
  private mapPaymentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
    switch (status) {
      case 'succeeded':
        return 'succeeded'
      case 'processing':
        return 'processing'
      case 'canceled':
        return 'cancelled'
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'requires_capture':
        return 'pending'
      default:
        return 'pending'
    }
  }

  /**
   * Handle Stripe errors and return PaymentResult
   */
  private handleError(error: unknown): PaymentResult {
    const stripeError = error as Stripe.errors.StripeError
    return {
      success: false,
      error: {
        code: stripeError.code || 'unknown',
        message: stripeError.message || 'Unknown Stripe error',
        declineCode: stripeError.decline_code,
      },
    }
  }

  /**
   * Check if country requires Standard account type
   * Brazil requires Standard accounts due to local regulations
   */
  private requiresStandardAccount(country: string): boolean {
    const standardRequired = ['BR'] // Brazil
    return standardRequired.includes(country.toUpperCase())
  }
}

/**
 * Create a Stripe provider for a tenant
 */
export function createStripeProvider(config: StripeProviderConfig): StripeProvider {
  return new StripeProvider(config)
}
