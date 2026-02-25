import { getAllGatewayHealth } from '@/lib/gateway-pool'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request): Promise<Response> {
  const isSuperAdmin = request.headers.get('x-is-super-admin')
  if (isSuperAdmin !== 'true') {
    return Response.json({ error: 'Super admin access required' }, { status: 403 })
  }

  const health = await getAllGatewayHealth()
  return Response.json(health)
}
