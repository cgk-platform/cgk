'use client'

import { Clock, Zap, Armchair, Ruler, Square, RotateCcw, CheckCircle2 } from 'lucide-react'

interface InstallationStep {
  number: number
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  tip?: string
}

const installationSteps: InstallationStep[] = [
  {
    number: 1,
    title: 'Remove Sofa Cushions',
    description:
      'Carefully remove all cushions from your sofa bed to expose the sleeping surface frame. Set cushions aside in a clean area.',
    icon: Armchair,
    tip: 'Stack cushions in order to make reassembly easier',
  },
  {
    number: 2,
    title: 'Measure Sofa Bed Dimensions',
    description:
      'Measure the width and length of the sofa bed frame to ensure proper fit. Our support boards are designed to fit standard sofa bed sizes.',
    icon: Ruler,
  },
  {
    number: 3,
    title: 'Place Support Board on Frame',
    description:
      'Position the support board evenly on the sofa bed frame, ensuring all edges align properly. The board should sit flush against the frame.',
    icon: Square,
    tip: 'Center the board for optimal weight distribution',
  },
  {
    number: 4,
    title: 'Replace Cushions',
    description:
      'Return the cushions to their original positions on top of the support board. Ensure they are properly aligned and seated.',
    icon: RotateCcw,
  },
  {
    number: 5,
    title: 'Test Stability',
    description:
      'Gently press on the cushioned surface to test stability. The support board should eliminate sagging and provide firm, even support.',
    icon: CheckCircle2,
  },
]

export function InstallationGuide() {
  return (
    <section className="via-meliusly-offWhite/30 w-full bg-gradient-to-b from-white to-white py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="border-meliusly-primary/20 bg-meliusly-primary/5 text-meliusly-primary inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold">
              <Clock className="h-4 w-4" />
              15 minutes
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-green-600/20 bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
              <Zap className="h-4 w-4" />
              Easy Installation
            </span>
          </div>

          <h2 className="font-manrope text-meliusly-dark text-[28px] leading-tight font-semibold lg:text-[36px]">
            Simple Installation Guide
          </h2>
          <p className="font-manrope text-meliusly-grayText mt-3 text-base leading-relaxed lg:text-lg">
            Follow these straightforward steps to install your sofa bed support. No tools required.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12 hidden lg:block">
          <div className="relative">
            <div className="bg-meliusly-lightGray absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2"></div>
            <div className="relative flex justify-between">
              {installationSteps.map((step) => (
                <div
                  key={step.number}
                  className="border-meliusly-primary font-manrope text-meliusly-primary flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white text-sm font-bold transition-all hover:scale-110 hover:shadow-lg"
                >
                  {step.number}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {installationSteps.map((step, index) => {
            const IconComponent = step.icon
            const isEvenRow = Math.floor(index / 2) % 2 === 1

            return (
              <div
                key={step.number}
                className="group border-meliusly-lightGray hover:border-meliusly-primary/30 relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl lg:p-8"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards',
                  opacity: 0,
                }}
              >
                {/* Decorative corner accent */}
                <div
                  className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br transition-opacity duration-300 group-hover:opacity-100 ${
                    isEvenRow
                      ? 'from-meliusly-primary/5 to-transparent opacity-0'
                      : 'from-meliusly-gold/5 to-transparent opacity-0'
                  }`}
                ></div>

                <div className="relative">
                  {/* Step Number and Icon */}
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="from-meliusly-primary to-meliusly-primary/80 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                        <span className="font-manrope text-2xl font-bold text-white">
                          {step.number}
                        </span>
                      </div>

                      <div className="bg-meliusly-offWhite group-hover:bg-meliusly-primary/10 flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-300">
                        <IconComponent className="text-meliusly-primary h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Step Content */}
                  <h3 className="font-manrope text-meliusly-dark mb-3 text-lg leading-snug font-semibold">
                    {step.title}
                  </h3>

                  <p className="font-manrope text-meliusly-grayText text-base leading-relaxed">
                    {step.description}
                  </p>

                  {/* Optional Tip */}
                  {step.tip && (
                    <div className="border-meliusly-gold bg-meliusly-gold/5 mt-4 rounded-lg border-l-4 p-3">
                      <p className="font-manrope text-meliusly-dark/80 text-sm font-medium">
                        <span className="text-meliusly-gold font-semibold">Tip:</span> {step.tip}
                      </p>
                    </div>
                  )}

                  {/* Step Progress Indicator (Mobile) */}
                  <div className="mt-5 lg:hidden">
                    <div className="bg-meliusly-lightGray h-1.5 w-full rounded-full">
                      <div
                        className="bg-meliusly-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${(step.number / installationSteps.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer CTA */}
        <div className="border-meliusly-primary/20 from-meliusly-primary/5 to-meliusly-primary/5 mt-12 rounded-2xl border bg-gradient-to-r via-white p-6 text-center lg:p-8">
          <h3 className="font-manrope text-meliusly-dark mb-2 text-xl font-semibold lg:text-2xl">
            Need Help?
          </h3>
          <p className="font-manrope text-meliusly-grayText mx-auto mb-5 max-w-2xl text-base leading-relaxed">
            Our customer support team is here to assist you with any questions about installation or
            product care.
          </p>
          <a
            href="/support"
            className="bg-meliusly-primary font-manrope hover:bg-meliusly-primary/90 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl"
          >
            Contact Support
            <CheckCircle2 className="h-4 w-4" />
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  )
}
