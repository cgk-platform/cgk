/**
 * Support Ticket Detail Page
 *
 * Displays ticket details with full message thread and reply form.
 */

import { cn } from '@cgk-platform/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { StatusBadge } from '@/components/account/StatusBadge'
import { getTicket } from '@/lib/account/api'
import { ticketCategoryLabels } from '@/lib/account/content'
import type { SupportTicket, TicketMessage } from '@/lib/account/types'

import { TicketReplyForm, CloseTicketButton } from './components'

export const metadata: Metadata = {
  title: 'Support Ticket',
  description: 'View and reply to your support ticket',
}

export const dynamic = 'force-dynamic'

interface TicketDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params

  let ticket: SupportTicket

  try {
    ticket = await getTicket(id)
  } catch {
    notFound()
  }

  const isOpen = ['open', 'in_progress', 'waiting_customer'].includes(ticket.status)

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <Link
          href="/account/support"
          className="inline-flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))] mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Support
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[hsl(var(--portal-muted-foreground))]">
                {ticket.ticketNumber}
              </span>
              <StatusBadge type="ticket" status={ticket.status} />
            </div>
            <h1
              className="text-xl font-bold tracking-tight lg:text-2xl"
              style={{ fontFamily: 'var(--portal-heading-font)' }}
            >
              {ticket.subject}
            </h1>
          </div>

          {isOpen && (
            <CloseTicketButton ticketId={ticket.id} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-[hsl(var(--portal-muted-foreground))]">
          <span className="inline-flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            {ticketCategoryLabels[ticket.category] ?? ticket.category}
          </span>
          <span className="inline-flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Created {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
          {ticket.orderId && (
            <Link
              href={`/account/orders/${ticket.orderId}`}
              className="inline-flex items-center gap-1 text-[hsl(var(--portal-primary))] hover:underline"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              View Related Order
            </Link>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <div className="space-y-4 mb-8">
        {ticket.messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isFirst={index === 0}
          />
        ))}
      </div>

      {/* Reply Form or Closed Notice */}
      {isOpen ? (
        <div className="sticky bottom-0 bg-[hsl(var(--portal-background))] pt-4 pb-6 -mx-4 px-4 border-t border-[hsl(var(--portal-border))]">
          <TicketReplyForm ticketId={ticket.id} />
        </div>
      ) : (
        <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[hsl(var(--portal-muted-foreground))]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-[hsl(var(--portal-muted-foreground))]">
            This ticket has been {ticket.status === 'resolved' ? 'resolved' : 'closed'}.
          </p>
          <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
            Need more help?{' '}
            <Link href="/account/support/new" className="text-[hsl(var(--portal-primary))] hover:underline">
              Create a new ticket
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: TicketMessage
  isFirst?: boolean
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isCustomer = message.isFromCustomer

  return (
    <div
      className={cn(
        'flex',
        isCustomer ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] lg:max-w-[70%] rounded-2xl px-4 py-3',
          isCustomer
            ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]'
            : 'bg-[hsl(var(--portal-card))] border border-[hsl(var(--portal-border))]'
        )}
      >
        {/* Author and time */}
        <div className={cn(
          'flex items-center gap-2 mb-1 text-xs',
          isCustomer ? 'text-[hsl(var(--portal-primary-foreground))]/70' : 'text-[hsl(var(--portal-muted-foreground))]'
        )}>
          <span className="font-medium">{message.authorName}</span>
          <span>
            {new Date(message.createdAt).toLocaleString()}
          </span>
        </div>

        {/* Message content */}
        <div className="whitespace-pre-wrap text-sm">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-lg p-2 text-xs',
                  isCustomer
                    ? 'bg-white/10 hover:bg-white/20'
                    : 'bg-[hsl(var(--portal-muted))] hover:bg-[hsl(var(--portal-muted))]/80'
                )}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <span className="truncate">{attachment.fileName}</span>
                <span className="flex-shrink-0 text-[10px]">
                  ({Math.round(attachment.fileSize / 1024)}KB)
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
