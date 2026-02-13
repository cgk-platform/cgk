import { getTenantContext } from '@cgk-platform/auth'
import {
  // Storage
  saveTenantStripeConfig,
  saveTenantResendConfig,
  saveTenantWiseConfig,
  saveTenantApiCredential,
  deleteTenantStripeConfig,
  deleteTenantResendConfig,
  deleteTenantWiseConfig,
  deleteTenantApiCredential,
  // Clients
  clearTenantStripeClientCache,
  clearTenantResendClientCache,
  clearTenantWiseCache,
  clearTenantServiceCache,
  type TenantApiService,
} from '@cgk-platform/integrations'

export const dynamic = 'force-dynamic'

type ServiceParam = 'stripe' | 'resend' | 'wise' | TenantApiService

/**
 * POST /api/admin/integrations/credentials/[service]
 * Save credentials for a specific service
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
    const body = await req.json()

    switch (service as ServiceParam) {
      case 'stripe': {
        if (!body.secretKey) {
          return Response.json({ error: 'Secret key is required' }, { status: 400 })
        }
        const config = await saveTenantStripeConfig(tenantId, {
          secretKey: body.secretKey,
          publishableKey: body.publishableKey,
          webhookSecret: body.webhookSecret,
          livemode: body.secretKey.startsWith('sk_live_'),
        })
        clearTenantStripeClientCache(tenantId)
        return Response.json({ success: true, config: { id: config.id } })
      }

      case 'resend': {
        if (!body.apiKey) {
          return Response.json({ error: 'API key is required' }, { status: 400 })
        }
        const config = await saveTenantResendConfig(tenantId, {
          apiKey: body.apiKey,
          defaultFromEmail: body.defaultFromEmail,
          defaultFromName: body.defaultFromName,
          defaultReplyTo: body.defaultReplyTo,
        })
        clearTenantResendClientCache(tenantId)
        return Response.json({ success: true, config: { id: config.id } })
      }

      case 'wise': {
        if (!body.apiKey) {
          return Response.json({ error: 'API key is required' }, { status: 400 })
        }
        const config = await saveTenantWiseConfig(tenantId, {
          apiKey: body.apiKey,
          webhookSecret: body.webhookSecret,
          sandboxMode: body.sandboxMode,
          sourceCurrency: body.sourceCurrency,
        })
        clearTenantWiseCache(tenantId)
        return Response.json({ success: true, config: { id: config.id } })
      }

      // Generic API services (mux, assemblyai, anthropic, openai, etc.)
      default: {
        if (!body.apiKey) {
          return Response.json({ error: 'API key is required' }, { status: 400 })
        }
        const config = await saveTenantApiCredential(tenantId, {
          serviceName: service as TenantApiService,
          apiKey: body.apiKey,
          apiSecret: body.apiSecret,
          metadata: body.metadata,
        })
        clearTenantServiceCache(tenantId, service as TenantApiService)
        return Response.json({ success: true, config: { id: config.id } })
      }
    }
  } catch (error) {
    console.error(`Failed to save ${service} credentials:`, error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to save credentials' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/integrations/credentials/[service]
 * Delete credentials for a specific service
 */
export async function DELETE(
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
      case 'stripe':
        await deleteTenantStripeConfig(tenantId)
        clearTenantStripeClientCache(tenantId)
        break

      case 'resend':
        await deleteTenantResendConfig(tenantId)
        clearTenantResendClientCache(tenantId)
        break

      case 'wise':
        await deleteTenantWiseConfig(tenantId)
        clearTenantWiseCache(tenantId)
        break

      default:
        await deleteTenantApiCredential(tenantId, service as TenantApiService)
        clearTenantServiceCache(tenantId, service as TenantApiService)
        break
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error(`Failed to delete ${service} credentials:`, error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to delete credentials' },
      { status: 500 }
    )
  }
}
