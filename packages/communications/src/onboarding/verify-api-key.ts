/**
 * Resend API Key Verification
 *
 * Validates Resend API keys before proceeding with email setup.
 *
 * @ai-pattern onboarding
 * @ai-note Step 5a of tenant onboarding
 */

import type {
  ResendApiKeyInfo,
  VerifyApiKeyInput,
  VerifyApiKeyResult,
} from './types.js'

/**
 * Resend API base URL
 */
const RESEND_API_URL = 'https://api.resend.com'

/**
 * Verify a Resend API key is valid
 *
 * Tests the key by fetching domains list from Resend API.
 */
export async function verifyResendApiKey(
  input: VerifyApiKeyInput
): Promise<VerifyApiKeyResult> {
  const { apiKey } = input

  if (!apiKey) {
    return {
      valid: false,
      error: 'API key is required',
    }
  }

  // Basic format validation
  if (!apiKey.startsWith('re_')) {
    return {
      valid: false,
      error: 'Invalid API key format. Resend API keys start with "re_"',
    }
  }

  try {
    // Test the API key by fetching domains
    const response = await fetch(`${RESEND_API_URL}/domains`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 401) {
      return {
        valid: false,
        error: 'Invalid API key. Please check your key and try again.',
      }
    }

    if (response.status === 403) {
      return {
        valid: false,
        error: 'API key does not have permission to access domains.',
      }
    }

    if (!response.ok) {
      const body = await response.text()
      return {
        valid: false,
        error: `Resend API error: ${response.status} - ${body}`,
      }
    }

    // Key is valid
    return {
      valid: true,
      accountInfo: {
        createdAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error
        ? `Failed to verify API key: ${error.message}`
        : 'Failed to verify API key',
    }
  }
}

/**
 * Check if an API key has full access permissions
 *
 * Full access is required for inbound email functionality.
 */
export async function checkApiKeyPermissions(
  apiKey: string
): Promise<{
  hasFullAccess: boolean
  hasSendingAccess: boolean
  error?: string
}> {
  try {
    // Try to list API keys - this requires full access
    const response = await fetch(`${RESEND_API_URL}/api-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 401 || response.status === 403) {
      // Key doesn't have permission to list API keys
      // This means it's likely a sending-only key
      return {
        hasFullAccess: false,
        hasSendingAccess: true,
      }
    }

    if (!response.ok) {
      return {
        hasFullAccess: false,
        hasSendingAccess: false,
        error: `Failed to check permissions: ${response.status}`,
      }
    }

    const data = await response.json() as { data: ResendApiKeyInfo[] }

    // Find the current key in the list
    const keys = data.data || []
    const currentKey = keys.find((k: ResendApiKeyInfo) =>
      apiKey.includes(k.id)
    )

    if (currentKey) {
      return {
        hasFullAccess: currentKey.permission === 'full_access',
        hasSendingAccess: true,
      }
    }

    // If we can list keys, we have full access
    return {
      hasFullAccess: true,
      hasSendingAccess: true,
    }
  } catch (error) {
    return {
      hasFullAccess: false,
      hasSendingAccess: false,
      error: error instanceof Error ? error.message : 'Permission check failed',
    }
  }
}

/**
 * Send a test email to verify the API key works for sending
 */
export async function sendTestEmailWithKey(
  apiKey: string,
  to: string,
  brandName: string
): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    const response = await fetch(`${RESEND_API_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Resend's default sender for testing
        to: [to],
        subject: `${brandName} Email Setup - Test Email`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Email Setup Successful!</h1>
            <p>This is a test email from the ${brandName} email configuration wizard.</p>
            <p>Your Resend API key has been verified and is working correctly.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              You can now proceed to configure your email domains and sender addresses.
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      return {
        success: false,
        error: `Failed to send test email: ${body}`,
      }
    }

    const data = await response.json() as { id: string }
    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email',
    }
  }
}
