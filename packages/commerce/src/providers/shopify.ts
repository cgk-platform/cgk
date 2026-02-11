/**
 * Shopify Commerce Provider
 *
 * Implements the CommerceProvider interface using @cgk/shopify clients.
 */

import {
  createAdminClient,
  createStorefrontClient,
  type AdminClient,
  type StorefrontClient,
} from '@cgk/shopify'
import {
  listProducts as shopifyListProducts,
  getProductById,
  getProductByHandle,
  listOrders as shopifyListOrders,
  getOrder as shopifyGetOrder,
  listCustomers as shopifyListCustomers,
  getCustomer as shopifyGetCustomer,
  getCustomerOrders as shopifyGetCustomerOrders,
  createCart as shopifyCreateCart,
  getCart as shopifyGetCart,
  addCartLines,
  updateCartLines,
  removeCartLines,
} from '@cgk/shopify'
import type {
  ShopifyProduct,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyVariant,
  ShopifyImage,
  ShopifyLineItem,
  ShopifyCart,
  ShopifyAddress,
} from '@cgk/shopify'

import type {
  CommerceProvider,
  CommerceConfig,
  Product,
  ProductVariant,
  ProductImage,
  Address,
  Order,
  OrderLineItem,
  Customer,
  Cart,
  CartLine,
  Checkout,
  ListParams,
  Money,
} from '../types'

// ---------------------------------------------------------------------------
// Type Mapping: Shopify → Commerce
// ---------------------------------------------------------------------------

function mapMoney(money: { amount: string; currencyCode: string } | null | undefined): Money | undefined {
  if (!money) return undefined
  return { amount: money.amount, currencyCode: money.currencyCode }
}

function mapMoneyRequired(money: { amount: string; currencyCode: string }): Money {
  return { amount: money.amount, currencyCode: money.currencyCode }
}

function mapAddress(addr: ShopifyAddress | null | undefined): Address | undefined {
  if (!addr) return undefined
  return {
    firstName: addr.firstName ?? undefined,
    lastName: addr.lastName ?? undefined,
    address1: addr.address1 ?? undefined,
    address2: addr.address2 ?? undefined,
    city: addr.city ?? undefined,
    province: addr.province ?? undefined,
    provinceCode: addr.provinceCode ?? undefined,
    country: addr.country ?? undefined,
    countryCode: addr.countryCode ?? undefined,
    zip: addr.zip ?? undefined,
    phone: addr.phone ?? undefined,
  }
}

function mapImage(img: ShopifyImage | null | undefined): ProductImage | undefined {
  if (!img) return undefined
  return {
    id: img.id,
    url: img.url,
    altText: img.altText ?? undefined,
    width: img.width,
    height: img.height,
  }
}

function mapVariant(v: ShopifyVariant): ProductVariant {
  return {
    id: v.id,
    title: v.title,
    sku: v.sku ?? undefined,
    price: mapMoneyRequired(v.price),
    compareAtPrice: mapMoney(v.compareAtPrice),
    availableForSale: v.availableForSale,
    selectedOptions: v.selectedOptions,
    image: mapImage(v.image),
  }
}

