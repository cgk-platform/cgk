/**
 * Orders Page Components
 *
 * Client components for orders list interactivity.
 */

'use client'

import { Button, cn } from '@cgk/ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import { CancelOrderModal } from '@/components/account/CancelOrderModal'
import { EmptyState, EmptyStateIcons } from '@/components/account/EmptyState'
import { OrderCard } from '@/components/account/OrderCard'
import { ReturnRequestModal } from '@/components/account/ReturnRequestModal'
import { cancelOrder, requestReturn } from '@/lib/account/api'
import type {
  CancellationReason,
  Order,
  PortalContentStrings,
  ReturnReason,
  ReturnRequestItem,
} from '@/lib/account/types'

interface OrdersSearchProps {
  initialQuery: string
}

export function OrdersSearch({ initialQuery }: OrdersSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    params.delete('page') // Reset to first page on search
    startTransition(() => {
      router.push(`/account/orders?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <svg
        className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by order number or product name..."
        className={cn(
          'w-full rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
          'py-3 pl-12 pr-4 text-sm',
          'placeholder:text-[hsl(var(--portal-muted-foreground))]',
          'focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))]',
          'transition-all duration-200',
          isPending && 'opacity-70'
        )}
      />
      {isPending && (
        <svg
          className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[hsl(var(--portal-primary))]"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
    </div>
  )
}

interface OrdersListClientProps {
  orders: Order[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  content: PortalContentStrings
}

export function OrdersListClient({
  orders,
  total,
  page,
  pageSize,
  hasMore,
  content,
}: OrdersListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null)
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null)

  const handleCancelOrder = async (
    reason: CancellationReason,
    details: string | null
  ) => {
    if (!cancelModalOrder) return
    await cancelOrder({
      orderId: cancelModalOrder.id,
      reason,
      reasonDetails: details,
    })
    router.refresh()
  }

  const handleReturnRequest = async (
    items: ReturnRequestItem[],
    reason: ReturnReason,
    details: string | null,
    resolution: 'refund' | 'exchange' | 'store_credit'
  ) => {
    if (!returnModalOrder) return
    await requestReturn({
      orderId: returnModalOrder.id,
      items,
      reason,
      reasonDetails: details,
      preferredResolution: resolution,
    })
    router.refresh()
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/account/orders?${params.toString()}`)
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={EmptyStateIcons.orders}
        title={content['orders.empty']}
        description={content['orders.empty_description']}
        action={
          <Link
            href="/products"
            className={cn(
              'inline-flex items-center justify-center',
              'rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3',
              'text-sm font-medium text-[hsl(var(--portal-primary-foreground))]',
              'transition-colors hover:bg-[hsl(var(--portal-primary))]/90',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))] focus:ring-offset-2'
            )}
          >
            {content['common.start_shopping']}
          </Link>
        }
      />
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onCancelClick={setCancelModalOrder}
            onReturnClick={setReturnModalOrder}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, total)} of {total} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg"
            >
              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 1 && p <= page + 1)
                )
                .map((p, i, arr) => (
                  <span key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && (
                      <span className="px-2 text-[hsl(var(--portal-muted-foreground))]">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(p)}
                      className={cn(
                        'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                        p === page
                          ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]'
                          : 'hover:bg-[hsl(var(--portal-muted))]'
                      )}
                    >
                      {p}
                    </button>
                  </span>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasMore}
              className="rounded-lg"
            >
              Next
              <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOrder && (
        <CancelOrderModal
          isOpen={!!cancelModalOrder}
          onClose={() => setCancelModalOrder(null)}
          order={cancelModalOrder}
          content={content}
          onConfirm={handleCancelOrder}
        />
      )}

      {/* Return Request Modal */}
      {returnModalOrder && (
        <ReturnRequestModal
          isOpen={!!returnModalOrder}
          onClose={() => setReturnModalOrder(null)}
          order={returnModalOrder}
          content={content}
          onSubmit={handleReturnRequest}
        />
      )}
    </div>
  )
}

export function OrdersListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]"
        >
          <div className="border-b border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-5 w-24 rounded bg-[hsl(var(--portal-muted))]" />
                <div className="h-4 w-20 rounded bg-[hsl(var(--portal-muted))]" />
              </div>
              <div className="h-6 w-20 rounded-full bg-[hsl(var(--portal-muted))]" />
            </div>
          </div>
          <div className="p-6">
            <div className="flex gap-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg bg-[hsl(var(--portal-muted))]" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/20 px-6 py-4">
            <div className="h-5 w-24 rounded bg-[hsl(var(--portal-muted))]" />
            <div className="h-8 w-24 rounded-lg bg-[hsl(var(--portal-muted))]" />
          </div>
        </div>
      ))}
    </div>
  )
}
