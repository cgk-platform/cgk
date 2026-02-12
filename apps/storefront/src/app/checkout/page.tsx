/**
 * Custom Checkout Page
 *
 * Multi-step checkout flow for custom commerce provider.
 * This page only renders when commerce.provider = 'custom'.
 * For Shopify provider, users are redirected to Shopify checkout.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentCart } from '@/lib/cart/actions'
import { getCommerceProviderType, getTenantConfig } from '@/lib/tenant'

import { CheckoutContent } from './components'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()

  return {
    title: `Checkout | ${tenant?.name ?? 'Store'}`,
    description: 'Complete your purchase securely',
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function CheckoutPage() {
  const [cart, providerType, tenant] = await Promise.all([
    getCurrentCart(),
    getCommerceProviderType(),
    getTenantConfig(),
  ])

  // If using Shopify provider, redirect to cart (checkout is via Shopify)
  if (providerType === 'shopify') {
    if (cart?.checkoutUrl) {
      redirect(cart.checkoutUrl)
    }
    redirect('/cart')
  }

  // If no cart or empty cart, redirect to cart page
  if (!cart || cart.lines.length === 0) {
    redirect('/cart')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <CheckoutContent
        cart={cart}
        tenantSlug={tenant?.slug ?? 'unknown'}
        tenantName={tenant?.name ?? 'Store'}
      />
    </div>
  )
}
