'use client'

import { cn } from '@cgk/ui'
import { useState } from 'react'


import type { FAQCategory, FAQItem } from '@/lib/types'

// FAQ content
const faqData: FAQItem[] = [
  // Getting Started
  {
    id: '1',
    category: 'getting_started',
    question: 'How do I get started as a creator?',
    answer:
      'After your application is approved, you\'ll receive an email invitation. Sign in to the Creator Portal, complete your profile, submit your W-9 tax form, and set up your payout method. Once approved, you\'ll start receiving project assignments.',
    order: 1,
  },
  {
    id: '2',
    category: 'getting_started',
    question: 'What information do I need to provide?',
    answer:
      'You\'ll need to provide your full legal name, email address, phone number, and shipping address (for product samples). For payouts, you\'ll need to submit a W-9 tax form and set up either bank transfer or PayPal.',
    order: 2,
  },
  {
    id: '3',
    category: 'getting_started',
    question: 'How do I update my profile?',
    answer:
      'Go to Settings > Profile to update your name, bio, phone number, and shipping address. Your email address cannot be changed - contact support if you need to update it.',
    order: 3,
  },
  // Payments & Withdrawals
  {
    id: '4',
    category: 'payments_withdrawals',
    question: 'When do I get paid?',
    answer:
      'Earnings are added to your pending balance when a project is submitted. Once approved, the amount moves to your available balance. You can request a withdrawal at any time once you reach the minimum threshold of $10.',
    order: 1,
  },
  {
    id: '5',
    category: 'payments_withdrawals',
    question: 'What is the minimum withdrawal amount?',
    answer:
      'The minimum withdrawal amount is $10. Once your available balance reaches this threshold, you\'ll see a "Withdraw" button on your dashboard.',
    order: 2,
  },
  {
    id: '6',
    category: 'payments_withdrawals',
    question: 'How long do withdrawals take?',
    answer:
      'Bank transfers typically process within 3-5 business days. PayPal transfers are usually instant but may take up to 24 hours. International wire transfers may take 5-7 business days.',
    order: 3,
  },
  // Projects & Deliverables
  {
    id: '7',
    category: 'projects_deliverables',
    question: 'How do I upload my deliverables?',
    answer:
      'Go to Projects, select your active project, and click "Upload Files". You can upload videos, images, and documents. Make sure to follow the project brief for file format and quality requirements.',
    order: 1,
  },
  {
    id: '8',
    category: 'projects_deliverables',
    question: 'What happens after I submit my work?',
    answer:
      'Your coordinator will review your submission. You\'ll receive a notification when it\'s approved or if revisions are needed. Approved work moves your earnings from pending to available.',
    order: 2,
  },
  {
    id: '9',
    category: 'projects_deliverables',
    question: 'What if I need to make revisions?',
    answer:
      'If revisions are requested, you\'ll receive detailed feedback in your Messages. Upload the revised content to the same project. Most projects allow 1-2 revision rounds.',
    order: 3,
  },
  // Account & Security
  {
    id: '10',
    category: 'account_security',
    question: 'How do I change my password?',
    answer:
      'Go to Settings > Security to change your password. You\'ll need to enter your current password and then set a new one (minimum 8 characters).',
    order: 1,
  },
  {
    id: '11',
    category: 'account_security',
    question: 'What should I do if I forgot my password?',
    answer:
      'Click "Forgot password?" on the login page. Enter your email address and we\'ll send you a reset link. The link expires in 1 hour for security.',
    order: 2,
  },
  {
    id: '12',
    category: 'account_security',
    question: 'How do I sign out of all devices?',
    answer:
      'Go to Settings > Security and scroll to "Active Sessions". Click "Sign out all other devices" to revoke access from all devices except your current one.',
    order: 3,
  },
  // Tax Information
  {
    id: '13',
    category: 'tax_information',
    question: 'Why do I need to submit a W-9?',
    answer:
      'US tax law requires us to collect W-9 forms from all US-based creators who earn more than $600 in a calendar year. We\'ll use this information to issue you a 1099 form at year-end.',
    order: 1,
  },
  {
    id: '14',
    category: 'tax_information',
    question: 'I\'m not a US resident. What forms do I need?',
    answer:
      'Non-US residents should submit a W-8BEN form instead. Contact support for assistance with international tax documentation.',
    order: 2,
  },
  {
    id: '15',
    category: 'tax_information',
    question: 'When will I receive my 1099?',
    answer:
      '1099 forms are issued by January 31st for the previous tax year to all US creators who earned $600 or more. You\'ll receive it via email or can download it from Settings > Tax.',
    order: 3,
  },
]

// Category labels
const categoryLabels: Record<FAQCategory, string> = {
  getting_started: 'Getting Started',
  payments_withdrawals: 'Payments & Withdrawals',
  projects_deliverables: 'Projects & Deliverables',
  account_security: 'Account & Security',
  tax_information: 'Tax Information',
}

interface FAQAccordionProps {
  category?: FAQCategory
}

export function FAQAccordion({ category }: FAQAccordionProps): React.JSX.Element {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Filter by category if specified
  const filteredFaqs = category
    ? faqData.filter((faq) => faq.category === category)
    : faqData

  // Group by category if no category filter
  const grouped = category
    ? { [category]: filteredFaqs }
    : filteredFaqs.reduce(
        (acc, faq) => {
          if (!acc[faq.category]) {
            acc[faq.category] = []
          }
          acc[faq.category].push(faq)
          return acc
        },
        {} as Record<FAQCategory, FAQItem[]>
      )

  return (
    <div className="space-y-8">
      {(Object.entries(grouped) as [FAQCategory, FAQItem[]][]).map(
        ([cat, items]) => (
          <div key={cat}>
            {!category && (
              <h3 className="mb-4 text-lg font-semibold">{categoryLabels[cat]}</h3>
            )}
            <div className="divide-y rounded-lg border">
              {items
                .sort((a, b) => a.order - b.order)
                .map((faq) => (
                  <div key={faq.id}>
                    <button
                      type="button"
                      onClick={() => toggleItem(faq.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50"
                    >
                      <span className="text-sm font-medium">{faq.question}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(
                          'shrink-0 transition-transform',
                          openItems.has(faq.id) && 'rotate-180'
                        )}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {openItems.has(faq.id) && (
                      <div className="border-t bg-muted/30 px-4 py-3">
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}
