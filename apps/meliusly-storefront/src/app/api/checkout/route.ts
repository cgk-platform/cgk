import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createStorefrontClient } from '@cgk-platform/shopify'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CartItem {
  variantId: string
  quantity: number
}

interface CheckoutRequest {
  items: CartItem[]
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

    // Get tenant/shop domain from headers or environment
    // For now, use the environment variable for the shop domain
    const shopDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'meliusly.myshopify.com'
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

    if (!storefrontToken) {
      console.error('Missing Shopify Storefront Access Token')
      return NextResponse.json(
        { success: false, error: 'Checkout configuration error' },
        { status: 500 }
      )
    }

    // Create Shopify Storefront API client
    const storefront = createStorefrontClient({
      storeDomain: shopDomain,
      storefrontAccessToken: storefrontToken,
    })

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

    // Execute mutation
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

    const response = await storefront.query<CartCreateResponse>(mutation, variables)

    if (response.cartCreate.userErrors.length > 0) {
      const errors = response.cartCreate.userErrors
      console.error('Shopify cart creation errors:', errors)
      return NextResponse.json(
        {
          success: false,
          error: errors[0].message || 'Failed to create checkout',
        },
        { status: 400 }
      )
    }

    const cart = response.cartCreate.cart

    if (!cart || !cart.checkoutUrl) {
      console.error('No checkout URL returned from Shopify')
      return NextResponse.json(
        { success: false, error: 'Failed to create checkout' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: cart.checkoutUrl,
      cartId: cart.id,
    })
  } catch (error) {
    console.error('Checkout API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout',
      },
      { status: 500 }
    )
  }
}
