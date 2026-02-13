export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

/**
 * POST /api/ai-agents/voice/webhooks/retell
 * Handle Retell.ai webhook events
 *
 * This endpoint is called by Retell.ai for:
 * - call_started: Call has been connected
 * - call_ended: Call has ended
 * - call_analyzed: Call analysis is complete
 * - transcript: Real-time transcript updates
 * - recording_ready: Recording is available
 */
export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const bodyText = await request.text()
    const signature = request.headers.get('x-retell-signature')

    // Verify webhook signature
    const { verifyRetellSignature } = await import('@cgk-platform/ai-agents')
    if (!verifyRetellSignature(bodyText, signature)) {
      console.error('Invalid Retell webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse the event
    const event = JSON.parse(bodyText)

    // Extract tenant ID from call metadata
    // Retell includes metadata we set when creating the call
    const metadata = event.metadata || {}
    const tenantId = metadata.tenant_id

    if (!tenantId) {
      console.error('No tenant_id in webhook metadata')
      // Still acknowledge the webhook to prevent retries
      return NextResponse.json({ received: true, warning: 'No tenant context' })
    }

    // Process the webhook within tenant context
    const { withTenant } = await import('@cgk-platform/db')
    const { createRetellClient, getVoiceCredentials } = await import('@cgk-platform/ai-agents')

    await withTenant(tenantId, async () => {
      // Get tenant's Retell credentials
      const credentials = await getVoiceCredentials(tenantId)
      if (!credentials?.retellApiKeyEncrypted) {
        console.error('Retell credentials not found for tenant:', tenantId)
        return
      }

      // Create client and handle the webhook
      const retellClient = createRetellClient(credentials.retellApiKeyEncrypted, tenantId)
      await retellClient.handleWebhook(event)
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Retell webhook:', error)
    // Return 200 to prevent Retell from retrying
    // Log the error for investigation
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}

/**
 * GET /api/ai-agents/voice/webhooks/retell
 * Health check for webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'retell-webhook',
    timestamp: new Date().toISOString(),
  })
}
