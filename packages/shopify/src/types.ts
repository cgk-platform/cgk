/**
 * Shopify common types
 */

export interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description: string
  descriptionHtml: string
  vendor: string
  productType: string
  tags: string[]
  variants: ShopifyVariantConnection
  images: ShopifyImageConnection
  priceRange: ShopifyPriceRange
  availableForSale: boolean
  createdAt: string
  updatedAt: string
}

export interface ShopifyVariant {
  id: string
  title: string
  sku: string | null
  price: ShopifyMoney
  compareAtPrice: ShopifyMoney | null
  availableForSale: boolean
  selectedOptions: ShopifySelectedOption[]
  image: ShopifyImage | null
}

export interface ShopifyVariantConnection {
  edges: Array<{ node: ShopifyVariant }>
}

export interface ShopifyImage {
  id: string
  url: string
  altText: string | null
  width: number
  height: number
}

export interface ShopifyImageConnection {
  edges: Array<{ node: ShopifyImage }>
}

export interface ShopifyPriceRange {
  minVariantPrice: ShopifyMoney
  maxVariantPrice: ShopifyMoney
}

export interface ShopifyMoney {
  amount: string
  currencyCode: string
}

export interface ShopifySelectedOption {
  name: string
  value: string
}

export interface ShopifyOrder {
  id: string
  name: string
  orderNumber: number
  email: string | null
  totalPrice: ShopifyMoney
  subtotalPrice: ShopifyMoney
  totalTax: ShopifyMoney | null
  totalShippingPrice: ShopifyMoney | null
  lineItems: ShopifyLineItemConnection
  shippingAddress: ShopifyAddress | null
  billingAddress: ShopifyAddress | null
  fulfillmentStatus: string
  financialStatus: string
  createdAt: string
  updatedAt: string
}

export interface ShopifyLineItem {
  id: string
  title: string
  quantity: number
  variant: ShopifyVariant | null
  originalUnitPrice: ShopifyMoney
  discountedTotalPrice: ShopifyMoney
}

export interface ShopifyLineItemConnection {
  edges: Array<{ node: ShopifyLineItem }>
}

export interface ShopifyAddress {
  firstName: string | null
  lastName: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  provinceCode: string | null
  country: string | null
  countryCode: string | null
  zip: string | null
  phone: string | null
}

export interface ShopifyCustomer {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  defaultAddress: ShopifyAddress | null
  addresses: ShopifyAddressConnection
  orders: ShopifyOrderConnection
  createdAt: string
  updatedAt: string
}

export interface ShopifyAddressConnection {
  edges: Array<{ node: ShopifyAddress }>
}

export interface ShopifyOrderConnection {
  edges: Array<{ node: ShopifyOrder }>
}

export interface ShopifyCollection {
  id: string
  title: string
  handle: string
  description: string
  descriptionHtml: string
  image: ShopifyImage | null
  products: ShopifyProductConnection
}

export interface ShopifyProductConnection {
  edges: Array<{ node: ShopifyProduct }>
  pageInfo: ShopifyPageInfo
}

export interface ShopifyPageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}
