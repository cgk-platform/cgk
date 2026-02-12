/**
 * 1099 Delivery System
 *
 * Handles delivery tracking for tax forms via email, portal, and mail.
 *
 * @ai-pattern tax-compliance
 */

import { getTaxFormById, logTaxAction, updateTaxFormStatus } from './db.js'
import type { DeliveryMethod, TaxForm } from './types.js'

/**
 * Mark form as delivered via email
 */
export async function markDeliveredByEmail(
  tenantSlug: string,
  formId: string,
  deliveredBy: string
): Promise<TaxForm> {
  const form = await updateTaxFormStatus(tenantSlug, formId, 'filed', {
    deliveryMethod: 'email',
    deliveredAt: new Date(),
  })

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  await logTaxAction(
    tenantSlug,
    'form_delivered',
    formId,
    form.payeeId,
    form.payeeType,
    deliveredBy,
    {
      notes: 'Delivered via email',
    }
  )

  return form
}

/**
 * Mark form as available in portal
 */
export async function markAvailableInPortal(
  tenantSlug: string,
  formId: string,
  deliveredBy: string
): Promise<TaxForm> {
  const form = await updateTaxFormStatus(tenantSlug, formId, 'filed', {
    deliveryMethod: 'portal',
    deliveredAt: new Date(),
  })

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  await logTaxAction(
    tenantSlug,
    'form_delivered',
    formId,
    form.payeeId,
    form.payeeType,
    deliveredBy,
    {
      notes: 'Made available in portal',
    }
  )

  return form
}

/**
 * Mark form delivery confirmed (viewed by recipient)
 */
export async function markDeliveryConfirmed(
  tenantSlug: string,
  formId: string,
  confirmedBy: string
): Promise<TaxForm> {
  const form = await updateTaxFormStatus(tenantSlug, formId, 'filed', {
    deliveryConfirmedAt: new Date(),
  })

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  await logTaxAction(
    tenantSlug,
    'form_delivered',
    formId,
    form.payeeId,
    form.payeeType,
    confirmedBy,
    {
      notes: 'Delivery confirmed - viewed by recipient',
    }
  )

  return form
}

/**
 * Queue form for mail delivery
 */
export async function queueForMail(
  tenantSlug: string,
  formId: string,
  queuedBy: string,
  mailLetterId?: string
): Promise<TaxForm> {
  const form = await updateTaxFormStatus(tenantSlug, formId, 'filed', {
    deliveryMethod: 'mail',
    mailLetterId,
    mailStatus: 'queued',
  })

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  await logTaxAction(
    tenantSlug,
    'mail_queued',
    formId,
    form.payeeId,
    form.payeeType,
    queuedBy,
    {
      notes: `Queued for mail delivery${mailLetterId ? `, letter ID: ${mailLetterId}` : ''}`,
    }
  )

  return form
}

/**
 * Update mail delivery status
 */
export async function updateMailStatus(
  tenantSlug: string,
  formId: string,
  status: 'sent' | 'delivered' | 'returned',
  updatedBy: string
): Promise<TaxForm> {
  const updates: Record<string, unknown> = { mailStatus: status }

  if (status === 'delivered') {
    updates.deliveredAt = new Date()
    updates.deliveryConfirmedAt = new Date()
  }

  const form = await updateTaxFormStatus(tenantSlug, formId, 'filed', updates as any)

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  const actionMap: Record<'sent' | 'delivered' | 'returned', 'mail_sent' | 'mail_delivered' | 'mail_returned'> = {
    sent: 'mail_sent',
    delivered: 'mail_delivered',
    returned: 'mail_returned',
  }

  await logTaxAction(
    tenantSlug,
    actionMap[status] as 'mail_sent' | 'mail_delivered' | 'mail_returned',
    formId,
    form.payeeId,
    form.payeeType,
    updatedBy,
    {
      notes: `Mail status updated to: ${status}`,
    }
  )

  return form
}

/**
 * Get delivery status for a form
 */
export async function getDeliveryStatus(
  tenantSlug: string,
  formId: string
): Promise<{
  delivered: boolean
  confirmed: boolean
  method?: DeliveryMethod
  deliveredAt?: Date
  confirmedAt?: Date
  mailStatus?: string
}> {
  const form = await getTaxFormById(tenantSlug, formId)

  if (!form) {
    throw new Error(`Form ${formId} not found`)
  }

  return {
    delivered: !!form.deliveredAt,
    confirmed: !!form.deliveryConfirmedAt,
    method: form.deliveryMethod,
    deliveredAt: form.deliveredAt,
    confirmedAt: form.deliveryConfirmedAt,
    mailStatus: form.mailStatus,
  }
}

/**
 * Bulk mark forms as available in portal
 */
export async function bulkMarkAvailableInPortal(
  tenantSlug: string,
  formIds: string[],
  deliveredBy: string
): Promise<{ delivered: number; errors: string[] }> {
  let delivered = 0
  const errors: string[] = []

  for (const formId of formIds) {
    try {
      await markAvailableInPortal(tenantSlug, formId, deliveredBy)
      delivered++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${formId}: ${message}`)
    }
  }

  return { delivered, errors }
}
