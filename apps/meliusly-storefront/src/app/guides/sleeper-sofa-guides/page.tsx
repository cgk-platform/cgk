import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Sleeper Sofa Guides',
  description:
    'Complete guides for selecting, installing, and maintaining Meliusly sleeper sofa support systems.',
}

export default function SleeperSofaGuidesPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-4 text-4xl font-semibold text-[#161F2B]">
          Sleeper Sofa Guides
        </h1>
        <p className="font-manrope mb-12 text-[18px] leading-relaxed text-[#777777]">
          Everything you need to know about selecting, installing, and maintaining your Meliusly
          sleeper sofa support system.
        </p>

        <div className="space-y-12">
          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Measuring Your Sleeper Sofa
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope text-[16px] leading-relaxed">
                Proper measurements are critical for ensuring your Meliusly support system fits
                correctly. Follow these steps:
              </p>
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Step 1: Open the Sleeper Mechanism
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Fully extend your sleeper sofa into the bed position and remove the mattress.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Step 2: Measure Frame Width
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Measure the inside distance between the left and right metal frame rails. This
                    is your critical width measurement.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Step 3: Measure Frame Length
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Measure from the front to the back of the frame where the support system will
                    rest. Typically 72-75 inches for full-size sleepers.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Step 4: Check Frame Rail Thickness
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed">
                    Measure the thickness of the frame rails (typically 0.5-1.5 inches). This
                    determines if you need spacer shims.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Choosing the Right Support System
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope mb-4 text-[16px] leading-relaxed">
                Meliusly offers support systems for different sleeper sofa sizes:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-[#F8F9FA] p-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Full Size
                  </h3>
                  <p className="font-manrope mb-2 text-sm text-[#777777]">
                    Frame Width: 50-54 inches
                  </p>
                  <p className="font-manrope text-sm text-[#777777]">Sleeping Surface: 54" x 72"</p>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Queen Size
                  </h3>
                  <p className="font-manrope mb-2 text-sm text-[#777777]">
                    Frame Width: 58-62 inches
                  </p>
                  <p className="font-manrope text-sm text-[#777777]">Sleeping Surface: 60" x 72"</p>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Twin Size
                  </h3>
                  <p className="font-manrope mb-2 text-sm text-[#777777]">
                    Frame Width: 36-40 inches
                  </p>
                  <p className="font-manrope text-sm text-[#777777]">Sleeping Surface: 39" x 72"</p>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-6">
                  <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                    Custom Sizes
                  </h3>
                  <p className="font-manrope mb-2 text-sm text-[#777777]">
                    Non-standard dimensions
                  </p>
                  <p className="font-manrope text-sm text-[#777777]">
                    Contact us for custom solutions
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Installation Tips
            </h2>
            <div className="space-y-4 text-[#777777]">
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Work in a Well-Lit Area
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Good lighting helps you see mounting points clearly and ensure proper alignment.
                </p>
              </div>
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Double-Check Before Drilling
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  Mark all mounting holes with a pencil and verify alignment before making any
                  permanent holes.
                </p>
              </div>
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Use the Right Tools
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  A power drill makes installation faster, but hand tools work fine. Never
                  over-tighten screws.
                </p>
              </div>
              <div className="border-l-4 border-[#0268A0] pl-6">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Test Before Final Use
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed">
                  After installation, test the folding mechanism several times before replacing the
                  mattress.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Maintenance and Care
            </h2>
            <div className="space-y-4 text-[#777777]">
              <p className="font-manrope text-[16px] leading-relaxed">
                Your Meliusly support system is designed to last for years with minimal maintenance:
              </p>
              <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
                <li>
                  Inspect mounting screws every 6 months and tighten if needed (normal use may cause
                  slight loosening)
                </li>
                <li>Clean the support system annually with a damp cloth and mild soap</li>
                <li>Check for any signs of wear or damage when cleaning</li>
                <li>Avoid placing heavy objects on the support system when not in bed mode</li>
                <li>Keep the folding mechanism clear of debris</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-manrope mb-6 text-2xl font-semibold text-[#161F2B]">
              Common Issues and Solutions
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Squeaking Sounds
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Apply a small amount of furniture wax or dry lubricant to contact points where the
                  support system meets the frame.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Uneven Support
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Check that all mounting screws are equally tightened. Adjust as needed to achieve
                  level support.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="font-manrope mb-2 text-lg font-semibold text-[#161F2B]">
                  Difficulty Folding
                </h3>
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  Ensure the support system is installed flush with the frame. Check for any
                  obstructions in the folding path.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-[#F8F9FA] p-8 text-center">
            <h2 className="font-manrope mb-3 text-2xl font-semibold text-[#161F2B]">
              Need Expert Advice?
            </h2>
            <p className="font-manrope mb-6 text-[16px] leading-relaxed text-[#777777]">
              Our team is here to help you select the perfect support system for your sleeper sofa.
            </p>
            <a
              href="/contact"
              className="font-manrope inline-block rounded-lg bg-[#0268A0] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580]"
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
