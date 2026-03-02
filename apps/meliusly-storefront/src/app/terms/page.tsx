import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Meliusly terms of service and conditions of use.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-4 text-4xl font-semibold text-[#161F2B]">
          Terms of Service
        </h1>
        <p className="font-manrope mb-8 text-[16px] leading-relaxed text-[#777777]">
          Last updated: March 2, 2026
        </p>

        <div className="space-y-8 text-[#777777]">
          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              1. Acceptance of Terms
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              By accessing and using Meliusly.com, you accept and agree to be bound by these Terms
              of Service. If you do not agree to these terms, please do not use our website or
              purchase our products.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              2. Use of Website
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              You agree to use this website only for lawful purposes and in a way that does not
              infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the
              website.
            </p>
            <p className="font-manrope text-[16px] leading-relaxed">
              Prohibited activities include but are not limited to: harassment, causing distress or
              inconvenience, transmitting obscene or offensive content, or disrupting the normal
              flow of dialogue within our website.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              3. Product Information
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We strive to provide accurate product descriptions, specifications, and pricing.
              However, we do not warrant that product descriptions or other content on this website
              is accurate, complete, reliable, current, or error-free. We reserve the right to
              correct any errors, inaccuracies, or omissions and to change or update information at
              any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              4. Pricing and Payment
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              All prices are in U.S. dollars and are subject to change without notice. We accept
              major credit cards and other payment methods as indicated at checkout. Payment must be
              received in full before products are shipped.
            </p>
            <p className="font-manrope text-[16px] leading-relaxed">
              In the event of a pricing error, we reserve the right to cancel any orders placed for
              products listed at the incorrect price.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              5. Orders and Fulfillment
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              Receipt of an order confirmation does not constitute acceptance of an order. We
              reserve the right to refuse or cancel any order for any reason, including but not
              limited to: product availability, errors in product or pricing information, or
              suspected fraudulent activity.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              6. Intellectual Property
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              All content on this website, including text, graphics, logos, images, and software, is
              the property of Meliusly or its content suppliers and is protected by U.S. and
              international copyright laws. You may not reproduce, distribute, modify, or create
              derivative works from any content without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              7. Limitation of Liability
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              Meliusly shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages, including without limitation, loss of profits, data, use, goodwill,
              or other intangible losses, resulting from your access to or use of or inability to
              access or use our products or services.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              8. Product Use and Safety
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              Our products are designed for residential use only. Commercial use may void the
              warranty. You agree to:
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Follow all installation instructions carefully</li>
              <li>Use products only as intended</li>
              <li>Maintain products according to provided guidelines</li>
              <li>Ensure proper installation before use</li>
            </ul>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              9. Modifications to Terms
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. Changes will be
              effective immediately upon posting to the website. Your continued use of the website
              following the posting of changes constitutes your acceptance of such changes.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              10. Governing Law
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              These Terms of Service shall be governed by and construed in accordance with the laws
              of the United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              11. Contact Information
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="rounded-lg bg-[#F8F9FA] p-4">
              <p className="font-manrope text-[16px] leading-relaxed">
                <strong>Email:</strong> support@meliusly.com
              </p>
              <p className="font-manrope text-[16px] leading-relaxed">
                <strong>Mail:</strong> Meliusly, LLC
              </p>
            </div>
          </section>
        </div>
      </div>
      <TraitsBar />
    </main>
  )
}
