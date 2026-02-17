export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { ShareWishlistResponse } from '@/lib/account/types'

interface ShareRequest {
  expiresInDays?: number
}

interface RouteParams {
  params: Promise<{ id: string }>
}

function generateShareToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

/**
 * POST /api/account/wishlists/[id]/share
 * Generates a shareable link for a wishlist
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: wishlistId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ShareRequest = {}
  try {
    body = await request.json()
  } catch {
    // Optional body
  }

  try {
    // Verify wishlist belongs to customer
    const checkResult = await withTenant(tenantSlug, async () => {
      return sql<{ id: string; share_token: string | null }>`
        SELECT id, share_token
        FROM wishlists
        WHERE id = ${wishlistId}
          AND customer_id = ${session.customerId}
        LIMIT 1
      `
    })

    const wishlist = checkResult.rows[0]
    if (!wishlist) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 })
    }

    // Generate new share token or use existing
    const shareToken = wishlist.share_token ?? generateShareToken()
    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null

    // Update wishlist with share info
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE wishlists
        SET
          share_token = ${shareToken},
          share_expires_at = ${expiresAt?.toISOString() ?? null},
          is_public = true,
          updated_at = NOW()
        WHERE id = ${wishlistId}
          AND customer_id = ${session.customerId}
      `
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const shareUrl = `${baseUrl}/wishlist/shared/${shareToken}`

    const response: ShareWishlistResponse = {
      shareUrl,
      expiresAt: expiresAt?.toISOString() ?? null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to share wishlist:', error)
    return NextResponse.json({ error: 'Failed to share wishlist' }, { status: 500 })
  }
}
