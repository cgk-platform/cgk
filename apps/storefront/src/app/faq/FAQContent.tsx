/**
 * FAQ Content Client Component
 *
 * Interactive accordion and category tabs for FAQ page.
 */

'use client'

import { useState } from 'react'

import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQCategory {
  id: string
  title: string
  items: FAQItem[]
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="divide-y divide-gray-200">
      {items.map((item, index) => (
        <div key={index}>
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-cgk-navy"
          >
            <span className="font-medium text-gray-900">{item.question}</span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              openIndex === index ? 'max-h-96 pb-4' : 'max-h-0'
            }`}
          >
            <p className="text-gray-600">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FAQContent({ categories }: { categories: FAQCategory[] }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '')

  return (
    <>
      {/* Category Tabs */}
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`rounded-btn px-5 py-2.5 text-sm font-medium transition-all ${
              activeCategory === category.id
                ? 'bg-cgk-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.title}
          </button>
        ))}
      </div>

      {/* FAQ Content */}
      <div className="mt-10">
        {categories
          .filter((cat) => cat.id === activeCategory)
          .map((category) => (
            <div
              key={category.id}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <FAQAccordion items={category.items} />
            </div>
          ))}
      </div>
    </>
  )
}
