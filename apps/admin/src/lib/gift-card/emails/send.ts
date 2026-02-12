/**
 * Gift Card Email Sending
 *
 * Handles sending gift card notification emails
 */
import type { GiftCardEmail, GiftCardSettings, GiftCardTransaction } from '../types'
import { markEmailSent, markEmailFailed, getPendingEmailsToSend } from '../db/emails'
import { getGiftCardTransactionById } from '../db/transactions'
import { getGiftCardSettings } from '../settings'
/**
 * Format cents to currency string
 */
function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

/**
 * Email content after template rendering
 */
export interface RenderedEmail {
  to: string
  from: string
  subject: string
  html: string
}

/**
 * Template variables for email rendering
 */
export interface EmailTemplateVariables {
  customer_name: string
  customer_email: string
  amount: string
  order_name: string
  store_url: string
}

/**
 * Render email template with variables
 */
export function renderEmailTemplate(
  template: string,
  variables: EmailTemplateVariables
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

/**
 * Build HTML email content
 */
export function buildEmailHtml(
  settings: GiftCardSettings,
  variables: EmailTemplateVariables
): string {
  const { email_template: t } = settings

  const headline = renderEmailTemplate(t.headline, variables)
  const greeting = renderEmailTemplate(t.greeting, variables)
  const body = renderEmailTemplate(t.body, variables)
  const ctaText = renderEmailTemplate(t.cta_text, variables)
  const ctaUrl = renderEmailTemplate(t.cta_url, variables)
  const howToUse = renderEmailTemplate(t.how_to_use, variables)
  const footer = renderEmailTemplate(t.footer, variables)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .headline { font-size: 24px; font-weight: bold; color: #111; margin-bottom: 24px; text-align: center; }
    .greeting { font-size: 16px; color: #333; margin-bottom: 16px; }
    .body { font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px; }
    .amount-box { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .amount { font-size: 32px; font-weight: bold; color: #16a34a; }
    .cta { display: inline-block; background: #111; color: white !important; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-bottom: 24px; }
    .cta-container { text-align: center; }
    .how-to-use { background: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px; font-size: 14px; color: #666; }
    .footer { font-size: 14px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 24px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1 class="headline">${headline}</h1>
      <p class="greeting">${greeting}</p>
      <p class="body">${body}</p>
      <div class="amount-box">
        <div class="amount">${variables.amount}</div>
        <div style="color: #666; margin-top: 4px;">Store Credit</div>
      </div>
      <div class="cta-container">
        <a href="${ctaUrl}" class="cta">${ctaText}</a>
      </div>
      <div class="how-to-use">
        <strong>How to use:</strong> ${howToUse}
      </div>
      <div class="footer">${footer}</div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Render a complete email for sending
 */
export async function renderGiftCardEmail(
  email: GiftCardEmail,
  transaction: GiftCardTransaction,
  settings: GiftCardSettings,
  storeUrl: string
): Promise<RenderedEmail> {
  const variables: EmailTemplateVariables = {
    customer_name: transaction.customer_name || transaction.customer_email.split('@')[0] || 'Customer',
    customer_email: transaction.customer_email,
    amount: formatMoney(transaction.amount_cents),
    order_name: transaction.shopify_order_name,
    store_url: storeUrl,
  }

  const subject = renderEmailTemplate(settings.email_template.subject, variables)
  const html = buildEmailHtml(settings, variables)

  return {
    to: email.to_email,
    from: settings.from_email,
    subject,
    html,
  }
}

/**
 * Send a gift card email
 * Placeholder for Resend integration
 *
 * @returns Resend message ID if successful
 */
export async function sendEmail(
  rendered: RenderedEmail
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Placeholder for Resend integration
  // In production, this would:
  // 1. Use Resend SDK to send the email
  // 2. Handle rate limiting and retries
  // 3. Return the message ID

  console.log(`sendEmail: Sending to ${rendered.to}`, {
    from: rendered.from,
    subject: rendered.subject,
  })

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Return mock success
  const mockMessageId = `msg_${Date.now()}`
  return { success: true, messageId: mockMessageId }
}

/**
 * Process a single email from the queue
 * Must be called within withTenant() context
 */
export async function processGiftCardEmail(
  email: GiftCardEmail,
  storeUrl: string
): Promise<{ success: boolean; error?: string }> {
  // Get transaction
  const transaction = await getGiftCardTransactionById(email.transaction_id)
  if (!transaction) {
    await markEmailFailed(email.id, 'Transaction not found')
    return { success: false, error: 'Transaction not found' }
  }

  // Get settings
  const settings = await getGiftCardSettings()
  if (!settings.email_enabled) {
    await markEmailFailed(email.id, 'Email notifications disabled')
    return { success: false, error: 'Email notifications disabled' }
  }

  try {
    // Render email
    const rendered = await renderGiftCardEmail(email, transaction, settings, storeUrl)

    // Send email
    const result = await sendEmail(rendered)

    if (result.success && result.messageId) {
      await markEmailSent(email.id, result.messageId)
      return { success: true }
    } else {
      await markEmailFailed(email.id, result.error || 'Failed to send email')
      return { success: false, error: result.error }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await markEmailFailed(email.id, errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Process pending emails from the queue
 * Must be called within withTenant() context
 */
export async function processPendingEmails(
  storeUrl: string,
  limit = 50
): Promise<Array<{ email: GiftCardEmail; success: boolean; error?: string }>> {
  const emails = await getPendingEmailsToSend(limit)
  const results: Array<{ email: GiftCardEmail; success: boolean; error?: string }> = []

  for (const email of emails) {
    const result = await processGiftCardEmail(email, storeUrl)
    results.push({ email, ...result })
  }

  return results
}
