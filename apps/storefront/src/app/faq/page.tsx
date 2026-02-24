/**
 * FAQ Page
 *
 * Server component with metadata. FAQ data is defined here and
 * passed to the interactive client component for tab/accordion rendering.
 */

import type { Metadata } from 'next'
import { getTenantConfig } from '@/lib/tenant'
import { FAQContent } from './FAQContent'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  const tenantName = tenant?.name ?? 'Store'

  return {
    title: `Frequently Asked Questions | ${tenantName}`,
    description: `Find answers to common questions about ${tenantName} sheets, shipping, returns, and care.`,
  }
}

const faqCategories = [
  {
    id: 'returns',
    title: 'Returns & Shipping',
    items: [
      {
        question: 'What is your return policy?',
        answer:
          'We offer a 30-day hassle-free return policy. If you\'re not completely satisfied with your purchase, return it in its original packaging for a full refund or exchange. Items must be unused and in their original condition.',
      },
      {
        question: 'Do you offer free shipping?',
        answer:
          'Yes! We offer free 3-day delivery on all orders over $50. Standard shipping is available for orders under $50 at a flat rate of $5.99.',
      },
      {
        question: 'How long does shipping take?',
        answer:
          'Most orders ship within 1-2 business days. Standard delivery takes 5-7 business days. Express 2-3 day shipping is available at checkout. Orders over $50 qualify for free 3-day delivery.',
      },
      {
        question: 'How can I track my order?',
        answer:
          'Once your order ships, you\'ll receive an email with tracking information. You can also log into your account to view order status and tracking details.',
      },
      {
        question: 'Can I exchange my sheets for a different size or color?',
        answer:
          'Absolutely! Start an exchange through your account within 30 days of delivery. We\'ll send your new item as soon as we receive the return. If there\'s a price difference, you\'ll be charged or refunded accordingly.',
      },
      {
        question: 'What if my order arrives damaged?',
        answer:
          'Contact us within 48 hours of delivery with photos of the damage. We\'ll arrange a free replacement or full refund — no need to return the damaged item.',
      },
    ],
  },
  {
    id: 'bedding',
    title: 'Bedding Info',
    items: [
      {
        question: 'What size sheets do I need?',
        answer:
          'Our sheets come in Twin, Full, Queen, King, and California King. Each product page includes a detailed size guide with exact dimensions. Our 21-inch deep pockets fit mattresses up to 16 inches deep, including pillow-top mattresses.',
      },
      {
        question: 'What makes CGK sheets different?',
        answer:
          'CGK sheets feature premium double-brushed microfiber that gets softer with every wash. Our 21-inch deep pockets are deeper than most brands (typically 14-16 inches), so they stay in place all night — even on thick mattresses.',
      },
      {
        question: 'Are your sheets breathable?',
        answer:
          'Yes! Our microfiber sheets are designed to be breathable and temperature-regulating. They keep you cool in summer and warm in winter, making them perfect for year-round use.',
      },
      {
        question: 'What comes in a 6-piece sheet set?',
        answer:
          'Each 6-piece set includes: 1 flat sheet, 1 fitted sheet with 21-inch deep pockets, and 4 pillowcases (Twin size includes 1 pillowcase). King and Cal King sets come with King-size pillowcases.',
      },
      {
        question: 'Do you carry fitted sheets only?',
        answer:
          'Currently our primary offering is the 6-piece sheet set. We also carry comforter sets, blankets, and other bedding accessories. Check our collections page for the full range.',
      },
    ],
  },
  {
    id: 'care',
    title: 'Care Instructions',
    items: [
      {
        question: 'How do I wash my CGK sheets?',
        answer:
          'Machine wash cold on a gentle cycle with like colors. Use a mild detergent. Avoid bleach and fabric softeners — they can break down the fibers over time.',
      },
      {
        question: 'How should I dry my sheets?',
        answer:
          'Tumble dry on low heat. Remove promptly to minimize wrinkles. If needed, iron on the lowest setting. Avoid high heat as it can damage the microfiber.',
      },
      {
        question: 'Will my sheets pill or shrink?',
        answer:
          'Our double-brushed microfiber is designed to resist pilling and shrinking. Following the care instructions (cold wash, low dry) will keep your sheets looking and feeling great for years.',
      },
      {
        question: 'Do the sheets get softer over time?',
        answer:
          'Yes! CGK sheets are double-brushed for immediate softness, and they continue to get softer with each wash. Many customers say they feel even better after a few washes.',
      },
    ],
  },
]

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqCategories.flatMap((cat) =>
    cat.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }))
  ),
})

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-store px-4 py-12">
      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-cgk-navy md:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Find answers to common questions about our sheets, shipping, returns, and care.
          </p>
        </div>

        <FAQContent categories={faqCategories} />

        {/* Contact CTA */}
        <div className="mt-12 rounded-lg bg-cgk-light-blue/30 p-8 text-center">
          <h2 className="text-xl font-semibold text-cgk-navy">Still have questions?</h2>
          <p className="mt-2 text-gray-600">
            Can&apos;t find the answer you&apos;re looking for? We&apos;re here to help.
          </p>
          <a
            href="/contact"
            className="mt-4 inline-flex items-center justify-center rounded-btn bg-cgk-navy px-6 py-3 font-medium text-white transition-all hover:bg-cgk-navy/90"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
