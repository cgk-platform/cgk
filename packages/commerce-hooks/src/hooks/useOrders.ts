'use client'

/**
 * Order Hooks
 *
 * Hooks for fetching and managing customer orders.
 *
 * @example
 * ```tsx
 * // List orders
 * const { orders, isLoading, loadMore } = useOrders(orderActions, { first: 10 })
 *
 * // Get single order
 * const { order, isLoading } = useOrder(orderActions, orderId)
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Order } from '@cgk-platform/commerce'
import type { UseOrdersOptions, UseOrdersReturn, OrderActions } from '../context/types'

/**
 * Hook for fetching customer orders
 *
 * @param actions - Order actions for server integration
 * @param options - Query options (pagination)
 *
 * @example
 * ```tsx
 * function OrderHistory() {
 *   const { orders, isLoading, hasNextPage, loadMore, error } = useOrders(
 *     orderActions,
 *     { first: 10 }
 *   )
 *
 *   if (isLoading && orders.length === 0) {
 *     return <OrderListSkeleton />
 *   }
 *
 *   if (error) {
 *     return <ErrorMessage error={error} />
 *   }
 *
 *   if (orders.length === 0) {
 *     return <EmptyState message="No orders yet" />
 *   }
 *
 *   return (
 *     <>
 *       <ul>
 *         {orders.map(order => (
 *           <OrderListItem key={order.id} order={order} />
 *         ))}
 *       </ul>
 *       {hasNextPage && (
 *         <button onClick={loadMore} disabled={isLoading}>
 *           {isLoading ? 'Loading...' : 'Load More Orders'}
 *         </button>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function useOrders(
  actions: OrderActions,
  options: UseOrdersOptions = {}
): UseOrdersReturn {
  const { skip = false, ...params } = options

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [endCursor, setEndCursor] = useState<string | null>(null)

  const paramsRef = useRef(params)
  paramsRef.current = params

  // Initial fetch
  useEffect(() => {
    if (skip) return

    let cancelled = false

    const fetchOrders = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await actions.getOrders(paramsRef.current)
        if (!cancelled) {
          setOrders(result.orders)
          setHasNextPage(result.hasNextPage)
          setEndCursor(result.endCursor)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch orders:', err)
          setError(err instanceof Error ? err.message : 'Failed to fetch orders')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchOrders()

    return () => {
      cancelled = true
    }
  }, [skip, actions])

  // Load more orders
  const loadMore = useCallback(async () => {
    if (!hasNextPage || !endCursor || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await actions.getOrders({
        ...paramsRef.current,
        after: endCursor,
      })

      setOrders((prev) => [...prev, ...result.orders])
      setHasNextPage(result.hasNextPage)
      setEndCursor(result.endCursor)
    } catch (err) {
      console.error('Failed to load more orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load more orders')
    } finally {
      setIsLoading(false)
    }
  }, [hasNextPage, endCursor, isLoading, actions])

  // Refetch from beginning
  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await actions.getOrders(paramsRef.current)
      setOrders(result.orders)
      setHasNextPage(result.hasNextPage)
      setEndCursor(result.endCursor)
    } catch (err) {
      console.error('Failed to refetch orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setIsLoading(false)
    }
  }, [actions])

  return {
    orders,
    isLoading,
    error,
    hasNextPage,
    loadMore,
    refetch,
  }
}

/**
 * Hook for fetching a single order by ID
 *
 * @param actions - Order actions for server integration
 * @param orderId - Order ID to fetch
 *
 * @example
 * ```tsx
 * function OrderDetails({ orderId }: { orderId: string }) {
 *   const { order, isLoading, error, refetch } = useOrder(orderActions, orderId)
 *
 *   if (isLoading) return <OrderDetailsSkeleton />
 *   if (error) return <ErrorMessage error={error} />
 *   if (!order) return <NotFound message="Order not found" />
 *
 *   return (
 *     <div>
 *       <h1>Order #{order.orderNumber}</h1>
 *       <OrderStatus status={order.fulfillmentStatus} />
 *       <OrderLineItems items={order.lineItems} />
 *       <OrderTotals order={order} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useOrder(actions: OrderActions, orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderIdRef = useRef(orderId)
  orderIdRef.current = orderId

  useEffect(() => {
    if (!orderId) {
      setOrder(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchOrder = async () => {
      setIsLoading(true)
      setError(null)
      setOrder(null)

      try {
        const result = await actions.getOrder(orderId)
        if (!cancelled) {
          setOrder(result)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch order:', err)
          setError(err instanceof Error ? err.message : 'Failed to fetch order')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchOrder()

    return () => {
      cancelled = true
    }
  }, [orderId, actions])

  const refetch = useCallback(async () => {
    if (!orderIdRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await actions.getOrder(orderIdRef.current)
      setOrder(result)
    } catch (err) {
      console.error('Failed to refetch order:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch order')
    } finally {
      setIsLoading(false)
    }
  }, [actions])

  return {
    order,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for order status display helpers
 *
 * @param order - Order object
 *
 * @example
 * ```tsx
 * function OrderStatusBadge({ order }: { order: Order }) {
 *   const {
 *     fulfillmentLabel,
 *     financialLabel,
 *     isComplete,
 *     isPending,
 *     isCancelled,
 *   } = useOrderStatus(order)
 *
 *   return (
 *     <div>
 *       <Badge variant={isComplete ? 'success' : isPending ? 'warning' : 'default'}>
 *         {fulfillmentLabel}
 *       </Badge>
 *       <Badge>{financialLabel}</Badge>
 *     </div>
 *   )
 * }
 * ```
 */
export function useOrderStatus(order: Order | null) {
  if (!order) {
    return {
      fulfillmentLabel: '-',
      financialLabel: '-',
      isComplete: false,
      isPending: false,
      isCancelled: false,
      isRefunded: false,
    }
  }

  const fulfillmentStatus = order.fulfillmentStatus.toLowerCase()
  const financialStatus = order.financialStatus.toLowerCase()

  const fulfillmentLabels: Record<string, string> = {
    fulfilled: 'Fulfilled',
    unfulfilled: 'Unfulfilled',
    partial: 'Partially Fulfilled',
    restocked: 'Restocked',
  }

  const financialLabels: Record<string, string> = {
    paid: 'Paid',
    pending: 'Payment Pending',
    refunded: 'Refunded',
    partially_refunded: 'Partially Refunded',
    voided: 'Voided',
  }

  return {
    fulfillmentLabel: fulfillmentLabels[fulfillmentStatus] ?? order.fulfillmentStatus,
    financialLabel: financialLabels[financialStatus] ?? order.financialStatus,
    isComplete: fulfillmentStatus === 'fulfilled' && financialStatus === 'paid',
    isPending: fulfillmentStatus === 'unfulfilled' || financialStatus === 'pending',
    isCancelled: financialStatus === 'voided',
    isRefunded: financialStatus === 'refunded' || financialStatus === 'partially_refunded',
  }
}
