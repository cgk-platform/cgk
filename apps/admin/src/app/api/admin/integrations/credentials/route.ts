import { getTenantContext } from '@cgk-platform/auth'
import {
  getTenantStripeConfig,
  getTenantResendConfig,
  getTenantWiseConfig,
  getAllTenantApiCredentials,
} from '@cgk-platform/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/credentials
 * Get all tenant credential statuses
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // Fetch all credential configs in parallel
    const [stripeConfig, resendConfig, wiseConfig, apiCredentials] = await Promise.all([
      getTenantStripeConfig(tenantId),
      getTenantResendConfig(tenantId),
      getTenantWiseConfig(tenantId),
      getAllTenantApiCredentials(tenantId),
    ])

    // Map Stripe config to status
    const stripe = stripeConfig
      ? {
          service: 'stripe',
          displayName: 'Stripe',
          connected: true,
          lastVerifiedAt: stripeConfig.lastVerifiedAt?.toISOString() || null,
          hasError: !!stripeConfig.lastError,
          errorMessage: stripeConfig.lastError,
          accountInfo: stripeConfig.stripeAccountId
            ? {
                accountId: stripeConfig.stripeAccountId,
                accountName: stripeConfig.accountName,
                livemode: stripeConfig.livemode,
              }
            : undefined,
        }
      : null

    // Map Resend config to status
    const resend = resendConfig
      ? {
          service: 'resend',
          displayName: 'Resend',
          connected: true,
          lastVerifiedAt: resendConfig.lastVerifiedAt?.toISOString() || null,
          hasError: !!resendConfig.lastError,
          errorMessage: resendConfig.lastError,
          accountInfo: {
            defaultFromEmail: resendConfig.defaultFromEmail,
            verifiedDomains: resendConfig.verifiedDomains,
          },
        }
      : null

    // Map Wise config to status
    const wise = wiseConfig
      ? {
          service: 'wise',
          displayName: 'Wise',
          connected: true,
          lastVerifiedAt: wiseConfig.lastVerifiedAt?.toISOString() || null,
          hasError: !!wiseConfig.lastError,
          errorMessage: wiseConfig.lastError,
          accountInfo: wiseConfig.profileId
            ? {
                profileId: wiseConfig.profileId,
                profileType: wiseConfig.profileType,
                sandboxMode: wiseConfig.sandboxMode,
              }
            : undefined,
        }
      : null

    // Map generic API credentials to status
    const services = apiCredentials.map((cred) => ({
      service: cred.serviceName,
      displayName: cred.serviceDisplayName || cred.serviceName,
      connected: true,
      lastVerifiedAt: cred.lastVerifiedAt?.toISOString() || null,
      hasError: !!cred.lastError,
      errorMessage: cred.lastError,
      accountInfo: cred.accountId ? { accountId: cred.accountId, ...cred.metadata } : cred.metadata,
    }))

    return Response.json({
      stripe,
      resend,
      wise,
      services,
    })
  } catch (error) {
    console.error('Failed to fetch credentials:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch credentials' },
      { status: 500 }
    )
  }
}
