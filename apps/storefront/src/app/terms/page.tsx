/**
 * Terms of Service Page
 *
 * Static placeholder for terms of service - tenant should customize via CMS.
 */

import type { Metadata } from 'next'

import { getTenantConfig } from '@/lib/tenant'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  return {
    title: 'Terms of Service',
    description: `Terms of service for ${tenant?.name ?? 'our store'}`,
  }
}

export default async function TermsOfServicePage() {
  const tenant = await getTenantConfig()
  const storeName = tenant?.name ?? 'Our Store'

  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl">Terms of Service</h1>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p className="text-lg text-[hsl(var(--portal-muted-foreground))]">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Agreement to Terms</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              By accessing and using {storeName}&apos;s website and services, you agree to be bound by
              these Terms of Service. If you do not agree with any part of these terms, you may not
              access or use our services.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Purchases and Payment</h2>
            <div className="mt-4 space-y-4 text-[hsl(var(--portal-muted-foreground))]">
              <p>When making a purchase, you agree that:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>You are authorized to use the payment method provided</li>
                <li>All information you provide is accurate and complete</li>
                <li>Prices are subject to change without notice</li>
                <li>We reserve the right to refuse or cancel orders</li>
              </ul>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Shipping and Delivery</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              Shipping times are estimates only and not guarantees. We are not responsible for delays
              caused by carriers, customs, or circumstances beyond our control. Risk of loss passes to
              you upon delivery to the carrier.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Returns and Refunds</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              Please refer to our{' '}
              <a href="/returns" className="text-[hsl(var(--portal-primary))] underline hover:no-underline">
                Returns Policy
              </a>{' '}
              for information about returns, exchanges, and refunds. Items must be returned in their
              original condition within the specified return window.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Intellectual Property</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              All content on this website, including text, images, logos, and graphics, is the property
              of {storeName} or its content suppliers and is protected by intellectual property laws.
              You may not use, reproduce, or distribute any content without prior written permission.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">User Accounts</h2>
            <div className="mt-4 space-y-4 text-[hsl(var(--portal-muted-foreground))]">
              <p>If you create an account with us, you are responsible for:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Limitation of Liability</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              To the maximum extent permitted by law, {storeName} shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising out of or related to your
              use of our services.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Changes to Terms</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              We reserve the right to modify these terms at any time. Changes will be effective
              immediately upon posting to the website. Your continued use of our services constitutes
              acceptance of any modified terms.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Contact Us</h2>
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              If you have questions about these Terms of Service, please{' '}
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
