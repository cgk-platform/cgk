import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how our sofa bed support system works and transforms your sleeper sofa.',
}

const steps = [
  {
    number: '01',
    title: 'Measure Your Sofa Bed',
    description:
      'Measure your sofa bed mattress to determine the correct size. We offer Twin, Full, and Queen sizes to fit standard sofa bed frames.',
  },
  {
    number: '02',
    title: 'Place Support Board',
    description:
      'Position the support board on your sofa bed frame beneath the mattress. No tools required - it installs in seconds and stays in place permanently.',
  },
  {
    number: '03',
    title: 'Enjoy Better Sleep',
    description:
      'Experience the comfort of a real mattress. Our support eliminates metal bar discomfort and sagging for better sleep every night.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#F8F9FA] to-white px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1440px] text-center">
          <h1 className="font-manrope mb-6 text-[40px] leading-[1.3] font-semibold text-[#161F2B] lg:text-[56px]">
            How It Works
          </h1>
          <p className="font-manrope mx-auto max-w-[768px] text-[18px] leading-relaxed text-[#777777] lg:text-[20px]">
            Transform your sofa bed into a comfortable sleeping surface in three simple steps. No
            tools required.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                {/* Step Number */}
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0268A0]">
                    <span className="font-manrope text-[32px] font-bold text-white">
                      {step.number}
                    </span>
                  </div>
                </div>

                {/* Step Title */}
                <h2 className="font-manrope mb-4 text-[24px] leading-[1.3] font-semibold text-[#161F2B]">
                  {step.title}
                </h2>

                {/* Step Description */}
                <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#F8F9FA] px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[768px] text-center">
          <h2 className="font-manrope mb-4 text-[32px] leading-[1.3] font-semibold text-[#161F2B]">
            Ready to Transform Your Sleep?
          </h2>
          <p className="font-manrope mb-8 text-[16px] leading-relaxed text-[#777777]">
            Join over 500,000 satisfied customers who have upgraded their sofa bed comfort.
          </p>
          <a
            href="/collections/all"
            className="font-manrope inline-block rounded-lg bg-[#0268A0] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580]"
          >
            Shop Now
          </a>
        </div>
      </section>
    </div>
  )
}
