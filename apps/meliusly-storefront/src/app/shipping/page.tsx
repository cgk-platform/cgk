import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Shipping Information',
  description: 'Learn about Meliusly shipping options, rates, and delivery times.',
}

export default function ShippingPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-8 text-4xl font-semibold text-[#161F2B]">
          Shipping Information
        </h1>

        <div className="space-y-8 text-[#777777]">
          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Free Shipping on All Orders
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We offer free standard shipping on all orders within the contiguous United States. No
              minimum purchase required.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Delivery Times
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Standard Shipping (Free)
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  5-7 business days from order date
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Expedited Shipping
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  2-3 business days - $29.99
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Express Shipping
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  1-2 business days - $49.99
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Processing Time
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              Orders are typically processed within 1-2 business days. You will receive a tracking
              number via email once your order ships.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              International Shipping
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              We currently ship to Canada and Mexico. International shipping rates and delivery
              times vary by location.
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Canada: 7-14 business days</li>
              <li>Mexico: 10-21 business days</li>
            </ul>
            <p className="font-manrope mt-4 text-[16px] leading-relaxed">
              Customs fees and duties are the responsibility of the recipient. Contact us for
              international shipping quotes.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Order Tracking
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              Once your order ships, you'll receive a tracking number via email. You can track your
              shipment directly through the carrier's website or contact our support team for
              assistance.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Shipping Carriers
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We ship via USPS, UPS, and FedEx depending on your location and selected shipping
              speed. Carrier selection is optimized for the fastest, most reliable delivery to your
              area.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Shipping Restrictions
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">We cannot ship to:</p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>PO Boxes (except via USPS)</li>
              <li>APO/FPO addresses (contact us for special arrangements)</li>
              <li>US territories (contact us for availability)</li>
            </ul>
          </section>

          <section className="rounded-lg bg-[#F8F9FA] p-6">
            <h2 className="font-manrope mb-3 text-xl font-semibold text-[#161F2B]">
              Need Help with Your Shipment?
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              Our customer support team is here to assist with any shipping questions or issues.
            </p>
            <a
              href="/contact"
              className="font-manrope inline-block rounded-lg bg-[#0268A0] px-6 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580]"
            >
              Contact Support
            </a>
          </section>
        </div>
      </div>
      <TraitsBar />
    </main>
  )
}
