import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromDomain } from '@/lib/tenant-resolution'
import { getShopifyClientForTenant } from '@/lib/shopify-from-database'
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({
  meta: { service: 'meliusly-storefront', component: 'checkout-api' }
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CartItem {
  variantId: string
  quantity: number
}

interface CheckoutRequest {
  items: CartItem[]
}

interface CartCreateResponse {
  cartCreate: {
    cart: {
      id: string
      checkoutUrl: string
      lines: {
        edges: Array<{
          node: {
            id: string
            quantity: number
            merchandise: {
              id: string
              title: string
            }
          }
        }>
      }
    }
    userErrors: Array<{
      field: string[]
      message: string
    }>
  }
}

/**
 * POST /api/checkout
 * Creates a Shopify cart and returns the checkout URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutRequest

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 })
    }

    // Resolve tenant from domain (CONSISTENT WITH REST OF APP)
    const host = request.headers.get('host') || 'localhost:3300'
    const tenant = await resolveTenantFromDomain(host)

    logger.info('[Checkout API] Creating cart', {
      tenantId: tenant.id,
      itemCount: body.items.length,
      host
    })

    // Get Shopify client (Hydrogen React with dual token source)
    // NOW USES DATABASE TOKEN - consistent with products/collections APIs
    const shopify = await getShopifyClientForTenant(tenant.id)

    // Build cart lines for Shopify
    const lines = body.items.map((item) => ({
      merchandiseId: item.variantId,
      quantity: item.quantity,
    }))

    // Create cart mutation
    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const variables = {
      input: {
        lines,
      },
    }

    // Execute mutation using Hydrogen React query method
    const { data, errors: graphqlErrors } = await shopify.query<CartCreateResponse>(
      mutation,
      variables
    )

    if (graphqlErrors) {
      logger.error('[Checkout API] GraphQL errors', undefined, { errors: graphqlErrors })
      return NextResponse.json(
        {
          success: false,
          error: 'GraphQL query failed',
          details: graphqlErrors
        },
        { status: 500 }
      )
    }

    if (data.cartCreate.userErrors.length > 0) {
      const errors = data.cartCreate.userErrors
      logger.error('[Checkout API] Cart creation errors', undefined, { errors })
      return NextResponse.json(
        {
          success: false,
          error: errors[0].message || 'Failed to create checkout'
        },
        { status: 400 }
      )
    }

    const cart = data.cartCreate.cart

    if (!cart || !cart.checkoutUrl) {
      logger.error('[Checkout API] No checkout URL returned', undefined)
      return NextResponse.json(
        { success: false, error: 'Failed to create checkout' },
        { status: 500 }
      )
    }

    logger.info('[Checkout API] Cart created successfully', {
      cartId: cart.id,
      tokenSource: shopify._metadata.tokenSource
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: cart.checkoutUrl,
      cartId: cart.id,
      tokenSource: shopify._metadata.tokenSource
    })
  } catch (error) {
    logger.error(
      '[Checkout API] Failed',
      error instanceof Error ? error : undefined,
      {
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
    )
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout'
      },
      { status: 500 }
    )
  }
}
