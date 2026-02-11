/**
 * Commerce provider interface and types
 *
 * Defines the provider-agnostic abstraction layer for commerce operations.
 * Implementations exist for Shopify (primary) and Custom+Stripe (future).
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface CommerceConfig {
  provider: 'shopify' | 'custom'
  storeDomain: string
  storefrontAccessToken?: string
  adminAccessToken?: string
}

// ---------------------------------------------------------------------------
// Commerce Provider Interface
// ---------------------------------------------------------------------------

export interface CommerceProvider {
  readonly name: 'shopify' | 'custom'

  products: ProductOperations
  cart: CartOperations
  checkout: CheckoutOperations
  orders: OrderOperations
  customers: CustomerOperations
  discounts: DiscountOperations
  webhooks: WebhookHandler
}

// ---------------------------------------------------------------------------
// Operation Interfaces
// ---------------------------------------------------------------------------

export interface ProductOperations {
  list(params?: ListParams): Promise<PaginatedResult<Product>>
  get(id: string): Promise<Product | null>
  getByHandle(handle: string): Promise<Product | null>
  search(query: string, params?: ListParams): Promise<PaginatedResult<Product>>
}

export interface CartOperations {
  create(): Promise<Cart>
  get(id: string): Promise<Cart | null>
  addItem(cartId: string, item: CartItemInput): Promise<Cart>
  updateItem(cartId: string, lineId: string, quantity: number): Promise<Cart>
  removeItem(cartId: string, lineId: string): Promise<Cart>
  setAttributes(cartId: string, attributes: CartAttribute[]): Promise<Cart>
}

export interface CheckoutOperations {
  create(cartId: string): Promise<Checkout>
  getUrl(checkoutId: string): Promise<string>
  applyDiscount(checkoutId: string, code: string): Promise<Checkout>
}

export interface OrderOperations {
  list(params?: ListParams): Promise<PaginatedResult<Order>>
  get(id: string): Promise<Order | null>
  cancel(id: string, reason?: string): Promise<Order>
  refund(id: string, amount: number): Promise<Order>
}

export interface CustomerOperations {
  list(params?: ListParams): Promise<PaginatedResult<Customer>>
  get(id: string): Promise<Customer | null>
  getOrders(customerId: string, params?: ListParams): Promise<PaginatedResult<Order>>
}

export interface DiscountOperations {
  validate(code: string): Promise<Discount | null>
  getActive(): Promise<Discount[]>
}

export interface WebhookHandler {
  handleOrderCreated(payload: unknown): Promise<void>
  handleOrderUpdated(payload: unknown): Promise<void>
  handleRefund(payload: unknown): Promise<void>
}

// ---------------------------------------------------------------------------
// Shared Params
// ---------------------------------------------------------------------------

export interface ListParams {
  first?: number
  after?: string
  query?: string
  sortKey?: string
  reverse?: boolean
}

export interface PaginatedResult<T> {
  items: T[]
  pageInfo: PageInfo
}

export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

// ---------------------------------------------------------------------------
// Domain Models
// ---------------------------------------------------------------------------

export interface Product {
  id: string
  title: string
  handle: string
  description: string
  descriptionHtml?: string
  vendor?: string
  productType?: string
  tags: string[]
  variants: ProductVariant[]
  images: ProductImage[]
  priceRange: PriceRange
  availableForSale: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id: string
  title: string
  sku?: string
  price: Money
  compareAtPrice?: Money
  availableForSale: boolean
  selectedOptions: SelectedOption[]
  image?: ProductImage
}

export interface ProductImage {
  id: string
  url: string
  altText?: string
  width?: number
  height?: number
}

export interface PriceRange {
  minVariantPrice: Money
  maxVariantPrice: Money
}

export interface Money {
  amount: string
  currencyCode: string
}

export interface SelectedOption {
  name: string
  value: string
}

export interface Order {
  id: string
  orderNumber: string
  email?: string
  totalPrice: Money
  subtotalPrice: Money
  totalTax?: Money
  totalShipping?: Money
  lineItems: OrderLineItem[]
  shippingAddress?: Address
  billingAddress?: Address
  fulfillmentStatus: string
  financialStatus: string
  createdAt: string
  updatedAt: string
}

export interface OrderLineItem {
  id: string
  title: string
  quantity: number
  variant?: ProductVariant
  price: Money
  totalPrice: Money
}

export interface Customer {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  defaultAddress?: Address
  addresses: Address[]
  createdAt: string
  updatedAt: string
}

export interface Address {
  firstName?: string
  lastName?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  provinceCode?: string
  country?: string
  countryCode?: string
  zip?: string
  phone?: string
}

export interface Cart {
  id: string
  checkoutUrl: string
  totalQuantity: number
  cost: CartCost
  lines: CartLine[]
  createdAt: string
  updatedAt: string
}

export interface CartCost {
  subtotalAmount: Money
  totalAmount: Money
  totalTaxAmount?: Money
}

export interface CartLine {
  id: string
  quantity: number
  merchandise: ProductVariant
  cost: CartLineCost
}

export interface CartLineCost {
  amountPerQuantity: Money
  totalAmount: Money
}

export interface CartItemInput {
  merchandiseId: string
  quantity: number
  attributes?: CartAttribute[]
}

export interface CartAttribute {
  key: string
  value: string
}

export interface Checkout {
  id: string
  webUrl: string
  totalPrice: Money
  subtotalPrice: Money
  totalTax?: Money
  lineItems: CheckoutLineItem[]
  shippingAddress?: Address
  completedAt?: string
}

export interface CheckoutLineItem {
  id: string
  title: string
  quantity: number
  variant?: ProductVariant
  price: Money
}

export interface Discount {
  code: string
  type: 'percentage' | 'fixed_amount' | 'free_shipping'
  value: number
  minimumRequirement?: Money
  startsAt?: string
  endsAt?: string
  usageCount: number
  usageLimit?: number
}
