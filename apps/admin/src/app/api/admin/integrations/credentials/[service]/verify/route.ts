import { getTenantContext } from '@cgk-platform/auth'
import {
  verifyTenantStripeCredentials,
  verifyTenantResendCredentials,
  verifyTenantWiseCredentials,
  verifyTenantServiceCredentials,
  updateStripeConfigVerification,
  type TenantApiService,
} from '@cgk-platform/integrations'
import { withTenant, sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

type ServiceParam = 'stripe' | 'resend' | 'wise' | TenantApiService

/**
 * POST /api/admin/integrations/credentials/[service]/verify
 * Verify credentials for a specific service
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ service: string }> }
) {
  const { tenantId } = await getTenantContext(req)
  const { service } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    switch (service as ServiceParam) {
      case 'stripe': {
        const result = await verifyTenantStripeCredentials(tenantId)
        if (result.valid) {
          await updateStripeConfigVerification(tenantId, true, {
            accountId: result.accountId,
            accountName: result.accountName,
            accountCountry: result.accountCountry,
          })
        } else {
          await updateStripeConfigVerification(tenantId, false, undefined, result.error)
        }
        return Response.json(result)
      }

      case 'resend': {
        const result = await verifyTenantResendCredentials(tenantId)
        if (result.valid) {
          await withTenant(tenantId, async () => {
            await sql`
              UPDATE tenant_resend_config
              SET
                last_verified_at = NOW(),
                verified_domains = ${JSON.stringify(result.domains || [])},
                last_error = NULL
              WHERE tenant_id = ${tenantId}
            `
          })
        } else {
          await withTenant(tenantId, async () => {
            await sql`
              UPDATE tenant_resend_config
              SET last_error = ${result.error || 'Verification failed'}
              WHERE tenant_id = ${tenantId}
            `
          })
        }
        return Response.json(result)
      }

      case 'wise': {
        const result = await verifyTenantWiseCredentials(tenantId)
        if (result.valid && result.profiles && result.profiles.length > 0) {
          const profile = result.profiles[0]!
          await withTenant(tenantId, async () => {
            await sql`
              UPDATE tenant_wise_config
              SET
                last_verified_at = NOW(),
                profile_id = ${String(profile.id)},
                profile_type = ${profile.type},
                account_holder_name = ${profile.details.name || profile.details.firstName || null},
                last_error = NULL
              WHERE tenant_id = ${tenantId}
            `
          })
        } else {
          await withTenant(tenantId, async () => {
            await sql`
              UPDATE tenant_wise_config
              SET last_error = ${result.error || 'Verification failed'}
              WHERE tenant_id = ${tenantId}
            `
          })
        }
        return Response.json({ valid: result.valid, error: result.error })
      }

      // Generic API services
      default: {
        const result = await verifyTenantServiceCredentials(tenantId, service as TenantApiService)
        if (result.valid) {
          await withTenant(tenantId, async () => {
            await sql`
              UPDATE tenant_api_credentials
              SET last_verified_at = NOW(), last_error = NULL
              WHERE tenant_id = ${tenantId} AND service_name = ${service}
            `
          })
        } else {
          await withTenant(tenantId, async () => {
            await sql`
              UPDATE tenant_api_credentials
              SET last_error = ${result.error || 'Verification failed'}
              WHERE tenant_id = ${tenantId} AND service_name = ${service}
            `
          })
        }
        return Response.json(result)
      }
    }
  } catch (error) {
    console.error(`Failed to verify ${service} credentials:`, error)
    return Response.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    )
  }
}
