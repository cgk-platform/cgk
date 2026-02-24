/**
 * Terms of Service Page
 *
 * CGK Linens terms of service.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | CGK Linens',
  description: 'Terms of service for CGK Linens.',
}

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-store px-4 py-12">
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-cgk-navy md:text-4xl">
          Terms of Service
        </h1>

        <p className="mb-8 text-gray-500">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="space-y-8 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">Agreement to Terms</h2>
            <p className="mt-4">
              By accessing and using CGK Linens&apos; website and services, you agree to be bound by
              these Terms of Service. If you do not agree with any part of these terms, you may not
              access or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">Purchases and Payment</h2>
            <div className="mt-4 space-y-4">
              <p>When making a purchase, you agree that:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>You are authorized to use the payment method provided</li>
                <li>All information you provide is accurate and complete</li>
                <li>Prices are subject to change without notice</li>
                <li>We reserve the right to refuse or cancel orders</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">Shipping and Delivery</h2>
            <p className="mt-4">
              Shipping times are estimates only and not guarantees. We are not responsible for delays
              caused by carriers, customs, or circumstances beyond our control. Risk of loss passes to
              you upon delivery to the carrier. For full shipping details, see our{' '}
              <a href="/shipping" className="text-cgk-navy font-medium underline hover:no-underline">
                Shipping Information
              </a>{' '}
              page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">Returns and Refunds</h2>
            <p className="mt-4">
              Please refer to our{' '}
              <a href="/returns" className="text-cgk-navy font-medium underline hover:no-underline">
                Returns & Exchanges Policy
              </a>{' '}
              for information about returns, exchanges, and refunds. Items must be returned in their
              original condition within 30 days of delivery.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">Intellectual Property</h2>
            <p className="mt-4">
              All content on this website, including text, images, logos, and graphics, is the property
              of CGK Linens or its content suppliers and is protected by intellectual property laws.
              You may not use, reproduce, or distribute any content without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">User Accounts</h2>
            <div className="mt-4 space-y-4">
              <p>If you create an account with us, you are responsible for:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">Limitation of Liability</h2>
            <p className="mt-4">
              To the maximum extent permitted by law, CGK Linens shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising out of or related to your
              use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">Changes to Terms</h2>
            <p className="mt-4">
              We reserve the right to modify these terms at any time. Changes will be effective
              immediately upon posting to the website. Your continued use of our services constitutes
              acceptance of any modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cgk-navy">Contact Us</h2>
            <p className="mt-4">
              If you have questions about these Terms of Service, please{' '}
              <a href="/contact" className="text-cgk-navy font-medium underline hover:no-underline">
                contact us
              </a>.
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}
