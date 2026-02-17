/**
 * Shipping Information Page
 *
 * Shipping policy and delivery information.
 */

import type { Metadata } from 'next'

import { Clock, Package, Truck, Globe } from 'lucide-react'

import { getTenantConfig } from '@/lib/tenant'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  return {
    title: 'Shipping Information',
    description: `Shipping and delivery information for ${tenant?.name ?? 'our store'}`,
  }
}

interface ShippingOption {
  name: string
  time: string
  cost: string
  description: string
}

const shippingOptions: ShippingOption[] = [
  {
    name: 'Standard Shipping',
    time: '5-7 business days',
    cost: '$5.99 (Free over $50)',
    description: 'Our most economical option for non-urgent orders.',
  },
  {
    name: 'Express Shipping',
    time: '2-3 business days',
    cost: '$12.99',
    description: 'Faster delivery when you need your order sooner.',
  },
  {
    name: 'Priority Shipping',
    time: '1-2 business days',
    cost: '$19.99',
    description: 'Our fastest option for urgent orders.',
  },
]

export default async function ShippingPage() {
  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight md:text-4xl">Shipping Information</h1>

        {/* Shipping Options */}
        <section>
          <h2 className="text-xl font-semibold">Shipping Options</h2>
          <div className="mt-6 space-y-4">
            {shippingOptions.map((option) => (
              <div
                key={option.name}
                className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{option.name}</h3>
                    <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                      {option.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[hsl(var(--portal-primary))]">
                      {option.cost}
                    </div>
                    <div className="text-sm text-[hsl(var(--portal-muted-foreground))]">
                      {option.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Processing Time */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Processing Time</h2>
          <div className="mt-4 flex items-start gap-4 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
              <Clock className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
            </div>
            <div>
              <h3 className="font-semibold">1-2 Business Days</h3>
              <p className="mt-1 text-[hsl(var(--portal-muted-foreground))]">
                Orders placed before 2 PM EST typically ship the same business day. Orders placed after
                2 PM or on weekends/holidays will ship the next business day.
              </p>
            </div>
          </div>
        </section>

        {/* Tracking */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Order Tracking</h2>
          <div className="mt-4 flex items-start gap-4 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
              <Package className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
            </div>
            <div>
              <p className="text-[hsl(var(--portal-muted-foreground))]">
                Once your order ships, you&apos;ll receive an email with tracking information. You can
                also track your order by logging into your account and viewing your order history.
              </p>
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Delivery Information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10">
                <Truck className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
              </div>
              <div>
                <h3 className="font-semibold">Domestic Shipping</h3>
                <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                  We ship to all 50 US states including Alaska and Hawaii.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--portal-muted-foreground))]/10">
                <Globe className="h-5 w-5 text-[hsl(var(--portal-muted-foreground))]" />
              </div>
              <div>
                <h3 className="font-semibold">International Shipping</h3>
                <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                  Coming soon! We&apos;re working on expanding to international destinations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Shipping FAQ</h2>
          <div className="mt-4 space-y-4 text-[hsl(var(--portal-muted-foreground))]">
            <div>
              <h3 className="font-medium text-[hsl(var(--portal-foreground))]">
                Can I change my shipping address after ordering?
              </h3>
              <p className="mt-1">
                If your order hasn&apos;t shipped yet, please contact us immediately and we&apos;ll do
                our best to update the address. Once shipped, the address cannot be changed.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-[hsl(var(--portal-foreground))]">
                What if my package is lost or damaged?
              </h3>
              <p className="mt-1">
                Please contact our support team within 7 days of the expected delivery date. We&apos;ll
                work with the carrier to locate your package or arrange a replacement.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-[hsl(var(--portal-foreground))]">
                Do you ship to PO Boxes?
              </h3>
              <p className="mt-1">
                Yes, we can ship to PO Boxes via USPS. However, express and priority shipping options
                are not available for PO Box addresses.
              </p>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="mt-12 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-8 text-center">
          <h2 className="text-xl font-semibold">Have more questions?</h2>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            Our customer service team is happy to help with any shipping inquiries.
          </p>
          <a
            href="/contact"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3 font-medium text-white transition-all hover:bg-[hsl(var(--portal-primary))]/90"
          >
            Contact Us
          </a>
        </section>
      </div>
    </div>
  )
}
