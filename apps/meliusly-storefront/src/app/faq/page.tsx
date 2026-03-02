import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Find answers to common questions about Meliusly products and services.',
}

export default function FAQPage() {
  const faqs = [
    {
      question: 'What is a Meliusly support system?',
      answer:
        'Meliusly support systems are engineered solutions that permanently install in your sofa bed frame to eliminate the uncomfortable metal bar and provide firm, even support across the entire sleeping surface.',
    },
    {
      question: 'Will this fit my sofa bed?',
      answer:
        "We offer support systems for most standard sofa bed sizes. Measure your sofa bed frame and check our product dimensions. If you're unsure, contact our support team with your measurements and we'll help you find the right fit.",
    },
    {
      question: 'How difficult is installation?',
      answer:
        'Most customers complete installation in 20-30 minutes with basic tools. Detailed instructions are included, and our support team is available if you need assistance.',
    },
    {
      question: 'Will this void my furniture warranty?',
      answer:
        'Our support systems are designed to install without permanent modifications to your furniture. However, we recommend checking with your furniture manufacturer if you have concerns about your warranty.',
    },
    {
      question: 'What if my sofa bed has an unusual design?',
      answer:
        "We offer custom sizing for non-standard sofa beds. Contact our support team with your measurements and photos, and we'll work with you to create a solution.",
    },
    {
      question: 'How long does shipping take?',
      answer:
        'Standard shipping takes 5-7 business days. Expedited shipping options are available at checkout for faster delivery.',
    },
    {
      question: 'What is your return policy?',
      answer:
        "We offer a 30-day money-back guarantee. If you're not satisfied, return the product in its original condition for a full refund minus shipping costs.",
    },
    {
      question: 'Do you offer bulk or commercial pricing?',
      answer:
        'Yes! We offer special pricing for hospitality businesses, property managers, and bulk orders. Contact our sales team for a custom quote.',
    },
    {
      question: 'Can I install this myself?',
      answer:
        'Absolutely! Our support systems are designed for DIY installation with basic tools. Most customers complete installation in under 30 minutes.',
    },
    {
      question: 'What materials are used?',
      answer:
        'We use heavy-duty steel construction with a durable powder-coated finish. All materials are sourced and manufactured in the United States.',
    },
  ]

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-4 text-4xl font-semibold text-[#161F2B]">
          Frequently Asked Questions
        </h1>
        <p className="font-manrope mb-12 text-[18px] leading-relaxed text-[#777777]">
          Find answers to common questions about our products and services.
        </p>

        <div className="space-y-8">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
              <h2 className="font-manrope mb-3 text-xl font-semibold text-[#161F2B]">
                {faq.question}
              </h2>
              <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-lg bg-[#F8F9FA] p-8 text-center">
          <h2 className="font-manrope mb-3 text-2xl font-semibold text-[#161F2B]">
            Still Have Questions?
          </h2>
          <p className="font-manrope mb-6 text-[16px] leading-relaxed text-[#777777]">
            Our US-based customer support team is ready to help.
          </p>
          <a
            href="/contact"
            className="font-manrope inline-block rounded-lg bg-[#0268A0] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580]"
          >
            Contact Support
          </a>
        </section>
      </div>
      <TraitsBar />
    </main>
  )
}