function mapProduct(p: ShopifyProduct): Product {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    vendor: p.vendor,
    productType: p.productType,
    tags: p.tags,
    variants: p.variants.edges.map((e) => mapVariant(e.node)),
    images: p.images.edges.map((e) => ({
      id: e.node.id,
      url: e.node.url,
      altText: e.node.altText ?? undefined,
      width: e.node.width,
      height: e.node.height,
    })),
    priceRange: {
      minVariantPrice: mapMoneyRequired(p.priceRange.minVariantPrice),
      maxVariantPrice: mapMoneyRequired(p.priceRange.maxVariantPrice),
    },
    availableForSale: p.availableForSale,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

function mapOrder(o: ShopifyOrder): Order {
  return {
    id: o.id,
    orderNumber: o.name,
    email: o.email ?? undefined,
    totalPrice: mapMoneyRequired(o.totalPrice),
    subtotalPrice: mapMoneyRequired(o.subtotalPrice),
    totalTax: mapMoney(o.totalTax),
    totalShipping: mapMoney(o.totalShippingPrice),
    lineItems: o.lineItems.edges.map((e) => mapLineItem(e.node)),
    shippingAddress: mapAddress(o.shippingAddress),
    billingAddress: mapAddress(o.billingAddress),
    fulfillmentStatus: o.fulfillmentStatus,
    financialStatus: o.financialStatus,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

function mapLineItem(li: ShopifyLineItem): OrderLineItem {
  return {
    id: li.id,
    title: li.title,
    quantity: li.quantity,
    variant: li.variant ? mapVariant(li.variant) : undefined,
    price: mapMoneyRequired(li.originalUnitPrice),
    totalPrice: mapMoneyRequired(li.discountedTotalPrice),
  }
}

function mapCustomer(c: ShopifyCustomer): Customer {
  return {
    id: c.id,
    email: c.email ?? undefined,
    firstName: c.firstName ?? undefined,
    lastName: c.lastName ?? undefined,
    phone: c.phone ?? undefined,
    defaultAddress: mapAddress(c.defaultAddress),
    addresses: c.addresses.edges.map((e) => mapAddress(e.node)!),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

function mapCart(c: ShopifyCart): Cart {
  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity,
    cost: {
      subtotalAmount: mapMoneyRequired(c.cost.subtotalAmount),
      totalAmount: mapMoneyRequired(c.cost.totalAmount),
      totalTaxAmount: mapMoney(c.cost.totalTaxAmount),
    },
    lines: c.lines.edges.map((e): CartLine => ({
      id: e.node.id,
      quantity: e.node.quantity,
      merchandise: {
        id: e.node.merchandise.id,
        title: e.node.merchandise.title,
        sku: undefined,
        price: mapMoneyRequired(e.node.merchandise.price),
        availableForSale: true,
        selectedOptions: e.node.merchandise.selectedOptions,
        image: e.node.merchandise.image
          ? { id: e.node.merchandise.id, url: e.node.merchandise.image.url, altText: e.node.merchandise.image.altText ?? undefined }
          : undefined,
      },
      cost: {
        amountPerQuantity: mapMoneyRequired(e.node.cost.amountPerQuantity),
        totalAmount: mapMoneyRequired(e.node.cost.totalAmount),
      },
    })),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Shopify Provider Factory
// ---------------------------------------------------------------------------

export function createShopifyProvider(config: CommerceConfig): CommerceProvider {
  if (!config.storefrontAccessToken) {
    throw new Error('Shopify provider requires storefrontAccessToken')
  }

  const storefront: StorefrontClient = createStorefrontClient({
    storeDomain: config.storeDomain,
    storefrontAccessToken: config.storefrontAccessToken,
  })

  const admin: AdminClient | null = config.adminAccessToken
    ? createAdminClient({
        storeDomain: config.storeDomain,
        adminAccessToken: config.adminAccessToken,
      })
    : null

  function requireAdmin(): AdminClient {
    if (!admin) {
      throw new Error('Admin API operations require adminAccessToken in config')
    }
    return admin
  }

  return {
    name: 'shopify',

    products: {
      async list(params?: ListParams) {
        const result = await shopifyListProducts(storefront, {
          first: params?.first,
          after: params?.after,
          query: params?.query,
          sortKey: params?.sortKey as 'TITLE' | 'PRICE' | 'CREATED_AT' | 'UPDATED_AT' | 'BEST_SELLING' | undefined,
          reverse: params?.reverse,
        })
        return {
          items: result.products.map(mapProduct),
          pageInfo: result.pageInfo,
        }
      },

      async get(id: string) {
        const product = await getProductById(storefront, id)
        return product ? mapProduct(product) : null
      },

      async getByHandle(handle: string) {
        const product = await getProductByHandle(storefront, handle)
        return product ? mapProduct(product) : null
      },

      async search(query: string, params?: ListParams) {
        const result = await shopifyListProducts(storefront, {
          first: params?.first ?? 20,
          after: params?.after,
          query,
          reverse: params?.reverse,
        })
        return {
          items: result.products.map(mapProduct),
          pageInfo: result.pageInfo,
        }
      },
    },

    cart: {
      async create() {
        const cart = await shopifyCreateCart(storefront)
        return mapCart(cart)
      },

      async get(id: string) {
        const cart = await shopifyGetCart(storefront, id)
        return cart ? mapCart(cart) : null
      },

      async addItem(cartId: string, item) {
        const cart = await addCartLines(storefront, cartId, [
          { merchandiseId: item.merchandiseId, quantity: item.quantity, attributes: item.attributes?.map((a) => ({ key: a.key, value: a.value })) },
        ])
        return mapCart(cart)
      },

      async updateItem(cartId: string, lineId: string, quantity: number) {
        const cart = await updateCartLines(storefront, cartId, [
          { id: lineId, quantity },
        ])
        return mapCart(cart)
      },

      async removeItem(cartId: string, lineId: string) {
        const cart = await removeCartLines(storefront, cartId, [lineId])
        return mapCart(cart)
      },

      async setAttributes(_cartId: string, _attributes) {
        // Shopify cart attributes are set via cartAttributesUpdate mutation
        // For now, return current cart state
        throw new Error('Cart attributes not yet implemented for Shopify provider')
      },
    },

    checkout: {
      async create(cartId: string) {
        // Shopify uses cart's checkoutUrl directly - no separate checkout creation
        const cart = await shopifyGetCart(storefront, cartId)
        if (!cart) throw new Error(`Cart ${cartId} not found`)
        const mapped = mapCart(cart)
        return {
          id: mapped.id,
          webUrl: mapped.checkoutUrl,
          totalPrice: mapped.cost.totalAmount,
          subtotalPrice: mapped.cost.subtotalAmount,
          totalTax: mapped.cost.totalTaxAmount,
          lineItems: mapped.lines.map((line) => ({
            id: line.id,
            title: line.merchandise.title,
            quantity: line.quantity,
            variant: line.merchandise,
            price: line.cost.amountPerQuantity,
          })),
        }
      },

      async getUrl(checkoutId: string) {
        const cart = await shopifyGetCart(storefront, checkoutId)
        if (!cart) throw new Error(`Cart ${checkoutId} not found`)
        return cart.checkoutUrl
      },

      async applyDiscount(_checkoutId: string, _code: string): Promise<Checkout> {
        throw new Error('Discount application via Storefront API not yet implemented')
      },
    },

    orders: {
      async list(params?: ListParams) {
        const client = requireAdmin()
        const result = await shopifyListOrders(client, {
          first: params?.first,
          after: params?.after,
          query: params?.query,
          sortKey: params?.sortKey as 'CREATED_AT' | 'UPDATED_AT' | 'TOTAL_PRICE' | 'ORDER_NUMBER' | undefined,
          reverse: params?.reverse,
        })
        return {
          items: result.orders.map(mapOrder),
          pageInfo: result.pageInfo,
        }
      },

      async get(id: string) {
        const client = requireAdmin()
        const order = await shopifyGetOrder(client, id)
        return order ? mapOrder(order) : null
      },

      async cancel(_id: string, _reason?: string): Promise<Order> {
        throw new Error('Order cancellation requires Admin API mutation - not yet implemented')
      },

      async refund(_id: string, _amount: number): Promise<Order> {
        throw new Error('Order refund requires Admin API mutation - not yet implemented')
      },
    },

    customers: {
      async list(params?: ListParams) {
        const client = requireAdmin()
        const result = await shopifyListCustomers(client, {
          first: params?.first,
          after: params?.after,
          query: params?.query,
          sortKey: params?.sortKey as 'CREATED_AT' | 'UPDATED_AT' | 'NAME' | undefined,
          reverse: params?.reverse,
        })
        return {
          items: result.customers.map(mapCustomer),
          pageInfo: result.pageInfo,
        }
      },

      async get(id: string) {
        const client = requireAdmin()
        const customer = await shopifyGetCustomer(client, id)
        return customer ? mapCustomer(customer) : null
      },

      async getOrders(customerId: string, params?: ListParams) {
        const client = requireAdmin()
        const result = await shopifyGetCustomerOrders(client, customerId, {
          first: params?.first,
          after: params?.after,
        })
        return {
          items: result.orders.map(mapOrder),
          pageInfo: result.pageInfo,
        }
      },
    },

    discounts: {
      async validate(_code: string) {
        // Discount validation typically happens at checkout via Storefront API
        // or via Admin API for admin views
        throw new Error('Discount validation not yet implemented for Shopify provider')
      },

      async getActive() {
        throw new Error('Active discounts listing requires Admin API - not yet implemented')
      },
    },

    webhooks: {
      async handleOrderCreated(_payload: unknown) {
        // Webhook processing is handled by the jobs package
        // This is a passthrough that validates and routes
      },

      async handleOrderUpdated(_payload: unknown) {
        // Webhook processing is handled by the jobs package
      },

      async handleRefund(_payload: unknown) {
        // Webhook processing is handled by the jobs package
      },
    },
  }
}
