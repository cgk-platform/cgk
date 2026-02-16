/**
 * E-Signature Webhook Triggers
 *
 * Functions to trigger webhooks when document events occur.
 * This module bridges document state changes to webhook delivery.
 */

import {
  getActiveWebhooksForEvent,
  logWebhookDelivery,
  createWebhookSignature,
  getDocumentWithSigners,
} from './index'
import type {
  EsignWebhookEvent,
  EsignWebhookPayload,
  EsignDocumentWithSigners,
} from './types'

/**
 * Build webhook payload from document data
 */
function buildWebhookPayload(
  event: EsignWebhookEvent,
  document: EsignDocumentWithSigners
): EsignWebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    data: {
      documentId: document.id,
      documentName: document.name,
      templateId: document.templateId,
      creatorId: document.creatorId,
      signers: document.signers.map((s) => ({
        email: s.email,
        name: s.name,
        status: s.status,
        signedAt: s.signedAt?.toISOString() || null,
      })),
      signedPdfUrl: document.signedFileUrl || undefined,
    },
  }
}

/**
 * Send webhook to a single endpoint
 */
async function sendSingleWebhook(
  tenantSlug: string,
  webhook: {
    id: string
    endpointUrl: string
    secretKey: string
  },
  event: EsignWebhookEvent,
  payload: EsignWebhookPayload,
  documentId: string
): Promise<boolean> {
  const payloadString = JSON.stringify(payload)
  const signature = createWebhookSignature(payloadString, webhook.secretKey)

  const startTime = Date.now()

  try {
    const response = await fetch(webhook.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Esign-Signature': signature,
        'X-Esign-Event': event,
        'X-Esign-Timestamp': payload.timestamp,
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    const durationMs = Date.now() - startTime
    const responseBody = await response.text().catch((parseError) => {
      console.debug('[esign-webhook] Failed to parse response body:', parseError)
      return ''
    })

    await logWebhookDelivery(tenantSlug, {
      webhookId: webhook.id,
      documentId,
      event,
      payload,
      requestHeaders: {
        'Content-Type': 'application/json',
        'X-Esign-Signature': signature,
        'X-Esign-Event': event,
      },
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000),
      success: response.ok,
      durationMs,
      nextRetryAt: response.ok ? undefined : new Date(Date.now() + 60000),
    })

    return response.ok
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logWebhookDelivery(tenantSlug, {
      webhookId: webhook.id,
      documentId,
      event,
      payload,
      success: false,
      durationMs,
      responseBody: errorMessage,
      nextRetryAt: new Date(Date.now() + 60000),
    })

    return false
  }
}

/**
 * Trigger all matching webhooks for an event
 */
export async function triggerWebhooks(
  tenantSlug: string,
  event: EsignWebhookEvent,
  documentId: string
): Promise<{ triggered: number; successful: number; failed: number }> {
  // Get active webhooks for this event
  const webhooks = await getActiveWebhooksForEvent(tenantSlug, event)

  if (webhooks.length === 0) {
    return { triggered: 0, successful: 0, failed: 0 }
  }

  // Get document data for payload
  const document = await getDocumentWithSigners(tenantSlug, documentId)
  if (!document) {
    console.error(`Document ${documentId} not found for webhook trigger`)
    return { triggered: 0, successful: 0, failed: 0 }
  }

  // Build payload
  const payload = buildWebhookPayload(event, document)

  // Send to all webhooks in parallel
  const results = await Promise.allSettled(
    webhooks.map((webhook) =>
      sendSingleWebhook(tenantSlug, webhook, event, payload, documentId)
    )
  )

  // Count results
  let successful = 0
  let failed = 0

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      successful++
    } else {
      failed++
    }
  }

  return {
    triggered: webhooks.length,
    successful,
    failed,
  }
}

/**
 * Convenience functions for specific events
 */

export async function triggerDocumentSent(
  tenantSlug: string,
  documentId: string
) {
  return triggerWebhooks(tenantSlug, 'document.sent', documentId)
}

export async function triggerDocumentViewed(
  tenantSlug: string,
  documentId: string
) {
  return triggerWebhooks(tenantSlug, 'document.viewed', documentId)
}

export async function triggerDocumentSigned(
  tenantSlug: string,
  documentId: string
) {
  return triggerWebhooks(tenantSlug, 'document.signed', documentId)
}

export async function triggerDocumentCompleted(
  tenantSlug: string,
  documentId: string
) {
  return triggerWebhooks(tenantSlug, 'document.completed', documentId)
}

export async function triggerDocumentDeclined(
  tenantSlug: string,
  documentId: string
) {
  return triggerWebhooks(tenantSlug, 'document.declined', documentId)
}

export async function triggerDocumentExpired(
  tenantSlug: string,
  documentId: string
) {
  return triggerWebhooks(tenantSlug, 'document.expired', documentId)
}

export async function triggerDocumentVoided(
  tenantSlug: string,
  documentId: string
) {
  return triggerWebhooks(tenantSlug, 'document.voided', documentId)
}
