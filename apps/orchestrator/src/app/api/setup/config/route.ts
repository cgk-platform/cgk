import { NextResponse } from 'next/server'
import { sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/setup/config
 *
 * Saves platform configuration and marks setup as complete.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { platformName, supportEmail, defaultTimezone } = body

    // Validate input
    if (!platformName || typeof platformName !== 'string' || platformName.trim().length < 1) {
      return NextResponse.json(
        { success: false, error: 'Platform name is required' },
        { status: 400 }
      )
    }

    // Build config objects
    const setupConfig = {
      completed: true,
      completedAt: new Date().toISOString(),
      version: '1.0.0',
    }

    const platformConfig = {
      name: platformName.trim(),
      supportEmail: supportEmail?.trim() || null,
      defaultTimezone: defaultTimezone || 'America/New_York',
    }

    // Save configuration using UPSERT
    await sql`
      INSERT INTO public.platform_config (key, value, created_at, updated_at)
      VALUES
        ('setup', ${JSON.stringify(setupConfig)}::jsonb, NOW(), NOW()),
        ('platform', ${JSON.stringify(platformConfig)}::jsonb, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `

    // Also save individual settings for easier access
    await sql`
      INSERT INTO public.platform_config (key, value, created_at, updated_at)
      VALUES
        ('platform_name', ${JSON.stringify(platformName.trim())}::jsonb, NOW(), NOW()),
        ('support_email', ${JSON.stringify(supportEmail?.trim() || null)}::jsonb, NOW(), NOW()),
        ('default_timezone', ${JSON.stringify(defaultTimezone || 'America/New_York')}::jsonb, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `

    return NextResponse.json({
      success: true,
      config: {
        setup: setupConfig,
        platform: platformConfig,
      },
    })
  } catch (error) {
    console.error('Failed to save config:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
      },
      { status: 500 }
    )
  }
}
