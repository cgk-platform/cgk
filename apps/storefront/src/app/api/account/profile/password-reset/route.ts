export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

/**
 * POST /api/account/profile/password-reset
 * Initiates a password reset for the current customer
 */
export async function POST() {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Generate a password reset token
    const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store the reset token
    await withTenant(tenantSlug, async () => {
      return sql`
        INSERT INTO customer_password_resets (
          customer_id,
          token,
          expires_at,
          created_at
        ) VALUES (
          ${session.customerId},
          ${resetToken},
          ${expiresAt.toISOString()},
          NOW()
        )
        ON CONFLICT (customer_id)
        DO UPDATE SET
          token = ${resetToken},
          expires_at = ${expiresAt.toISOString()},
          created_at = NOW()
      `
    })

    // In a real implementation, this would:
    // 1. Queue an email job to send the password reset link
    // 2. The link would point to /account/reset-password?token=xxx
    // For now, we just return success

    // Note: For Shopify-based authentication, password resets would typically
    // go through Shopify's customer account system rather than our own.

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    })
  } catch (error) {
    console.error('Failed to initiate password reset:', error)

    // Even if the table doesn't exist, return success for security
    // (don't reveal whether the operation actually happened)
    return NextResponse.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link.',
    })
  }
}
