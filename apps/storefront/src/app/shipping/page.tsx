/**
 * Shipping Information Page
 *
 * CGK Linens shipping policy and delivery info.
 */

import type { Metadata } from 'next'

import { Clock, Package, Truck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Shipping Information | CGK Linens',
  description: 'Free 3-day delivery on orders over $50. Learn about CGK Linens shipping options and delivery times.',
}

export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-store px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-cgk-navy md:text-4xl">
          Shipping Information
        </h1>
        <p className="mb-8 text-gray-600">Everything you need to know about CGK Linens delivery.</p>

        {/* Free Shipping Banner */}
        <div className="mb-10 rounded-lg bg-cgk-gold/10 border border-cgk-gold/20 p-6 text-center">
          <p className="text-lg font-bold text-cgk-navy">
            FREE 3-DAY DELIVERY ON ORDERS OVER $50
          </p>
          <p className="mt-1 text-sm text-gray-600">
            No code needed — applied automatically at checkout.
          </p>
        </div>

        {/* Shipping Options */}
        <section>
          <h2 className="text-xl font-semibold text-cgk-navy">Shipping Options</h2>
          <div className="mt-6 space-y-4">
            {[
              {
                name: 'Standard Shipping',
                time: '5-7 business days',
                cost: 'Free on orders over $50 · $5.99 otherwise',
                description: 'Our most popular shipping option.',
              },
              {
                name: 'Express Shipping',
                time: '2-3 business days',
                cost: '$12.99',
                description: 'Need it sooner? Express gets it to you fast.',
              },
            ].map((option) => (
              <div
                key={option.name}
                className="rounded-lg border border-gray-200 bg-white p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{option.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{option.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-cgk-navy">{option.cost}</div>
                    <div className="text-sm text-gray-500">{option.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Processing Time */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-cgk-navy">Processing Time</h2>
          <div className="mt-4 flex items-start gap-4 rounded-lg bg-cgk-light-blue/20 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cgk-navy/10">
              <Clock className="h-5 w-5 text-cgk-navy" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">1-2 Business Days</h3>
              <p className="mt-1 text-gray-600">
                Orders placed before 2 PM EST typically ship the same business day. Orders placed after
                2 PM or on weekends/holidays will ship the next business day.
              </p>
            </div>
          </div>
        </section>

        {/* Tracking */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-cgk-navy">Order Tracking</h2>
          <div className="mt-4 flex items-start gap-4 rounded-lg bg-cgk-light-blue/20 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cgk-navy/10">
              <Package className="h-5 w-5 text-cgk-navy" />
            </div>
            <div>
              <p className="text-gray-600">
                Once your order ships, you&apos;ll receive an email with tracking information. You can
                also track your order by logging into your account and viewing your order history.
              </p>
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-cgk-navy">Delivery Information</h2>
          <div className="mt-4 flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cgk-navy/10">
              <Truck className="h-5 w-5 text-cgk-navy" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Domestic Shipping</h3>
              <p className="mt-1 text-sm text-gray-600">
                We ship to all 50 US states including Alaska and Hawaii via USPS, UPS, and FedEx.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-cgk-navy">Shipping FAQ</h2>
          <div className="mt-4 space-y-4 text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900">
                Can I change my shipping address after ordering?
              </h3>
              <p className="mt-1">
                If your order hasn&apos;t shipped yet, please contact us immediately and we&apos;ll do
                our best to update the address. Once shipped, the address cannot be changed.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">
                What if my package is lost or damaged?
              </h3>
              <p className="mt-1">
                Please contact our support team within 7 days of the expected delivery date. We&apos;ll
                work with the carrier to locate your package or arrange a replacement.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">
                Do you ship to PO Boxes?
              </h3>
              <p className="mt-1">
                Yes, we can ship to PO Boxes via USPS. However, express shipping options
                are not available for PO Box addresses.
              </p>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="mt-12 rounded-lg bg-cgk-light-blue/30 p-8 text-center">
          <h2 className="text-xl font-semibold text-cgk-navy">Have more questions?</h2>
          <p className="mt-2 text-gray-600">
            Our customer service team is happy to help with any shipping inquiries.
          </p>
          <a
            href="/contact"
            className="mt-4 inline-flex items-center justify-center rounded-btn bg-cgk-navy px-6 py-3 font-medium text-white transition-all hover:bg-cgk-navy/90"
          >
            Contact Us
          </a>
        </section>
      </div>
    </div>
  )
}
