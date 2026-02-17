/**
 * Support Page
 *
 * Displays customer support tickets with search, FAQ section, and quick actions.
 * Server-rendered with client components for interactivity.
 */

import { cn } from '@cgk-platform/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { EmptyState, EmptyStateIcons } from '@/components/account/EmptyState'
import { StatusBadge } from '@/components/account/StatusBadge'
import { getTickets, getFaqCategories } from '@/lib/account/api'
import { defaultContent, ticketCategoryLabels } from '@/lib/account/content'
import type { FaqCategory, SupportTicket } from '@/lib/account/types'

import { SupportSearch, FaqAccordion } from './components'

export const metadata: Metadata = {
  title: 'Help & Support',
  description: 'Get help and manage your support tickets',
}

export const dynamic = 'force-dynamic'

interface SupportPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const params = await searchParams
  const searchQuery = params.search || ''
  const statusFilter = params.status || ''
  const page = parseInt(params.page || '1', 10)

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold tracking-tight lg:text-3xl"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            {defaultContent['support.title']}
          </h1>
          <Link
            href="/account"
            className="flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Account
          </Link>
        </div>
        <p className="text-[hsl(var(--portal-muted-foreground))]">
          Get help with your orders, returns, and account
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/account/support/new"
          className={cn(
            'flex items-center gap-4 rounded-xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] p-4 transition-all hover:shadow-md hover:-translate-y-0.5'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))]/10 text-[hsl(var(--portal-primary))]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[hsl(var(--portal-foreground))]">
              {defaultContent['support.new_ticket']}
            </p>
            <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
              Submit a new support request
            </p>
          </div>
        </Link>

        <Link
          href="/account/orders"
          className={cn(
            'flex items-center gap-4 rounded-xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] p-4 transition-all hover:shadow-md hover:-translate-y-0.5'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[hsl(var(--portal-foreground))]">Order Issues</p>
            <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
              Track or manage your orders
            </p>
          </div>
        </Link>

        <Link
          href="#faq"
          className={cn(
            'flex items-center gap-4 rounded-xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] p-4 transition-all hover:shadow-md hover:-translate-y-0.5'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[hsl(var(--portal-foreground))]">FAQs</p>
            <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
              Find answers to common questions
            </p>
          </div>
        </Link>
      </div>

      {/* Tickets Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[hsl(var(--portal-foreground))]">
            Your Support Tickets
          </h2>
        </div>

        <div className="mb-4">
          <SupportSearch initialQuery={searchQuery} />
        </div>

        <Suspense fallback={<TicketsSkeleton />}>
          <TicketsList status={statusFilter} search={searchQuery} page={page} />
        </Suspense>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="scroll-mt-8">
        <h2 className="text-lg font-semibold text-[hsl(var(--portal-foreground))] mb-4">
          {defaultContent['support.faq.title']}
        </h2>
        <Suspense fallback={<FaqSkeleton />}>
          <FaqSection />
        </Suspense>
      </div>
    </div>
  )
}

interface TicketsListProps {
  status: string
  search: string
  page: number
}

async function TicketsList({ status, search, page }: TicketsListProps) {
  const pageSize = 10

  try {
    const result = await getTickets(page, pageSize)

    // Filter by status if specified
    let filteredTickets = result.items
    if (status) {
      filteredTickets = filteredTickets.filter((ticket) => ticket.status === status)
    }

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase()
      filteredTickets = filteredTickets.filter(
        (ticket) =>
          ticket.ticketNumber.toLowerCase().includes(searchLower) ||
          ticket.subject.toLowerCase().includes(searchLower)
      )
    }

    if (filteredTickets.length === 0) {
      return (
        <EmptyState
          icon={EmptyStateIcons.support}
          title="No support tickets"
          description="You haven't created any support tickets yet. Need help? Create a new ticket."
          action={
            <Link
              href="/account/support/new"
              className={cn(
                'inline-flex items-center justify-center',
                'rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3',
                'text-sm font-medium text-[hsl(var(--portal-primary-foreground))]',
                'transition-colors hover:bg-[hsl(var(--portal-primary))]/90'
              )}
            >
              Create Support Ticket
            </Link>
          }
        />
      )
    }

    return (
      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}

        {result.hasMore && (
          <div className="flex justify-center pt-4">
            <Link
              href={`/account/support?page=${page + 1}${status ? `&status=${status}` : ''}`}
              className="text-sm font-medium text-[hsl(var(--portal-primary))] hover:underline"
            >
              Load more tickets
            </Link>
          </div>
        )}
      </div>
    )
  } catch {
    return (
      <EmptyState
        icon={EmptyStateIcons.support}
        title="No support tickets"
        description="You haven't created any support tickets yet."
        action={
          <Link
            href="/account/support/new"
            className={cn(
              'inline-flex items-center justify-center',
              'rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3',
              'text-sm font-medium text-[hsl(var(--portal-primary-foreground))]',
              'transition-colors hover:bg-[hsl(var(--portal-primary))]/90'
            )}
          >
            Create Support Ticket
          </Link>
        }
      />
    )
  }
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const lastMessage = ticket.messages[ticket.messages.length - 1]
  const isWaitingResponse = ticket.status === 'waiting_customer'

  return (
    <Link
      href={`/account/support/${ticket.id}`}
      className={cn(
        'block rounded-xl border border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))] p-4 transition-all hover:shadow-md',
        isWaitingResponse && 'border-amber-300 bg-amber-50/50'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[hsl(var(--portal-muted-foreground))]">
              {ticket.ticketNumber}
            </span>
            <StatusBadge type="ticket" status={ticket.status} />
          </div>
          <h3 className="font-medium text-[hsl(var(--portal-foreground))] truncate">
            {ticket.subject}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-xs">
              {ticketCategoryLabels[ticket.category] ?? ticket.category}
            </span>
            <span>
              {new Date(ticket.updatedAt).toLocaleDateString()}
            </span>
          </div>
          {lastMessage && (
            <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))] line-clamp-1">
              {lastMessage.isFromCustomer ? 'You: ' : 'Support: '}
              {lastMessage.content}
            </p>
          )}
        </div>
        <svg
          className="h-5 w-5 flex-shrink-0 text-[hsl(var(--portal-muted-foreground))]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

async function FaqSection() {
  try {
    const categories = await getFaqCategories()

    if (!categories || categories.length === 0) {
      return <DefaultFaq />
    }

    return <FaqAccordion categories={categories} />
  } catch {
    return <DefaultFaq />
  }
}

function DefaultFaq() {
  const defaultFaq: FaqCategory[] = [
    {
      id: '1',
      name: 'Orders & Shipping',
      slug: 'orders',
      description: null,
      items: [
        {
          id: '1-1',
          question: 'How do I track my order?',
          answer: 'You can track your order by visiting the Orders page in your account. Click on the order to view tracking details.',
          category: 'orders',
          helpfulCount: 0,
          notHelpfulCount: 0,
        },
        {
          id: '1-2',
          question: 'What are the shipping options?',
          answer: 'We offer standard shipping (5-7 business days) and express shipping (2-3 business days). Shipping times may vary based on your location.',
          category: 'orders',
          helpfulCount: 0,
          notHelpfulCount: 0,
        },
      ],
    },
    {
      id: '2',
      name: 'Returns & Refunds',
      slug: 'returns',
      description: null,
      items: [
        {
          id: '2-1',
          question: 'What is your return policy?',
          answer: 'We accept returns within 30 days of delivery. Items must be unused and in original packaging. Visit the order details page to initiate a return.',
          category: 'returns',
          helpfulCount: 0,
          notHelpfulCount: 0,
        },
        {
          id: '2-2',
          question: 'How long does a refund take?',
          answer: 'Once we receive your return, refunds are processed within 5-7 business days. The refund will be credited to your original payment method.',
          category: 'returns',
          helpfulCount: 0,
          notHelpfulCount: 0,
        },
      ],
    },
    {
      id: '3',
      name: 'Account & Payment',
      slug: 'account',
      description: null,
      items: [
        {
          id: '3-1',
          question: 'How do I update my account information?',
          answer: 'Go to Profile Settings in your account to update your name, email, phone number, and other details.',
          category: 'account',
          helpfulCount: 0,
          notHelpfulCount: 0,
        },
        {
          id: '3-2',
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay.',
          category: 'account',
          helpfulCount: 0,
          notHelpfulCount: 0,
        },
      ],
    },
  ]

  return <FaqAccordion categories={defaultFaq} />
}

function TicketsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-20 rounded bg-[hsl(var(--portal-muted))]" />
            <div className="h-5 w-24 rounded-full bg-[hsl(var(--portal-muted))]" />
          </div>
          <div className="h-5 w-3/4 rounded bg-[hsl(var(--portal-muted))]" />
          <div className="flex items-center gap-2 mt-2">
            <div className="h-4 w-20 rounded-full bg-[hsl(var(--portal-muted))]" />
            <div className="h-4 w-24 rounded bg-[hsl(var(--portal-muted))]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FaqSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4"
        >
          <div className="h-5 w-2/3 rounded bg-[hsl(var(--portal-muted))]" />
        </div>
      ))}
    </div>
  )
}
