'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'Will this work with my sofa bed?',
    answer:
      'Our support systems are designed to work with most standard sofa beds, sleeper sofas, and pull-out couches. They fit twin, full, and queen-size mattresses. If you have a unique or custom-sized sofa bed, please measure your mattress dimensions and contact us to confirm compatibility.',
  },
  {
    question: 'Does it cover the entire sleeping area?',
    answer:
      'Yes, our boards are sized to match standard mattress dimensions (twin, full, queen) and provide edge-to-edge support across the entire sleeping surface. The board sits directly under the mattress, supporting every inch of the sleeping area.',
  },
  {
    question: 'What size sofa beds does it fit?',
    answer:
      'We offer three sizes: Twin (39" x 75"), Full (54" x 75"), and Queen (60" x 80"). These match standard sofa bed mattress sizes. Measure your sofa bed mattress before ordering to ensure the correct fit.',
  },
  {
    question: 'How much weight can it support?',
    answer:
      'Our support boards are engineered to hold up to 500 lbs evenly distributed. They are constructed from high-density materials that provide firm, consistent support without sagging or warping over time.',
  },
  {
    question: "What if it doesn't fit or doesn't work for my sofa?",
    answer:
      "We offer a 30-day return policy with no questions asked. If the product doesn't fit your sofa bed or doesn't meet your expectations, simply contact us for a full refund. Return shipping is free within the continental US.",
  },
  {
    question: 'Will this make the mattress too firm?',
    answer:
      'Our boards provide firm support underneath the mattress while allowing the mattress itself to retain its comfort level. Most customers report improved comfort due to eliminated sagging. The mattress cushioning remains on top, so you get support without sacrificing softness.',
  },
  {
    question: 'Can I leave it installed all the time?',
    answer:
      'Absolutely! Our boards are designed to stay in place permanently. They fold with your sofa bed mechanism and require no removal when converting between sofa and bed modes. Simply leave them installed for ongoing support.',
  },
]

export default function ProductFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="bg-white px-6 py-12 lg:px-[100px] lg:py-[60px]">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          {/* Left: Section Title (Sticky on desktop) */}
          <div className="lg:sticky lg:top-24 lg:w-[363px] lg:shrink-0">
            <h2 className="text-[28px] leading-[1.3] font-semibold text-[#161F2B] lg:text-[40px]">
              Frequently Asked Questions
            </h2>
          </div>

          {/* Right: Accordion List */}
          <div className="flex w-full flex-col lg:w-[658px] lg:shrink-0">
            {faqs.map((faq, index) => (
              <div key={index} className="border-t border-[rgba(34,34,34,0.12)]">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="flex w-full items-center justify-between gap-5 px-4 py-6 text-left transition-colors hover:bg-[#F6F6F6]/50"
                >
                  <span className="flex-1 text-[18px] leading-[1.3] font-semibold text-[#161F2B]">
                    {faq.question}
                  </span>
                  <div className="relative h-5 w-5 shrink-0 transition-transform duration-300">
                    {openIndex === index ? (
                      <X className="h-5 w-5 text-[#0268A0]" strokeWidth={2.5} />
                    ) : (
                      <Plus className="h-5 w-5 text-[#0268A0]" strokeWidth={2.5} />
                    )}
                  </div>
                </button>

                {/* Answer Panel */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    openIndex === index
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-6 text-[15px] leading-relaxed text-[#161F2B]/80">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
