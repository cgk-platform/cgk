/**
 * Orders Page
 *
 * Displays customer order history with filtering, search, and pagination.
 * Server-rendered with client components for interactivity.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Tabs, TabsList, TabsTrigger } from '@cgk/ui'

import { getOrders } from '@/lib/account/api'
import { defaultContent } from '@/lib/account/content'
import type { OrderStatus } from '@/lib/account/types'

import { OrdersListClient, OrdersListSkeleton, OrdersSearch } from './components'

export const metadata: Metadata = {
  title: 'Order History',
  description: 'View and manage your order history',
}

export const dynamic = 'force-dynamic'

interface OrdersPageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const statusFilter = (params.status as OrderStatus | 'all') || 'all'
  const searchQuery = params.search || ''
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
            {defaultContent['orders.title']}
          </h1>
          <a
            href="/account"
            className="flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Account
          </a>
        </div>
        <p className="text-[hsl(var(--portal-muted-foreground))]">
          Track your orders and view order details
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <OrdersSearch initialQuery={searchQuery} />
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue={statusFilter} className="mb-6">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 h-auto">
          <TabsTrigger
            value="all"
            asChild
            className="rounded-full border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] px-4 py-2 text-sm font-medium data-[state=active]:bg-[hsl(var(--portal-primary))] data-[state=active]:text-[hsl(var(--portal-primary-foreground))] data-[state=active]:border-transparent"
          >
            <a href="/account/orders">{defaultContent['orders.filter_all']}</a>
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            asChild
            className="ml-2 rounded-full border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] px-4 py-2 text-sm font-medium data-[state=active]:bg-[hsl(var(--portal-primary))] data-[state=active]:text-[hsl(var(--portal-primary-foreground))] data-[state=active]:border-transparent"
          >
            <a href="/account/orders?status=pending">{defaultContent['orders.filter_pending']}</a>
          </TabsTrigger>
          <TabsTrigger
            value="shipped"
            asChild
            className="ml-2 rounded-full border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] px-4 py-2 text-sm font-medium data-[state=active]:bg-[hsl(var(--portal-primary))] data-[state=active]:text-[hsl(var(--portal-primary-foreground))] data-[state=active]:border-transparent"
          >
            <a href="/account/orders?status=shipped">{defaultContent['orders.filter_shipped']}</a>
          </TabsTrigger>
          <TabsTrigger
            value="delivered"
            asChild
            className="ml-2 rounded-full border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] px-4 py-2 text-sm font-medium data-[state=active]:bg-[hsl(var(--portal-primary))] data-[state=active]:text-[hsl(var(--portal-primary-foreground))] data-[state=active]:border-transparent"
          >
            <a href="/account/orders?status=delivered">{defaultContent['orders.filter_delivered']}</a>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders List */}
      <Suspense fallback={<OrdersListSkeleton />}>
        <OrdersList status={statusFilter} search={searchQuery} page={page} />
      </Suspense>
    </div>
  )
}

interface OrdersListProps {
  status: OrderStatus | 'all'
  search: string
  page: number
}

async function OrdersList({ status, search, page }: OrdersListProps) {
  const pageSize = 10
  const result = await getOrders(page, pageSize)

  // Filter by status if specified
  let filteredOrders = result.items
  if (status !== 'all') {
    filteredOrders = filteredOrders.filter((order) => order.status === status)
  }

  // Filter by search query
  if (search) {
    const searchLower = search.toLowerCase()
    filteredOrders = filteredOrders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.lineItems.some((item) =>
          item.title.toLowerCase().includes(searchLower)
        )
    )
  }

  return (
    <OrdersListClient
      orders={filteredOrders}
      total={result.total}
      page={page}
      pageSize={pageSize}
      hasMore={result.hasMore}
      content={defaultContent}
    />
  )
}
