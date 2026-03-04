import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ShopifyConfig {
  apiKey: string
  apiSecret: string
  storeUrl: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ShopifyConfig
    const { apiKey, apiSecret, storeUrl } = body

    if (!apiKey || !apiSecret || !storeUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Store Shopify configuration in database settings table
    // Note: In production, these should be encrypted
    await sql`
      INSERT INTO public.settings (key, value, created_at, updated_at)
      VALUES
        ('shopify_api_key', ${apiKey}, NOW(), NOW()),
        ('shopify_api_secret', ${apiSecret}, NOW(), NOW()),
        ('shopify_store_url', ${storeUrl}, NOW(), NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `

    return NextResponse.json({
      success: true,
      message: 'Shopify configuration saved',
    })
  } catch (error) {
    console.error('Error saving Shopify config:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
