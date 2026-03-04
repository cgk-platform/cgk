/**
 * Privacy Policy Page
 *
 * Fetches privacy policy from Shopify Shop API when available,
 * with fallback to static content.
 */

import type { Metadata } from 'next'

import { createStorefrontClient, getShopPolicies } from '@cgk-platform/shopify'
import { getTenantConfig } from '@/lib/tenant'
import Link from 'next/link'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  const tenantName = tenant?.name ?? 'Store'

  return {
    title: `Privacy Policy | ${tenantName}`,
    description: `Privacy policy for ${tenantName}.`,
  }
}

export const dynamic = 'force-dynamic'

export default async function PrivacyPolicyPage() {
  const shopifyContent = await fetchShopifyPolicy()

  return (
    <div className="mx-auto max-w-store px-4 py-12">
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-cgk-navy md:text-4xl">
          {shopifyContent?.title ?? 'Privacy Policy'}
        </h1>

        <p className="mb-8 text-gray-500">
          Last updated:{' '}
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        {shopifyContent ? (
          <div
            className="prose prose-gray prose-headings:text-cgk-navy prose-a:text-cgk-navy prose-a:underline hover:prose-a:no-underline max-w-none"
            dangerouslySetInnerHTML={{ __html: shopifyContent.body }}
          />
        ) : (
          <StaticPrivacyContent />
        )}
      </article>
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
    return policies.privacyPolicy
  } catch {
    return null
  }
}

function StaticPrivacyContent() {
  return (
    <div className="space-y-8 text-gray-600">
      <section>
        <h2 className="text-xl font-semibold text-cgk-navy">Introduction</h2>
        <p className="mt-4">
          We take your privacy seriously. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you visit our website and make purchases
          from our store.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-cgk-navy">Information We Collect</h2>
        <div className="mt-4 space-y-4">
          <p>We collect information you provide directly to us, such as:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Name, email address, and contact information</li>
            <li>Billing and shipping addresses</li>
            <li>Payment information (processed securely through our payment provider)</li>
            <li>Order history and preferences</li>
            <li>Communications you send to us</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-cgk-navy">How We Use Your Information</h2>
        <div className="mt-4 space-y-4">
          <p>We use the information we collect to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Process and fulfill your orders</li>
            <li>Send you order confirmations and shipping updates</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Send marketing communications (with your consent)</li>
            <li>Improve our website and services</li>
            <li>Detect and prevent fraud</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-cgk-navy">Information Sharing</h2>
        <p className="mt-4">
          We do not sell, trade, or rent your personal information to third parties. We may share
          your information with service providers who assist us in operating our website, conducting
          our business, or serving you, so long as those parties agree to keep this information
          confidential.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-cgk-navy">Data Security</h2>
        <p className="mt-4">
          We implement appropriate security measures to protect your personal information against
          unauthorized access, alteration, disclosure, or destruction. All payment transactions are
          encrypted using SSL technology.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-cgk-navy">Your Rights</h2>
        <div className="mt-4 space-y-4">
          <p>You have the right to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-cgk-navy">Contact Us</h2>
        <p className="mt-4">
          If you have questions about this Privacy Policy, please{' '}
          <Link href="/contact" className="font-medium text-cgk-navy underline hover:no-underline">
            contact us
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
