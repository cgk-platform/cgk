import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface StripeConfig {
  secretKey: string
  publishableKey: string
  webhookSecret?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StripeConfig
    const { secretKey, publishableKey, webhookSecret } = body

    if (!secretKey || !publishableKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Store Stripe configuration in database settings table
    // Note: In production, these should be encrypted
    const settings = [
      ['stripe_secret_key', secretKey],
      ['stripe_publishable_key', publishableKey],
      ...(webhookSecret ? [['stripe_webhook_secret', webhookSecret]] : []),
    ]

    for (const [key, value] of settings) {
      await sql`
        INSERT INTO public.settings (key, value, created_at, updated_at)
        VALUES (${key}, ${value}, NOW(), NOW())
        ON CONFLICT (key)
        DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
      `
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe configuration saved',
    })
  } catch (error) {
    console.error('Error saving Stripe config:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
