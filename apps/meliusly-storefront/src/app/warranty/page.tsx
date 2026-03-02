import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Warranty Policy',
  description: 'Learn about Meliusly warranty coverage and terms.',
}

export default function WarrantyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-8 text-4xl font-semibold text-[#161F2B]">Warranty Policy</h1>

        <div className="space-y-8 text-[#777777]">
          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Limited Lifetime Warranty
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              Meliusly stands behind the quality of our products. All Meliusly support systems are
              covered by our Limited Lifetime Warranty against defects in materials and workmanship
              under normal use.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              What's Covered
            </h2>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Structural integrity of support bars and frames</li>
              <li>Manufacturing defects in materials</li>
              <li>Workmanship defects in assembly</li>
              <li>Metal fatigue or breakage under normal use</li>
            </ul>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              What's Not Covered
            </h2>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Damage from misuse, abuse, or improper installation</li>
              <li>Normal wear and tear</li>
              <li>Damage from alterations or modifications</li>
              <li>Commercial or non-residential use</li>
              <li>Damage during shipping or after delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              How to Make a Claim
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              To submit a warranty claim, please contact our customer support team with:
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Your order number and date of purchase</li>
              <li>Photos of the defect or damage</li>
              <li>A detailed description of the issue</li>
            </ul>
            <p className="font-manrope mt-4 text-[16px] leading-relaxed">
              Our team will review your claim within 2-3 business days and provide instructions for
              repair or replacement.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Warranty Transferability
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              This warranty is non-transferable and applies only to the original purchaser of the
              product. Proof of purchase is required for all warranty claims.
            </p>
          </section>

          <section className="rounded-lg bg-[#F8F9FA] p-6">
            <h2 className="font-manrope mb-3 text-xl font-semibold text-[#161F2B]">
              Questions About Your Warranty?
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              Our US-based customer support team is here to help.
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
