import { getGatewayClient } from '@/lib/gateway-pool'
import { getProfileUrl, getProfileToken, PROFILES } from '@cgk-platform/openclaw'
import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  const profile = PROFILES[result.profile]
  const resolvedUrl = getProfileUrl(result.profile)
  const hasToken = !!getProfileToken(result.profile)
  const envUrlRaw = process.env[profile.urlEnvVar]
  const envTokenRaw = process.env[profile.tokenEnvVar]

  const debug = {
    profile: result.profile,
    resolvedUrl,
    hasToken,
    urlEnvVar: profile.urlEnvVar,
    urlEnvSet: !!envUrlRaw,
    urlEnvLength: envUrlRaw?.length ?? 0,
    tokenEnvVar: profile.tokenEnvVar,
    tokenEnvSet: !!envTokenRaw,
    tokenEnvLength: envTokenRaw?.length ?? 0,
  }

  console.log('[health] debug:', JSON.stringify(debug))

  try {
    const client = await getGatewayClient(result.profile)
    const health = await client.health()
    return Response.json({ connected: true, health, debug })
  } catch (err) {
    return Response.json({
      connected: false,
      health: null,
      error: err instanceof Error ? err.message : 'Connection failed',
      debug,
    })
  }
}
