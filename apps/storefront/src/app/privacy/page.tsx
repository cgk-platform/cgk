/**
 * Privacy Policy Page
 *
 * Static placeholder for privacy policy - tenant should customize via CMS.
 */

import type { Metadata } from 'next'

import { getTenantConfig } from '@/lib/tenant'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  return {
    title: 'Privacy Policy',
    description: `Privacy policy for ${tenant?.name ?? 'our store'}`,
  }
}

export default async function PrivacyPolicyPage() {
  const tenant = await getTenantConfig()
  const storeName = tenant?.name ?? 'Our Store'

  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p className="text-lg text-[hsl(var(--portal-muted-foreground))]">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Introduction</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              At {storeName}, we take your privacy seriously. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you visit our website and make purchases
              from our store.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Information We Collect</h2>
            <div className="mt-4 space-y-4 text-[hsl(var(--portal-muted-foreground))]">
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

          <section className="mt-8">
            <h2 className="text-xl font-semibold">How We Use Your Information</h2>
            <div className="mt-4 space-y-4 text-[hsl(var(--portal-muted-foreground))]">
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

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Information Sharing</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              We do not sell, trade, or rent your personal information to third parties. We may share
              your information with service providers who assist us in operating our website, conducting
              our business, or serving you, so long as those parties agree to keep this information
              confidential.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Data Security</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              We implement appropriate security measures to protect your personal information against
              unauthorized access, alteration, disclosure, or destruction. All payment transactions are
              encrypted using SSL technology.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Your Rights</h2>
            <div className="mt-4 space-y-4 text-[hsl(var(--portal-muted-foreground))]">
              <p>You have the right to:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              If you have questions about this Privacy Policy, please{' '}
              <a href="/contact" className="text-[hsl(var(--portal-primary))] underline hover:no-underline">
                contact us
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}
