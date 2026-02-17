'use client'

/**
 * Commerce Provider
 *
 * Top-level provider that initializes commerce context and configuration.
 * Wraps CartProvider with additional commerce features.
 *
 * @example
 * ```tsx
 * // In your app layout
 * import { CommerceProvider } from '@cgk-platform/commerce-hooks'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <CommerceProvider
 *       config={commerceConfig}
 *       actions={cartActions}
 *       tenantSlug="my-store"
 *     >
 *       {children}
 *     </CommerceProvider>
 *   )
 * }
 * ```
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Cart } from '@cgk-platform/commerce'
import { CartProvider } from '../context/CartProvider'
import type { CommerceActions, ProductActions, OrderActions, DiscountActions } from '../context/types'

// ---------------------------------------------------------------------------
// Commerce Context
// ---------------------------------------------------------------------------

export interface CommerceConfig {
  /** Commerce provider type */
  provider: 'shopify' | 'custom'
  /** Store domain */
  storeDomain?: string
  /** Currency code for display */
  currencyCode?: string
  /** Locale for formatting */
  locale?: string
}

interface CommerceContextValue {
  config: CommerceConfig
  productActions?: ProductActions
  orderActions?: OrderActions
  discountActions?: DiscountActions
}

const CommerceContext = createContext<CommerceContextValue | null>(null)

CommerceContext.displayName = 'CommerceContext'

// ---------------------------------------------------------------------------
// Commerce Provider Component
// ---------------------------------------------------------------------------

export interface CommerceProviderProps {
  children: ReactNode
  /** Commerce configuration */
  config?: CommerceConfig
  /** Server actions for commerce operations */
  actions: CommerceActions
  /** Initial cart data from server */
  initialCart?: Cart | null
  /** Tenant slug for attribution */
  tenantSlug: string
}

/**
 * Commerce Provider
 *
 * Provides commerce context including cart, product, and order operations.
 *
 * @example
 * ```tsx
 * import { CommerceProvider } from '@cgk-platform/commerce-hooks'
 * import { cartActions, productActions, orderActions } from '@/lib/commerce/actions'
 *
 * export default function Layout({ children }) {
 *   return (
 *     <CommerceProvider
 *       config={{ provider: 'shopify', currencyCode: 'USD' }}
 *       actions={{
 *         cart: cartActions,
 *         products: productActions,
 *         orders: orderActions,
 *       }}
 *       tenantSlug="my-store"
 *     >
 *       {children}
 *     </CommerceProvider>
 *   )
 * }
 * ```
 */
export function CommerceProvider({
  children,
  config = { provider: 'shopify' },
  actions,
  initialCart,
  tenantSlug,
}: CommerceProviderProps) {
  const contextValue = useMemo(
    () => ({
      config,
      productActions: actions.products,
      orderActions: actions.orders,
      discountActions: actions.discounts,
    }),
    [config, actions.products, actions.orders, actions.discounts]
  )

  return (
    <CommerceContext.Provider value={contextValue}>
      <CartProvider
        actions={actions.cart}
        initialCart={initialCart}
        tenantSlug={tenantSlug}
      >
        {children}
      </CartProvider>
    </CommerceContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook to access commerce configuration
 *
 * @throws Error if used outside CommerceProvider
 *
 * @example
 * ```tsx
 * function PriceDisplay({ amount }: { amount: string }) {
 *   const { config } = useCommerce()
 *
 *   return new Intl.NumberFormat(config.locale, {
 *     style: 'currency',
 *     currency: config.currencyCode,
 *   }).format(parseFloat(amount))
 * }
 * ```
 */
export function useCommerce(): CommerceContextValue {
  const context = useContext(CommerceContext)

  if (!context) {
    throw new Error('useCommerce must be used within a CommerceProvider')
  }

  return context
}

/**
 * Hook to access commerce configuration safely
 *
 * Returns null if used outside CommerceProvider instead of throwing.
 *
 * @example
 * ```tsx
 * function OptionalFeature() {
 *   const commerce = useCommerceOptional()
 *
 *   if (!commerce) {
 *     return null // Feature disabled outside commerce context
 *   }
 *
 *   return <FeatureContent config={commerce.config} />
 * }
 * ```
 */
export function useCommerceOptional(): CommerceContextValue | null {
  return useContext(CommerceContext)
}

/**
 * Hook to get product actions
 *
 * @throws Error if product actions not provided to CommerceProvider
 *
 * @example
 * ```tsx
 * function ProductSearch() {
 *   const productActions = useProductActions()
 *   const [query, setQuery] = useState('')
 *   const { products } = useProductSearch(productActions, query)
 *
 *   return <SearchUI products={products} onSearch={setQuery} />
 * }
 * ```
 */
export function useProductActions(): ProductActions {
  const context = useContext(CommerceContext)

  if (!context?.productActions) {
    throw new Error(
      'useProductActions requires productActions to be provided to CommerceProvider'
    )
  }

  return context.productActions
}

/**
 * Hook to get order actions
 *
 * @throws Error if order actions not provided to CommerceProvider
 *
 * @example
 * ```tsx
 * function OrderHistory() {
 *   const orderActions = useOrderActions()
 *   const { orders, isLoading } = useOrders(orderActions)
 *
 *   return <OrderList orders={orders} isLoading={isLoading} />
 * }
 * ```
 */
export function useOrderActions(): OrderActions {
  const context = useContext(CommerceContext)

  if (!context?.orderActions) {
    throw new Error(
      'useOrderActions requires orderActions to be provided to CommerceProvider'
    )
  }

  return context.orderActions
}

/**
 * Hook to get discount actions
 *
 * @throws Error if discount actions not provided to CommerceProvider
 *
 * @example
 * ```tsx
 * function DiscountInput() {
 *   const discountActions = useDiscountActions()
 *   const { validate, discount, error } = useDiscountCode(discountActions)
 *
 *   return <DiscountForm onValidate={validate} discount={discount} error={error} />
 * }
 * ```
 */
export function useDiscountActions(): DiscountActions {
  const context = useContext(CommerceContext)

  if (!context?.discountActions) {
    throw new Error(
      'useDiscountActions requires discountActions to be provided to CommerceProvider'
    )
  }

  return context.discountActions
}
