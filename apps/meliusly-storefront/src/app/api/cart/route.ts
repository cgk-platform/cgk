import { NextRequest, NextResponse } from 'next/server'
import { Cart } from '@/lib/cart/types'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Get user's cart ID from cookie or session
// For now, use a simple session-based approach with cookies
function getCartSessionId(request: NextRequest): string {
  const sessionId = request.cookies.get('cart_session_id')?.value

  if (!sessionId) {
    // Generate new session ID
    return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  return sessionId
}

// GET /api/cart - Fetch cart from database
export async function GET(request: NextRequest) {
  try {
    const sessionId = getCartSessionId(request)

    // For MVP, we're using localStorage as primary storage
    // Database sync is optional and can be added later
    // For now, return empty cart and let client use localStorage

    return NextResponse.json(
      {
        success: true,
        cart: {
          items: [],
          subtotal: { amount: '0.00', currencyCode: 'USD' },
          itemCount: 0,
        },
      },
      {
        headers: {
          'Set-Cookie': `cart_session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
        },
      }
    )
  } catch (error) {
    logger.error('Failed to fetch cart:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ success: false, error: 'Failed to fetch cart' }, { status: 500 })
  }
}

// POST /api/cart - Save cart to database
export async function POST(request: NextRequest) {
  try {
    const sessionId = getCartSessionId(request)
    const body = (await request.json()) as { cart: Cart }

    // For MVP, we're using localStorage as primary storage
    // Database sync can be added later when we have the schema set up
    // and tenant context is available

    return NextResponse.json(
      {
        success: true,
        message: 'Cart saved successfully',
      },
      {
        headers: {
          'Set-Cookie': `cart_session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
        },
      }
    )
  } catch (error) {
    logger.error('Failed to save cart:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ success: false, error: 'Failed to save cart' }, { status: 500 })
  }
}

// DELETE /api/cart - Clear cart
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = getCartSessionId(request)

    // Database deletion will be added when schema is set up with tenant context

    return NextResponse.json(
      {
        success: true,
        message: 'Cart cleared successfully',
      },
      {
        headers: {
          'Set-Cookie': `cart_session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
        },
      }
    )
  } catch (error) {
    logger.error('Failed to clear cart:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ success: false, error: 'Failed to clear cart' }, { status: 500 })
  }
}
