/**
 * FAQ Page
 *
 * Frequently asked questions with expandable accordion.
 */

'use client'

import { useState } from 'react'

import { ChevronDown, HelpCircle, Package, CreditCard, Truck, RefreshCcw } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQCategory {
  id: string
  title: string
  icon: React.ReactNode
  items: FAQItem[]
}

const faqCategories: FAQCategory[] = [
  {
    id: 'orders',
    title: 'Orders & Payment',
    icon: <CreditCard className="h-5 w-5" />,
    items: [
      {
        question: 'How do I place an order?',
        answer:
          'Simply browse our products, add items to your cart, and proceed to checkout. You can check out as a guest or create an account to track your orders and save your information for future purchases.',
      },
      {
        question: 'What payment methods do you accept?',
        answer:
          'We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, Google Pay, and Shop Pay. All transactions are secured with SSL encryption.',
      },
      {
        question: 'Can I modify or cancel my order?',
        answer:
          'You can modify or cancel your order within 1 hour of placing it. After that, please contact our support team as soon as possible. Once an order has shipped, it cannot be cancelled.',
      },
      {
        question: 'How do I use a discount code?',
        answer:
          'Enter your discount code in the "Discount Code" field at checkout and click "Apply". The discount will be reflected in your order total before you complete your purchase.',
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping & Delivery',
    icon: <Truck className="h-5 w-5" />,
    items: [
      {
        question: 'How long will my order take to arrive?',
        answer:
          'Standard shipping typically takes 5-7 business days. Express shipping takes 2-3 business days. Processing time is 1-2 business days before shipment.',
      },
      {
        question: 'Do you offer free shipping?',
        answer:
          'Yes! We offer free standard shipping on all orders over $50. Orders under $50 have a flat rate shipping fee of $5.99.',
      },
      {
        question: 'How can I track my order?',
        answer:
          'Once your order ships, you\'ll receive an email with tracking information. You can also track your order by logging into your account and viewing your order history.',
      },
      {
        question: 'Do you ship internationally?',
        answer:
          'Currently, we ship within the United States. We\'re working on expanding our shipping options to include international destinations.',
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & Exchanges',
    icon: <RefreshCcw className="h-5 w-5" />,
    items: [
      {
        question: 'What is your return policy?',
        answer:
          'We accept returns within 30 days of delivery. Items must be unused, in original packaging, and include all tags. Some items like personalized products may not be eligible for return.',
      },
      {
        question: 'How do I start a return?',
        answer:
          'Log into your account, go to your order history, and click "Start Return" on the order you wish to return. Follow the instructions to print your prepaid return label.',
      },
      {
        question: 'How long do refunds take?',
        answer:
          'Once we receive your return, refunds are processed within 3-5 business days. It may take an additional 3-5 business days for the refund to appear on your statement.',
      },
      {
        question: 'Can I exchange an item?',
        answer:
          'Yes! You can exchange items for a different size or color. Start a return and select "Exchange" as your reason. If the new item has a price difference, you\'ll be charged or refunded accordingly.',
      },
    ],
  },
  {
    id: 'products',
    title: 'Products & Inventory',
    icon: <Package className="h-5 w-5" />,
    items: [
      {
        question: 'How do I know what size to order?',
        answer:
          'Each product page includes a detailed size guide. We recommend measuring yourself and comparing to our size chart for the best fit.',
      },
      {
        question: 'Will you restock sold-out items?',
        answer:
          'We regularly restock popular items. You can click "Notify Me" on any sold-out product page to receive an email when it\'s back in stock.',
      },
      {
        question: 'Are your products authentic?',
        answer:
          'Yes, we only sell 100% authentic products. We source directly from authorized manufacturers and distributors.',
      },
      {
        question: 'Do you offer gift cards?',
        answer:
          'Yes! Digital gift cards are available in various denominations. They\'re delivered via email and never expire.',
      },
    ],
  },
]

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="divide-y divide-[hsl(var(--portal-border))]">
      {items.map((item, index) => (
        <div key={index}>
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-[hsl(var(--portal-primary))]"
          >
            <span className="font-medium">{item.question}</span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-[hsl(var(--portal-muted-foreground))] transition-transform ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all ${
              openIndex === index ? 'max-h-96 pb-4' : 'max-h-0'
            }`}
          >
            <p className="text-[hsl(var(--portal-muted-foreground))]">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('orders')

  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))]/10">
            <HelpCircle className="h-8 w-8 text-[hsl(var(--portal-primary))]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--portal-muted-foreground))]">
            Find answers to common questions about orders, shipping, returns, and more.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {faqCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                activeCategory === category.id
                  ? 'bg-[hsl(var(--portal-primary))] text-white'
                  : 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))] hover:bg-[hsl(var(--portal-muted))]/80'
              }`}
            >
              {category.icon}
              {category.title}
            </button>
          ))}
        </div>

        {/* FAQ Content */}
        <div className="mt-10">
          {faqCategories
            .filter((cat) => cat.id === activeCategory)
            .map((category) => (
              <div
                key={category.id}
                className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6"
              >
                <FAQAccordion items={category.items} />
              </div>
            ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-8 text-center">
          <h2 className="text-xl font-semibold">Still have questions?</h2>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
          </p>
          <a
            href="/contact"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3 font-medium text-white transition-all hover:bg-[hsl(var(--portal-primary))]/90"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
