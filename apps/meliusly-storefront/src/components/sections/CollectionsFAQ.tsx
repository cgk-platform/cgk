'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

const faqs = [
  {
    question: 'Does it work with memory foam or upgraded mattresses?',
    answer:
      'Yes! Our support boards work perfectly with memory foam, gel, and upgraded mattresses. The board sits between the sofa frame and mattress, providing a stable foundation that enhances any mattress type. Many customers report even better comfort with premium mattresses on our support system.',
  },
  {
    question: 'Can I still fold the sleeper sofa normally?',
    answer:
      'Absolutely. The SleeperSaver is designed to fold naturally with your sofa bed mechanism. For the Classic and Flex models, simply remove the board before folding (takes 5 seconds). The SleeperSaver model stays permanently installed and folds seamlessly with your sofa.',
  },
  {
    question: 'What size sleeper sofas does SleeperSaver support?',
    answer:
      'We offer sizes for Twin, Full, Queen, and King sleeper sofas. Our most popular sizes are Queen (fits most standard sleeper sofas) and Full. Measure your mattress dimensions to confirm the right fit, or contact our support team for sizing guidance.',
  },
  {
    question: 'Will this fix a sagging or uncomfortable sofa bed?',
    answer:
      'Yes - that\'s exactly what it\'s designed for. Our support boards eliminate the "bar in the back" discomfort and prevent sagging by evenly distributing weight across the entire sleeping surface. Most customers report sleeping through the night for the first time on their sofa bed.',
  },
  {
    question: "What if it doesn't fit or doesn't work for my sofa?",
    answer:
      "We offer a 30-day money-back guarantee. If the support board doesn't fit or doesn't improve your sleep, return it for a full refund - no questions asked. We also provide free sizing consultations before purchase to ensure the right fit.",
  },
  {
    question: 'Will SleeperSaver make the mattress feel too firm?',
    answer:
      'Not at all. The SleeperSaver provides supportive, bed-like comfort - firm enough to eliminate sagging, but not rigid. If you prefer maximum firmness, choose the Classic model. For balanced comfort with slight give, the SleeperSaver or Flex models are ideal.',
  },
  {
    question: 'Can I use SleeperSaver with a mattress topper?',
    answer:
      'Yes! Many customers pair our support boards with mattress toppers for extra plushness. The board provides the structural support, while the topper adds surface comfort. This combination creates a hotel-quality sleep experience.',
  },
  {
    question: 'How long does SleeperSaver last?',
    answer:
      "Our support boards are built to last 10+ years with regular use. They're constructed from commercial-grade materials that won't warp, crack, or lose support over time. We back every product with a 5-year warranty.",
  },
]

export function CollectionsFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="flex w-full flex-col items-start justify-between gap-[60px] bg-white px-[80px] py-[80px] lg:flex-row lg:gap-[100px] lg:px-[100px]">
      {/* Left: Sticky Section Title */}
      <div className="w-full lg:sticky lg:top-[120px] lg:w-[363px] lg:shrink-0">
        <h2 className="text-[28px] leading-[1.3] font-semibold whitespace-pre-wrap text-[#161f2b] lg:text-[40px]">
          Frequently Asked Questions
        </h2>
      </div>

      {/* Right: Accordion */}
      <div className="flex w-full flex-col items-start lg:w-[658px] lg:shrink-0">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="w-full border-t border-solid border-[rgba(34,34,34,0.12)] transition-colors duration-200 hover:bg-[#fafbfc]"
          >
            <button
              onClick={() => toggleFaq(index)}
              className="flex w-full items-center justify-between gap-[20px] px-[16px] py-[25px] text-left transition-all duration-200"
              aria-expanded={openIndex === index}
              aria-controls={`faq-answer-${index}`}
            >
              <span className="flex-1 text-[16px] leading-[1.3] font-semibold whitespace-pre-wrap text-[#161f2b] lg:text-[18px]">
                {faq.question}
              </span>

              {/* Icon with smooth rotation */}
              <div className="relative flex size-[20px] shrink-0 items-center justify-center">
                <Plus
                  className={`absolute size-[20px] text-[#0268a0] transition-all duration-300 ${
                    openIndex === index
                      ? 'scale-0 rotate-90 opacity-0'
                      : 'scale-100 rotate-0 opacity-100'
                  }`}
                  strokeWidth={2.5}
                />
                <X
                  className={`absolute size-[20px] text-[#0268a0] transition-all duration-300 ${
                    openIndex === index
                      ? 'scale-100 rotate-0 opacity-100'
                      : 'scale-0 -rotate-90 opacity-0'
                  }`}
                  strokeWidth={2.5}
                />
              </div>
            </button>

            {/* Answer with smooth height transition */}
            <div
              id={`faq-answer-${index}`}
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div
                className={`px-[16px] pb-[25px] transition-all duration-300 ${
                  openIndex === index ? 'translate-y-0' : '-translate-y-4'
                }`}
              >
                <p className="text-[15px] leading-[1.6] font-medium tracking-[-0.15px] whitespace-pre-wrap text-[#161f2b] lg:text-[16px]">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
