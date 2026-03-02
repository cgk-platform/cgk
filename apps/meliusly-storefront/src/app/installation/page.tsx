import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Installation Guide',
  description: 'Step-by-step instructions for installing your Meliusly support system.',
}

export default function InstallationPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-4 text-4xl font-semibold text-[#161F2B]">
          Installation Guide
        </h1>
        <p className="font-manrope mb-12 text-[18px] leading-relaxed text-[#777777]">
          Follow these simple steps to install your Meliusly support system. Most installations take
          20-30 minutes.
        </p>

        <div className="space-y-8 text-[#777777]">
          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Before You Begin
            </h2>
            <div className="rounded-lg bg-[#F8F9FA] p-6">
              <h3 className="font-manrope mb-3 text-lg font-semibold text-[#161F2B]">
                Tools You'll Need:
              </h3>
              <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
                <li>Phillips screwdriver</li>
                <li>Measuring tape</li>
                <li>Pencil for marking</li>
                <li>Optional: Power drill with Phillips bit</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Installation Steps
            </h2>
            <div className="space-y-6">
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 1: Prepare Your Sofa Bed
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Fully open your sofa bed and remove the mattress. Clean the frame area where the
                  support system will be installed.
                </p>
              </div>

              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 2: Locate Mounting Points
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Identify the metal frame rails on both sides of the sofa bed. These are typically
                  1-2 inches wide and run the length of the bed.
                </p>
              </div>

              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 3: Position the Support System
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Place the support system across the frame, centering it over the mattress area.
                  The support bars should rest evenly on both frame rails.
                </p>
              </div>

              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 4: Mark Mounting Holes
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Using a pencil, mark the locations for mounting screws through the pre-drilled
                  holes in the support system. Double-check alignment before drilling.
                </p>
              </div>

              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 5: Attach the Support System
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Using the provided screws, attach the support system to the frame rails. Start
                  with one end, then the other, ensuring even tension. Tighten all screws securely
                  but do not over-tighten.
                </p>
              </div>

              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Step 6: Test and Replace Mattress
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Test the support system by applying pressure across the surface. It should feel
                  firm and stable with no flexing. Replace the mattress and test the bed's folding
                  mechanism.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              Troubleshooting
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Support system doesn't fit
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Double-check your sofa bed measurements against the product specifications.
                  Contact our support team if you need custom sizing.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Frame rails are too thin
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Use the included spacer shims to build up thinner frame rails. Contact us if you
                  need additional spacers.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Bed won't fold properly
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Ensure the support system is installed flush with the frame and all screws are
                  properly tightened. Check that nothing is obstructing the folding mechanism.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-[#F8F9FA] p-6">
            <h2 className="font-manrope mb-3 text-xl font-semibold text-[#161F2B]">
              Need Installation Help?
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              Our support team can walk you through the installation process or answer any
              questions.
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
