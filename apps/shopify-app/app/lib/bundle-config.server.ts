/**
 * Bundle Configuration Server Helpers
 *
 * Admin API CRUD for bundle discount metafield configuration.
 * Used by the admin app page to manage bundle rules.
 */

export interface TierConfig {
  count: number
  discount: number
}

export interface BundleConfig {
  bundleId: string
  discountType: 'percentage' | 'fixed'
  tiers: TierConfig[]
  freeGiftVariantIds: string[]
}

export interface BundleDiscountConfig {
  bundles: BundleConfig[]
}

const DISCOUNT_METAFIELD_NAMESPACE = '$app:bundle-discount'
const DISCOUNT_METAFIELD_KEY = 'config'
const TRANSFORM_METAFIELD_NAMESPACE = '$app:bundle-transform'
const TRANSFORM_METAFIELD_KEY = 'config'

/**
 * Fetches all automatic app discounts that use our bundle discount function.
 */
export async function listBundleDiscounts(admin: {
  graphql: (query: string) => Promise<Response>
}) {
  const response = await admin.graphql(`
    query {
      discountAutomaticNodes(first: 50, query: "type:app") {
        nodes {
          id
          automaticDiscount {
            ... on DiscountAutomaticApp {
              title
              status
              combinesWith {
                orderDiscounts
                productDiscounts
                shippingDiscounts
              }
              discountId
            }
          }
          metafield(namespace: "${DISCOUNT_METAFIELD_NAMESPACE}", key: "${DISCOUNT_METAFIELD_KEY}") {
            id
            value
          }
        }
      }
    }
  `)

  const data = await response.json()
  return data.data?.discountAutomaticNodes?.nodes ?? []
}

/**
 * Creates an automatic discount with our bundle discount function.
 */
export async function createBundleDiscount(
  admin: { graphql: (query: string) => Promise<Response> },
  opts: {
    title: string
    functionId: string
    config: BundleDiscountConfig
    combinesWith?: {
      orderDiscounts?: boolean
      productDiscounts?: boolean
      shippingDiscounts?: boolean
    }
  }
) {
  const configValue = JSON.stringify(opts.config)
  const combinesWith = opts.combinesWith ?? {
    orderDiscounts: true,
    productDiscounts: false,
    shippingDiscounts: true,
  }

  const response = await admin.graphql(`
    mutation {
      discountAutomaticAppCreate(
        automaticAppDiscount: {
          title: ${JSON.stringify(opts.title)}
          functionId: ${JSON.stringify(opts.functionId)}
          combinesWith: {
            orderDiscounts: ${combinesWith.orderDiscounts}
            productDiscounts: ${combinesWith.productDiscounts}
            shippingDiscounts: ${combinesWith.shippingDiscounts}
          }
          metafields: [{
            namespace: "${DISCOUNT_METAFIELD_NAMESPACE}"
            key: "${DISCOUNT_METAFIELD_KEY}"
            type: "json"
            value: ${JSON.stringify(configValue)}
          }]
        }
      ) {
        automaticAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }
  `)

  return response.json()
}

/**
 * Updates the bundle discount metafield on an existing automatic discount.
 */
export async function updateBundleDiscountConfig(
  admin: { graphql: (query: string) => Promise<Response> },
  opts: {
    discountId: string
    title?: string
    config: BundleDiscountConfig
  }
) {
  const configValue = JSON.stringify(opts.config)

  const titleMutation = opts.title
    ? `title: ${JSON.stringify(opts.title)}`
    : ''

  const response = await admin.graphql(`
    mutation {
      discountAutomaticAppUpdate(
        id: ${JSON.stringify(opts.discountId)}
        automaticAppDiscount: {
          ${titleMutation}
          metafields: [{
            namespace: "${DISCOUNT_METAFIELD_NAMESPACE}"
            key: "${DISCOUNT_METAFIELD_KEY}"
            type: "json"
            value: ${JSON.stringify(configValue)}
          }]
        }
      ) {
        automaticAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }
  `)

  return response.json()
}

/**
 * Deletes an automatic bundle discount.
 */
export async function deleteBundleDiscount(
  admin: { graphql: (query: string) => Promise<Response> },
  discountId: string
) {
  const response = await admin.graphql(`
    mutation {
      discountAutomaticDelete(id: ${JSON.stringify(discountId)}) {
        deletedAutomaticDiscountId
        userErrors {
          field
          message
        }
      }
    }
  `)

  return response.json()
}

/**
 * Parses bundle configuration from a metafield value string.
 */
export function parseBundleConfig(
  metafieldValue: string | null | undefined
): BundleDiscountConfig {
  if (!metafieldValue) {
    return { bundles: [] }
  }
  try {
    return JSON.parse(metafieldValue) as BundleDiscountConfig
  } catch {
    return { bundles: [] }
  }
}
