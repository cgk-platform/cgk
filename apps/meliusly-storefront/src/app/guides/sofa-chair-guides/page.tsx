import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Sofa Chair Guides',
  description:
    'Complete guides for selecting, installing, and maintaining Meliusly sofa chair support systems.',
}

export default function SofaChairGuidesPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-4 text-4xl font-semibold text-[#161F2B]">
          Sofa Chair Guides
        </h1>
        <p className="font-manrope mb-12 text-[18px] leading-relaxed text-[#777777]">
          Expert guidance for getting the most from your Meliusly sofa chair support system.
        </p>

        <div className="space-y-12">
          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Understanding Sofa Chair Support
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope text-[16px] leading-relaxed">
                Sofa chair sleepers (also called twin sleepers or chair beds) present unique
                challenges compared to full-size sleeper sofas. The compact folding mechanism and
                smaller frame require specialized support solutions.
              </p>
              <p className="font-manrope text-[16px] leading-relaxed">
                Meliusly sofa chair support systems are engineered specifically for these smaller
                sleepers, providing the same firm, even support as our full-size systems while
                accommodating the compact folding design.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Measuring Your Sofa Chair
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope mb-4 text-[16px] leading-relaxed">
                Accurate measurements ensure proper fit:
              </p>
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Frame Width
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Typical range: 32-38 inches. Measure between the inside edges of the frame
                    rails.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Frame Depth
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Typical range: 66-72 inches when fully extended. Measure from front to back of
                    the bed frame.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Bar Location
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Note the position of the uncomfortable metal bar - typically 18-24 inches from
                    the front edge.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Installation Considerations
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope mb-4 text-[16px] leading-relaxed">
                Sofa chair installation requires extra attention due to the compact mechanism:
              </p>
              <div className="space-y-4">
                <div className="border-l-4 border-[#0268A0] pl-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Check Clearance
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Ensure the support system doesn't interfere with the folding mechanism. Test the
                    fold several times before final installation.
                  </p>
                </div>
                <div className="border-l-4 border-[#0268A0] pl-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Compact Frame Rails
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Chair frames often have narrower rails than full-size sleepers. Use provided
                    spacer shims if needed.
                  </p>
                </div>
                <div className="border-l-4 border-[#0268A0] pl-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Weight Distribution
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Position the support system to distribute weight evenly. Center it over the
                    mattress area for optimal comfort.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Product Recommendations
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope mb-4 text-[16px] leading-relaxed">
                We recommend the following Meliusly products for sofa chairs:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-[#F8F9FA] p-6">
                  <h3 className="font-manrope mb-3 text-lg font-semibold text-[#161F2B]">
                    Twin Size Support System
                  </h3>
                  <p className="font-manrope mb-3 text-sm text-[#777777]">
                    Our most popular option for standard sofa chairs. Fits frames 32-38 inches wide.
                  </p>
                  <ul className="font-manrope list-disc space-y-1 pl-6 text-sm text-[#777777]">
                    <li>Lightweight aluminum construction</li>
                    <li>Easy 15-minute installation</li>
                    <li>Works with all mattress types</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-6">
                  <h3 className="font-manrope mb-3 text-lg font-semibold text-[#161F2B]">
                    Compact Support System
                  </h3>
                  <p className="font-manrope mb-3 text-sm text-[#777777]">
                    Designed for extra-compact chair sleepers with limited frame depth.
                  </p>
                  <ul className="font-manrope list-disc space-y-1 pl-6 text-sm text-[#777777]">
                    <li>Lower profile for tight spaces</li>
                    <li>Adjustable mounting points</li>
                    <li>Ideal for modern compact designs</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Maximizing Comfort
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope mb-4 text-[16px] leading-relaxed">
                Tips for getting the best sleep experience from your sofa chair:
              </p>
              <ul className="font-manrope list-disc space-y-3 pl-6 text-[16px] leading-relaxed">
                <li>
                  <strong>Use a quality mattress topper:</strong> A 2-3 inch memory foam topper adds
                  extra comfort without interfering with the folding mechanism
                </li>
                <li>
                  <strong>Choose the right bedding:</strong> Low-profile sheets and blankets are
                  easier to manage on a sofa chair
                </li>
                <li>
                  <strong>Add a pillow wedge:</strong> Elevating the head slightly can improve
                  comfort for back sleepers
                </li>
                <li>
                  <strong>Regular maintenance:</strong> Keep the support system and frame clean and
                  check mounting screws monthly
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Common Questions
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Will this work with my ottoman-style chair bed?
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Yes! Our compact support system is designed to work with ottoman-style chair beds.
                  Contact us with your specific model for confirmation.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Can I use this with a pull-out chair?
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Absolutely. Pull-out chair mechanisms work great with our support systems. Follow
                  the standard installation process.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  How much weight can it support?
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Our sofa chair support systems are rated for 300 lbs when properly installed,
                  matching or exceeding most manufacturer specifications.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-[#F8F9FA] p-8 text-center">
            <h2 className="font-manrope mb-3 text-2xl font-semibold text-[#161F2B]">
              Ready to Upgrade Your Sofa Chair?
            </h2>
            <p className="font-manrope mb-6 text-[16px] leading-relaxed text-[#777777]">
              Shop our collection of sofa chair support systems or contact us for personalized
              recommendations.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/collections/all"
                className="font-manrope inline-block rounded-lg bg-[#0268A0] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580]"
              >
                Shop Now
              </a>
              <a
                href="/contact"
                className="font-manrope inline-block rounded-lg border-2 border-[#0268A0] bg-white px-8 py-4 text-[16px] font-semibold text-[#0268A0] transition-colors hover:bg-[#F8F9FA]"
              >
                Contact Support
              </a>
            </div>
          </section>
        </div>
      </div>
      <TraitsBar />
    </main>
  )
}
