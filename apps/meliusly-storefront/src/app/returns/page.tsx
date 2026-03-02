import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Returns Policy',
  description: 'Learn about Meliusly returns, refunds, and exchanges.',
}

export default function ReturnsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-8 text-4xl font-semibold text-[#161F2B]">Returns Policy</h1>

        <div className="space-y-8 text-[#777777]">
          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              30-Day Money-Back Guarantee
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We want you to be completely satisfied with your purchase. If you're not happy with
              your Meliusly support system for any reason, you can return it within 30 days of
              delivery for a full refund.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Return Requirements
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              To be eligible for a return:
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Product must be returned within 30 days of delivery</li>
              <li>Product must be in its original condition</li>
              <li>All hardware and parts must be included</li>
              <li>Original packaging is preferred but not required</li>
            </ul>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              How to Start a Return
            </h2>
            <div className="space-y-4">
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 1: Contact Us
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Email our customer support team with your order number and reason for return.
                </p>
              </div>
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 2: Receive RMA Number
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  We'll issue a Return Merchandise Authorization (RMA) number and provide return
                  shipping instructions.
                </p>
              </div>
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 3: Ship the Product
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Package the product securely and ship it to the address provided. Include your RMA
                  number on the package.
                </p>
              </div>
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 4: Receive Your Refund
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Once we receive and inspect your return, we'll process your refund within 5-7
                  business days.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Return Shipping
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              Return shipping costs are the responsibility of the customer unless the return is due
              to our error or a defective product.
            </p>
            <p className="font-manrope text-[16px] leading-relaxed">
              We recommend using a trackable shipping method and purchasing shipping insurance. We
              cannot be held responsible for items lost or damaged during return shipment.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Refund Method
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              Refunds will be issued to the original payment method used for the purchase. Please
              allow 5-10 business days for the refund to appear on your statement, depending on your
              financial institution.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">Exchanges</h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We currently do not offer direct exchanges. If you need a different size or product,
              please return your original item for a refund and place a new order.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Defective or Damaged Products
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              If you receive a defective or damaged product:
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Contact us immediately with photos of the damage</li>
              <li>We'll arrange for a free return or replacement</li>
              <li>Return shipping will be covered by us</li>
              <li>Replacement products ship within 1-2 business days</li>
            </ul>
          </section>

          <section className="rounded-lg bg-[#F8F9FA] p-6">
            <h2 className="font-manrope mb-3 text-xl font-semibold text-[#161F2B]">
              Questions About Returns?
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              Our customer support team is here to make the return process as easy as possible.
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
