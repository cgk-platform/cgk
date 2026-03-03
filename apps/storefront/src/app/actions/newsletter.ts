'use server'

/**
 * Newsletter signup server action.
 * Stores email for later integration with Klaviyo/Mailchimp.
 * For now, validates and logs — the actual provider integration
 * will be wired when tenant Klaviyo credentials are configured.
 */

import { logger } from '@cgk-platform/logging'
export async function subscribeToNewsletter(formData: FormData): Promise<{ success: boolean; message: string }> {
  const email = formData.get('email')

  if (!email || typeof email !== 'string') {
    return { success: false, message: 'Email is required.' }
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  try {
    // TODO: Wire to tenant's Klaviyo/email provider when credentials are configured
    // For now, log the subscription attempt
    logger.info(`[Newsletter] Subscription: ${email}`)

    return { success: true, message: 'Thanks for subscribing! Check your inbox for 10% off.' }
  } catch {
    return { success: false, message: 'Something went wrong. Please try again.' }
  }
}
