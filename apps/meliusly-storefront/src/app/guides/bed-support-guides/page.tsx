import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Bed Support Guides',
  description:
    'Comprehensive guides for selecting and using Meliusly bed support solutions for maximum comfort.',
}

export default function BedSupportGuidesPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-4 text-4xl font-semibold text-[#161F2B]">
          Bed Support Guides
        </h1>
        <p className="font-manrope mb-12 text-[18px] leading-relaxed text-[#777777]">
          Complete resource for understanding and optimizing bed support systems for sleeper sofas
          and convertible furniture.
        </p>

        <div className="space-y-12">
          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Understanding Bed Support
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope text-[16px] leading-relaxed">
                Proper bed support is crucial for comfort, spinal alignment, and restful sleep.
                Traditional sleeper sofas use thin metal bars that create pressure points and
                uncomfortable sleeping surfaces.
              </p>
              <p className="font-manrope text-[16px] leading-relaxed">
                Meliusly support systems replace these bars with engineered solutions that
                distribute weight evenly across the entire sleeping surface, eliminating pressure
                points and providing firm, supportive comfort.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Types of Support Systems
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-6">
                <h3 className="font-manrope mb-3 text-xl font-semibold text-[#161F2B]">
                  Bar Replacement Systems
                </h3>
                <p className="font-manrope mb-3 text-[16px] leading-relaxed text-[#777777]">
                  Our most popular option. Completely replaces the uncomfortable metal bar with a
                  wide, flat support surface.
                </p>
                <div className="font-manrope text-sm text-[#777777]">
                  <p className="mb-1">
                    <strong>Best for:</strong> Standard sleeper sofas with prominent metal bars
                  </p>
                  <p className="mb-1">
                    <strong>Firmness:</strong> Medium-firm to firm
                  </p>
                  <p>
                    <strong>Installation:</strong> 20-30 minutes
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-6">
                <h3 className="font-manrope mb-3 text-xl font-semibold text-[#161F2B]">
                  Full Frame Support Systems
                </h3>
                <p className="font-manrope mb-3 text-[16px] leading-relaxed text-[#777777]">
                  Comprehensive support across the entire frame, ideal for older sleeper sofas or
                  those with weak frame construction.
                </p>
                <div className="font-manrope text-sm text-[#777777]">
                  <p className="mb-1">
                    <strong>Best for:</strong> Older sleeper sofas, heavy users
                  </p>
                  <p className="mb-1">
                    <strong>Firmness:</strong> Extra firm
                  </p>
                  <p>
                    <strong>Installation:</strong> 30-45 minutes
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-6">
                <h3 className="font-manrope mb-3 text-xl font-semibold text-[#161F2B]">
                  Compact Support Systems
                </h3>
                <p className="font-manrope mb-3 text-[16px] leading-relaxed text-[#777777]">
                  Low-profile design for modern sleeper sofas with limited clearance or space-saving
                  mechanisms.
                </p>
                <div className="font-manrope text-sm text-[#777777]">
                  <p className="mb-1">
                    <strong>Best for:</strong> Modern compact sleepers, chair beds
                  </p>
                  <p className="mb-1">
                    <strong>Firmness:</strong> Medium-firm
                  </p>
                  <p>
                    <strong>Installation:</strong> 15-20 minutes
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Firmness Guide
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope mb-4 text-[16px] leading-relaxed">
                Choosing the right firmness level depends on your sleep preferences and body type:
              </p>
              <div className="space-y-4">
                <div className="border-l-4 border-[#0268A0] pl-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Medium-Firm (Recommended)
                  </h3>
                  <p className="font-manrope mb-2 text-[16px] leading-relaxed">
                    Best all-around choice for most sleepers. Provides good support while allowing
                    slight give for pressure relief.
                  </p>
                  <p className="font-manrope text-sm">
                    <strong>Ideal for:</strong> Side sleepers, average weight, combination sleepers
                  </p>
                </div>
                <div className="border-l-4 border-[#0268A0] pl-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">Firm</h3>
                  <p className="font-manrope mb-2 text-[16px] leading-relaxed">
                    Maximum support with minimal give. Excellent for back sleepers and those who
                    prefer very supportive surfaces.
                  </p>
                  <p className="font-manrope text-sm">
                    <strong>Ideal for:</strong> Back sleepers, heavier weight, stomach sleepers
                  </p>
                </div>
                <div className="border-l-4 border-[#0268A0] pl-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Extra Firm
                  </h3>
                  <p className="font-manrope mb-2 text-[16px] leading-relaxed">
                    Rock-solid support for those who need maximum firmness or very heavy use.
                  </p>
                  <p className="font-manrope text-sm">
                    <strong>Ideal for:</strong> Very heavy weight, therapeutic needs, commercial use
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Mattress Compatibility
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope mb-4 text-[16px] leading-relaxed">
                Meliusly support systems work with all standard sleeper sofa mattress types:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-[#F8F9FA] p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Memory Foam
                  </h3>
                  <p className="font-manrope text-sm text-[#777777]">
                    Excellent compatibility. Our support systems provide the firm base memory foam
                    needs to perform properly.
                  </p>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Innerspring
                  </h3>
                  <p className="font-manrope text-sm text-[#777777]">
                    Perfect match. Prevents coil feel-through and extends mattress life by
                    eliminating bar pressure.
                  </p>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">Gel</h3>
                  <p className="font-manrope text-sm text-[#777777]">
                    Works great. Our support systems don't interfere with gel cooling properties.
                  </p>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Air Mattresses
                  </h3>
                  <p className="font-manrope text-sm text-[#777777]">
                    Compatible. Provides stable platform for air mattresses, preventing sagging and
                    punctures.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Improving Sleep Quality
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope mb-4 text-[16px] leading-relaxed">
                Beyond the support system, these tips maximize comfort:
              </p>
              <ul className="font-manrope list-disc space-y-3 pl-6 text-[16px] leading-relaxed">
                <li>
                  <strong>Add a mattress topper:</strong> 2-3 inch memory foam or latex topper adds
                  luxurious comfort
                </li>
                <li>
                  <strong>Use quality bedding:</strong> Deep-pocket fitted sheets designed for sofa
                  beds stay secure
                </li>
                <li>
                  <strong>Temperature control:</strong> Cooling mattress protectors improve sleep in
                  warm climates
                </li>
                <li>
                  <strong>Pillow selection:</strong> Choose pillows that match your sleep position
                  for proper neck alignment
                </li>
                <li>
                  <strong>Regular maintenance:</strong> Keep the entire sleep system clean and
                  properly tensioned
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Troubleshooting Common Issues
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Still feeling the bar
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Ensure the support system is centered over the bar location. Add a mattress topper
                  for additional cushioning if needed.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">Too firm</h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Add a softer mattress topper (2-4 inches) to customize firmness. Memory foam or
                  pillow-top toppers work well.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Not firm enough
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Contact us about upgrading to our Extra Firm support system. Also check that all
                  mounting hardware is properly tightened.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-[#F8F9FA] p-8 text-center">
            <h2 className="font-manrope mb-3 text-2xl font-semibold text-[#161F2B]">
              Find Your Perfect Support System
            </h2>
            <p className="font-manrope mb-6 text-[16px] leading-relaxed text-[#777777]">
              Not sure which support system is right for you? Our team can help you choose based on
              your specific needs.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/collections/all"
                className="font-manrope inline-block rounded-lg bg-[#0268A0] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580]"
              >
                Shop Support Systems
              </a>
              <a
                href="/contact"
                className="font-manrope inline-block rounded-lg border-2 border-[#0268A0] bg-white px-8 py-4 text-[16px] font-semibold text-[#0268A0] transition-colors hover:bg-[#F8F9FA]"
              >
                Get Expert Advice
              </a>
            </div>
          </section>
        </div>
      </div>
      <TraitsBar />
    </main>
  )
}
