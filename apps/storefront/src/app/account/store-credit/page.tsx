/**
 * Store Credit Page
 *
 * Displays store credit balance and transaction history.
 */

import { cn, formatCurrency } from '@cgk-platform/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { getStoreCredit } from '@/lib/account/api'
import { defaultContent, getContent, storeCreditTransactionLabels } from '@/lib/account/content'
import type { StoreCreditTransactionType } from '@/lib/account/types'

export const metadata: Metadata = {
  title: 'Store Credit',
  description: 'View your store credit balance and history',
}

export const dynamic = 'force-dynamic'

export default async function StoreCreditPage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold tracking-tight lg:text-3xl"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            {getContent(defaultContent, 'store_credit.title')}
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
          {getContent(defaultContent, 'store_credit.available_balance')}
        </p>
      </div>

      {/* Store Credit Content */}
      <Suspense fallback={<StoreCreditSkeleton />}>
        <StoreCreditContent />
      </Suspense>
    </div>
  )
}

async function StoreCreditContent() {
  const account = await getStoreCredit()

  if (account.balanceCents === 0 && account.transactions.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl',
          'border border-dashed border-[hsl(var(--portal-border))]',
          'bg-[hsl(var(--portal-muted))]/30 px-8 py-16 text-center'
        )}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">{getContent(defaultContent, 'store_credit.empty')}</h3>
        <p className="mt-2 max-w-sm text-sm text-[hsl(var(--portal-muted-foreground))]">
          {getContent(defaultContent, 'store_credit.empty_description')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <section
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-primary))]/80',
          'p-8 text-[hsl(var(--portal-primary-foreground))]'
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="400" height="200" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative">
          <p className="text-sm font-medium opacity-90">
            {getContent(defaultContent, 'store_credit.balance')}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            {formatCurrency(account.balanceCents / 100, account.currencyCode)}
          </p>
          <p className="mt-2 text-sm opacity-75">
            Last updated: {new Date(account.lastUpdated).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Decorative Card Icons */}
        <div className="absolute right-6 top-6 opacity-20">
          <svg className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
      </section>

      {/* Transaction History */}
      <section
        className={cn(
          'rounded-xl border border-[hsl(var(--portal-border))]',
          'bg-[hsl(var(--portal-card))] overflow-hidden'
        )}
      >
        <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
          <h2 className="font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
            {getContent(defaultContent, 'store_credit.history')}
          </h2>
        </div>

        {account.transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--portal-muted-foreground))]">
            No transactions yet
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--portal-border))]">
            {account.transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface TransactionRowProps {
  transaction: {
    id: string
    type: StoreCreditTransactionType
    amountCents: number
    balanceAfterCents: number
    description: string
    orderId: string | null
    createdAt: string
    expiresAt: string | null
  }
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const isCredit = transaction.amountCents > 0
  const typeLabel = storeCreditTransactionLabels[transaction.type] || transaction.type

  const typeConfig = getTransactionTypeConfig(transaction.type)

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[hsl(var(--portal-muted))]/30 transition-colors">
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          typeConfig.bgColor
        )}
      >
        <span className={typeConfig.iconColor}>{typeConfig.icon}</span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{typeLabel}</p>
        <p className="mt-0.5 truncate text-sm text-[hsl(var(--portal-muted-foreground))]">
          {transaction.description}
        </p>
        <p className="mt-0.5 text-xs text-[hsl(var(--portal-muted-foreground))]">
          {new Date(transaction.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {transaction.orderId && (
            <>
              {' '}-{' '}
              <Link
                href={`/account/orders/${transaction.orderId}`}
                className="text-[hsl(var(--portal-primary))] hover:underline"
              >
                View Order
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p
          className={cn(
            'font-semibold',
            isCredit ? 'text-green-600' : 'text-red-600'
          )}
        >
          {isCredit ? '+' : ''}{formatCurrency(transaction.amountCents / 100, 'USD')}
        </p>
        <p className="text-xs text-[hsl(var(--portal-muted-foreground))]">
          Balance: {formatCurrency(transaction.balanceAfterCents / 100, 'USD')}
        </p>
      </div>
    </div>
  )
}

function getTransactionTypeConfig(type: StoreCreditTransactionType) {
  switch (type) {
    case 'credit_added':
    case 'refund':
    case 'gift_card_redemption':
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        ),
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
      }
    case 'used_at_checkout':
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        ),
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
      }
    case 'expired':
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-stone-100',
        iconColor: 'text-stone-500',
      }
    case 'adjustment':
    default:
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
        ),
        bgColor: 'bg-amber-100',
        iconColor: 'text-amber-600',
      }
  }
}

function StoreCreditSkeleton() {
  return (
    <div className="space-y-6">
      {/* Balance Card Skeleton */}
      <div className="animate-pulse rounded-2xl bg-[hsl(var(--portal-muted))] p-8">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-[hsl(var(--portal-muted))]/70" />
          <div className="h-10 w-32 rounded bg-[hsl(var(--portal-muted))]/70" />
          <div className="h-4 w-48 rounded bg-[hsl(var(--portal-muted))]/70" />
        </div>
      </div>

      {/* Transaction History Skeleton */}
      <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] overflow-hidden">
        <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
          <div className="h-5 w-36 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
        </div>
        <div className="divide-y divide-[hsl(var(--portal-border))]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[hsl(var(--portal-muted))]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
                <div className="h-3 w-48 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
              </div>
              <div className="text-right space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
                <div className="h-3 w-20 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
