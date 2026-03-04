/**
 * Returns & Exchanges Page
 *
 * Fetches refund policy from Shopify Shop API when available,
 * with fallback to static content.
 */

import type { Metadata } from 'next'

import { CheckCircle, Clock, Package, RefreshCcw, XCircle } from 'lucide-react'

import { createStorefrontClient, getShopPolicies } from '@cgk-platform/shopify'
import { getTenantConfig } from '@/lib/tenant'
import Link from 'next/link'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  const tenantName = tenant?.name ?? 'Store'

  return {
    title: `Returns & Exchanges | ${tenantName}`,
    description: `${tenantName} 30-day hassle-free returns. If you're not satisfied, we'll make it right.`,
  }
}

export const dynamic = 'force-dynamic'

export default async function ReturnsPage() {
  const shopifyContent = await fetchShopifyPolicy()

  return (
    <div className="mx-auto max-w-store px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-cgk-navy md:text-4xl">
          {shopifyContent?.title ?? 'Returns & Exchanges'}
        </h1>

        {shopifyContent ? (
          <div
            className="prose prose-gray prose-headings:text-cgk-navy prose-a:text-cgk-navy prose-a:underline hover:prose-a:no-underline max-w-none"
            dangerouslySetInnerHTML={{ __html: shopifyContent.body }}
          />
        ) : (
          <StaticReturnsContent />
        )}
      </div>
    </div>
  )
}

async function fetchShopifyPolicy() {
  try {
    const config = await getTenantConfig()
    if (!config?.shopify) return null

    const client = createStorefrontClient({
      storeDomain: config.shopify.storeDomain,
      storefrontAccessToken: config.shopify.storefrontAccessToken,
    })

    const policies = await getShopPolicies(client)
    return policies.refundPolicy
  } catch {
    return null
  }
}

function StaticReturnsContent() {
  return (
    <>
      {/* Policy Overview */}
      <section className="rounded-lg border border-cgk-navy/10 bg-cgk-navy/5 p-6">
        <div className="flex items-center gap-3">
          <RefreshCcw className="h-6 w-6 text-cgk-navy" />
          <h2 className="text-xl font-semibold text-cgk-navy">30-Day Hassle-Free Returns</h2>
        </div>
        <p className="mt-3 text-gray-600">
          We want you to love your purchase! If you&apos;re not completely satisfied, you can return
          most items within 30 days of delivery for a full refund or exchange. No questions asked.
        </p>
      </section>

      {/* Return Eligibility */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-cgk-navy">Return Eligibility</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <h3 className="font-semibold">Eligible for Return</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-green-700">
              <li>Items in original, unused condition</li>
              <li>Items with all original tags attached</li>
              <li>Items in original packaging</li>
              <li>Items returned within 30 days</li>
            </ul>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <h3 className="font-semibold">Not Eligible</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-red-700">
              <li>Personalized or custom items</li>
              <li>Final sale items</li>
              <li>Items worn, washed, or altered</li>
              <li>Items without original packaging</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How to Return */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-cgk-navy">How to Start a Return</h2>

        <div className="mt-6 space-y-4">
          {[
            {
              step: 1,
              title: 'Log into Your Account',
              description: 'Go to your account and find the order you want to return.',
            },
            {
              step: 2,
              title: 'Start Return Request',
              description: 'Click "Start Return" on the item and select your reason for returning.',
            },
            {
              step: 3,
              title: 'Print Shipping Label',
              description: 'Print the prepaid return label and attach it to your package.',
            },
            {
              step: 4,
              title: 'Ship Your Return',
              description: 'Drop off your package at any UPS or USPS location.',
            },
          ].map((step) => (
            <div key={step.step} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cgk-navy text-sm font-bold text-white">
                {step.step}
              </div>
              <div className="flex-1 border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Refund Information */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-cgk-navy">Refund Information</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cgk-navy/10">
              <Package className="h-5 w-5 text-cgk-navy" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Processing Time</h3>
              <p className="mt-1 text-sm text-gray-600">
                Refunds are processed within 3-5 business days of receiving your return.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cgk-navy/10">
              <Clock className="h-5 w-5 text-cgk-navy" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Bank Processing</h3>
              <p className="mt-1 text-sm text-gray-600">
                It may take an additional 3-5 business days for the refund to appear.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Exchanges */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-cgk-navy">Exchanges</h2>
        <div className="mt-4 space-y-4 text-gray-600">
          <p>
            Need a different size or color? Start an exchange through your account. If the new item
            costs more, you&apos;ll be charged the difference. If it costs less, you&apos;ll receive
            a refund for the difference.
          </p>
          <p>
            Exchange items ship as soon as your return is received and inspected. Express shipping
            upgrades are available.
          </p>
        </div>
      </section>

      {/* Damaged Items */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-cgk-navy">Damaged or Defective Items</h2>
        <p className="mt-4 text-gray-600">
          Received a damaged or defective item? Contact us within 48 hours of delivery with photos
          of the damage. We&apos;ll arrange a replacement or refund at no cost to you, including
          free return shipping.
        </p>
      </section>

      {/* Contact CTA */}
      <section className="mt-12 rounded-lg bg-cgk-light-blue/30 p-8 text-center">
        <h2 className="text-xl font-semibold text-cgk-navy">Need Help?</h2>
        <p className="mt-2 text-gray-600">
          Our customer service team is here to help with any return or exchange questions.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-btn bg-cgk-navy px-6 py-3 font-medium text-white transition-all hover:bg-cgk-navy/90"
          >
            Contact Support
          </Link>
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center rounded-btn border border-cgk-navy px-6 py-3 font-medium text-cgk-navy transition-all hover:bg-cgk-navy hover:text-white"
          >
            View Orders
          </Link>
        </div>
      </section>
    </>
  )
}
