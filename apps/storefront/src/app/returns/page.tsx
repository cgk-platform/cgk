/**
 * Returns & Exchanges Page
 *
 * Return policy and instructions.
 */

import type { Metadata } from 'next'

import { ArrowRight, CheckCircle, Clock, Package, RefreshCcw, XCircle } from 'lucide-react'

import { getTenantConfig } from '@/lib/tenant'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  return {
    title: 'Returns & Exchanges',
    description: `Return and exchange policy for ${tenant?.name ?? 'our store'}`,
  }
}

export default async function ReturnsPage() {
  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl">Returns & Exchanges</h1>

        {/* Policy Overview */}
        <section className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-primary))]/5 p-6">
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-6 w-6 text-[hsl(var(--portal-primary))]" />
            <h2 className="text-xl font-semibold">30-Day Return Policy</h2>
          </div>
          <p className="mt-3 text-[hsl(var(--portal-muted-foreground))]">
            We want you to love your purchase! If you&apos;re not completely satisfied, you can return
            most items within 30 days of delivery for a full refund or exchange.
          </p>
        </section>

        {/* Return Eligibility */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Return Eligibility</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <h3 className="font-semibold">Eligible for Return</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-green-700 dark:text-green-300">
                <li>Items in original, unused condition</li>
                <li>Items with all original tags attached</li>
                <li>Items in original packaging</li>
                <li>Items returned within 30 days</li>
              </ul>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                <h3 className="font-semibold">Not Eligible</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-red-700 dark:text-red-300">
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
          <h2 className="text-xl font-semibold">How to Start a Return</h2>

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
                description:
                  'Click "Start Return" on the item and select your reason for returning.',
              },
              {
                step: 3,
                title: 'Print Shipping Label',
                description: 'Print the prepaid return label and attach it to your package.',
              },
              {
                step: 4,
                title: 'Ship Your Return',
                description: 'Drop off your package at any UPS location.',
              },
            ].map((step, index) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))] text-sm font-bold text-white">
                  {step.step}
                </div>
                <div className="flex-1 border-b border-[hsl(var(--portal-border))] pb-4">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                    {step.description}
                  </p>
                </div>
                {index < 3 && (
                  <ArrowRight className="mt-2 hidden h-4 w-4 text-[hsl(var(--portal-muted-foreground))] sm:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Refund Information */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Refund Information</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
                <Package className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
              </div>
              <div>
                <h3 className="font-semibold">Processing Time</h3>
                <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                  Refunds are processed within 3-5 business days of receiving your return.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
                <Clock className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
              </div>
              <div>
                <h3 className="font-semibold">Bank Processing</h3>
                <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                  It may take an additional 3-5 business days for the refund to appear.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Exchanges */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Exchanges</h2>
          <div className="mt-4 space-y-4 text-[hsl(var(--portal-muted-foreground))]">
            <p>
              Need a different size or color? Start an exchange through your account. If the new item
              costs more, you&apos;ll be charged the difference. If it costs less, you&apos;ll receive
              a refund for the difference.
            </p>
            <p>
              Exchange items ship as soon as your return is received and inspected. Express shipping
              upgrades are available at checkout.
            </p>
          </div>
        </section>

        {/* Damaged Items */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Damaged or Defective Items</h2>
          <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
            Received a damaged or defective item? Contact us within 48 hours of delivery with photos
            of the damage. We&apos;ll arrange a replacement or refund at no cost to you, including
            free return shipping.
          </p>
        </section>

        {/* Contact CTA */}
        <section className="mt-12 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-8 text-center">
          <h2 className="text-xl font-semibold">Need Help?</h2>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            Our customer service team is here to help with any return or exchange questions.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3 font-medium text-white transition-all hover:bg-[hsl(var(--portal-primary))]/90"
            >
              Contact Support
            </a>
            <a
              href="/account/orders"
              className="inline-flex items-center justify-center rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] px-6 py-3 font-medium transition-all hover:bg-[hsl(var(--portal-muted))]"
            >
              View Orders
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
