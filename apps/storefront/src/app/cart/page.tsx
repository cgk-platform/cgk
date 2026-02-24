/**
 * Cart Page
 *
 * Full-page cart view with line items and checkout flow.
 * CGK-branded with navy accents.
 */

import type { Metadata } from 'next'
import Link from 'next/link'

import { getCurrentCart } from '@/lib/cart/actions'
import { getTenantConfig } from '@/lib/tenant'

import { CartPageContent } from './components'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()

  return {
    title: `Your Cart | ${tenant?.name ?? 'CGK Linens'}`,
    description: 'Review your cart and checkout',
  }
}

export default async function CartPage() {
  const [cart, tenant] = await Promise.all([
    getCurrentCart(),
    getTenantConfig(),
  ])

  return (
    <div className="min-h-[60vh]">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-cgk-light-blue/10">
        <div className="mx-auto max-w-store px-4 py-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-cgk-navy transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="font-medium text-cgk-navy">Cart</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Cart Content */}
      <div className="mx-auto max-w-store px-4 py-8 md:py-12">
        <CartPageContent initialCart={cart} tenantSlug={tenant?.slug ?? 'unknown'} />
      </div>
    </div>
  )
}
