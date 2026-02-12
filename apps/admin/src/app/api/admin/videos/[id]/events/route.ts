/**
 * Video Status SSE Stream
 *
 * GET /api/admin/videos/[id]/events - SSE stream for real-time status updates
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { headers } from 'next/headers'

import {
  createSSEResponse,
  createVideoStatusStream,
} from '@cgk/video/creator-tools'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return new Response(JSON.stringify({ error: 'Tenant not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id: videoId } = await params

  // Parse optional SSE options from query params
  const url = new URL(request.url)
  const pollInterval = parseInt(url.searchParams.get('pollInterval') || '2000', 10)
  const timeout = parseInt(url.searchParams.get('timeout') || '600000', 10)

  // Create SSE stream
  const stream = createVideoStatusStream(tenantSlug, videoId, {
    pollInterval: Math.max(1000, Math.min(10000, pollInterval)),
    timeout: Math.max(60000, Math.min(600000, timeout)),
    keepalive: true,
  })

  return createSSEResponse(stream)
}
