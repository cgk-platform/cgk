import { getTenantContext } from '@cgk/auth'
import { testKlaviyoConnection } from '@cgk/integrations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/klaviyo/test
 * Test Klaviyo connection
 */
export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const isValid = await testKlaviyoConnection(tenantId)
    return Response.json({ connected: isValid })
  } catch (error) {
    console.error('Failed to test Klaviyo connection:', error)
    return Response.json({ connected: false })
  }
}
