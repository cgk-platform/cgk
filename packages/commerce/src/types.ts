/**
 * Commerce provider interface and configuration
 */

export interface CommerceConfig {
  provider: 'shopify' | 'custom'
  storeDomain: string
  storefrontAccessToken?: string
  adminAccessToken?: string
}

export interface CommerceProvider {
  readonly name: string
  readonly config: CommerceConfig

  // Product operations
  getProduct(id: string): Promise<Product | null>
  getProducts(options?: GetProductsOptions): Promise<Product[]>

  // Order operations
  getOrder(id: string): Promise<Order | null>
  getOrders(options?: GetOrdersOptions): Promise<Order[]>

  // Cart operations
  createCart(): Promise<Cart>
  addToCart(cartId: string, item: CartItemInput): Promise<Cart>
  removeFromCart(cartId: string, lineId: string): Promise<Cart>

  // Checkout operations
  createCheckout(cartId: string): Promise<Checkout>
}

export interface GetProductsOptions {
  first?: number
  after?: string
  query?: string
  sortKey?: 'TITLE' | 'PRICE' | 'CREATED_AT' | 'UPDATED_AT'
  reverse?: boolean
}

export interface GetOrdersOptions {
  first?: number
  after?: string
  query?: string
}

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
  lines: CartItem[]
  createdAt: string
  updatedAt: string
}

export interface CartCost {
  subtotalAmount: Money
  totalAmount: Money
  totalTaxAmount?: Money
}

export interface CartItem {
  id: string
  quantity: number
  merchandise: ProductVariant
  cost: CartItemCost
}

export interface CartItemCost {
  amountPerQuantity: Money
  totalAmount: Money
}

export interface CartItemInput {
  merchandiseId: string
  quantity: number
  attributes?: { key: string; value: string }[]
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
