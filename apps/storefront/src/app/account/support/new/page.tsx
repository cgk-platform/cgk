/**
 * Create Support Ticket Page
 *
 * Form to submit a new support request with category selection.
 */

import type { Metadata } from 'next'
import Link from 'next/link'

import { defaultContent } from '@/lib/account/content'

import { CreateTicketForm } from './components'

export const metadata: Metadata = {
  title: 'New Support Request',
  description: 'Submit a new support ticket',
}

export const dynamic = 'force-dynamic'

export default async function NewTicketPage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/account/support"
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))] mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Support
        </Link>

        <h1
          className="text-2xl font-bold tracking-tight lg:text-3xl"
          style={{ fontFamily: 'var(--portal-heading-font)' }}
        >
          {defaultContent['support.new_ticket']}
        </h1>
        <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
          Describe your issue and we'll get back to you as soon as possible.
        </p>
      </div>

      {/* Ticket Form */}
      <div className="max-w-2xl">
        <CreateTicketForm />
      </div>

      {/* Help Tips */}
      <div className="mt-12 max-w-2xl">
        <h2 className="text-sm font-medium text-[hsl(var(--portal-muted-foreground))] uppercase tracking-wide mb-4">
          Tips for a faster response
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm text-[hsl(var(--portal-foreground))]">
                Be specific
              </p>
              <p className="text-xs text-[hsl(var(--portal-muted-foreground))]">
                Include order numbers, product names, and specific details about your issue.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm text-[hsl(var(--portal-foreground))]">
                Choose the right category
              </p>
              <p className="text-xs text-[hsl(var(--portal-muted-foreground))]">
                This helps route your request to the right team.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm text-[hsl(var(--portal-foreground))]">
                Check FAQs first
              </p>
              <p className="text-xs text-[hsl(var(--portal-muted-foreground))]">
                Common questions are often answered in our FAQ section.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm text-[hsl(var(--portal-foreground))]">
                Response time
              </p>
              <p className="text-xs text-[hsl(var(--portal-muted-foreground))]">
                We typically respond within 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
