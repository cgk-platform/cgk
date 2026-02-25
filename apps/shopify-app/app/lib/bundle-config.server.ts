/**
 * Bundle Configuration Server Helpers
 *
 * Admin API CRUD for bundle discount metafield configuration.
 * Used by the admin app page to manage bundle rules.
 */

export interface TierConfig {
  count: number
  discount: number
  label?: string
  freeGiftVariantIds?: string[]
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

interface MutationResult {
  success: boolean
  discountId?: string
  userErrors: Array<{ field: string[]; message: string }>
}

type AdminGraphQL = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>
}

const DISCOUNT_METAFIELD_NAMESPACE = '$app:bundle-discount'
const DISCOUNT_METAFIELD_KEY = 'config'

/**
 * Fetches all automatic app discounts that use our bundle discount function.
 */
export async function listBundleDiscounts(admin: AdminGraphQL) {
  const response = await admin.graphql(
    `#graphql
    query ListBundleDiscounts($namespace: String!, $key: String!) {
      automaticDiscountNodes(first: 50, query: "type:app") {
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
          metafield(namespace: $namespace, key: $key) {
            id
            value
          }
        }
      }
    }`,
    {
      variables: {
        namespace: DISCOUNT_METAFIELD_NAMESPACE,
        key: DISCOUNT_METAFIELD_KEY,
      },
    }
  )

  const data = await response.json()
  return data.data?.automaticDiscountNodes?.nodes ?? []
}

/**
 * Creates an automatic discount with our bundle discount function.
 */
export async function createBundleDiscount(
  admin: AdminGraphQL,
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
): Promise<MutationResult> {
  const combinesWith = opts.combinesWith ?? {
    orderDiscounts: true,
    productDiscounts: false,
    shippingDiscounts: true,
  }

  const response = await admin.graphql(
    `#graphql
    mutation CreateBundleDiscount($discount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $discount) {
        automaticAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        discount: {
          title: opts.title,
          functionId: opts.functionId,
          combinesWith,
          metafields: [
            {
              namespace: DISCOUNT_METAFIELD_NAMESPACE,
              key: DISCOUNT_METAFIELD_KEY,
              type: 'json',
              value: JSON.stringify(opts.config),
            },
          ],
        },
      },
    }
  )

  const data = await response.json()
  const result = data.data?.discountAutomaticAppCreate
  return {
    success: (result?.userErrors?.length ?? 0) === 0,
    discountId: result?.automaticAppDiscount?.discountId,
    userErrors: result?.userErrors ?? [],
  }
}

/**
 * Updates the bundle discount metafield on an existing automatic discount.
 */
export async function updateBundleDiscountConfig(
  admin: AdminGraphQL,
  opts: {
    discountId: string
    title?: string
    config: BundleDiscountConfig
  }
): Promise<MutationResult> {
  const discountInput: Record<string, unknown> = {
    metafields: [
      {
        namespace: DISCOUNT_METAFIELD_NAMESPACE,
        key: DISCOUNT_METAFIELD_KEY,
        type: 'json',
        value: JSON.stringify(opts.config),
      },
    ],
  }

  if (opts.title) {
    discountInput.title = opts.title
  }

  const response = await admin.graphql(
    `#graphql
    mutation UpdateBundleDiscount($id: ID!, $discount: DiscountAutomaticAppInput!) {
      discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $discount) {
        automaticAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        id: opts.discountId,
        discount: discountInput,
      },
    }
  )

  const data = await response.json()
  const result = data.data?.discountAutomaticAppUpdate
  return {
    success: (result?.userErrors?.length ?? 0) === 0,
    discountId: result?.automaticAppDiscount?.discountId,
    userErrors: result?.userErrors ?? [],
  }
}

/**
 * Deletes an automatic bundle discount.
 */
export async function deleteBundleDiscount(
  admin: AdminGraphQL,
  discountId: string
): Promise<MutationResult> {
  const response = await admin.graphql(
    `#graphql
    mutation DeleteBundleDiscount($id: ID!) {
      discountAutomaticDelete(id: $id) {
        deletedAutomaticDiscountId
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: { id: discountId },
    }
  )

  const data = await response.json()
  const result = data.data?.discountAutomaticDelete
  return {
    success: (result?.userErrors?.length ?? 0) === 0,
    discountId: result?.deletedAutomaticDiscountId,
    userErrors: result?.userErrors ?? [],
  }
}

/**
 * Auto-detects the bundle discount Shopify Function ID by searching deployed functions.
 */
export async function findBundleDiscountFunctionId(
  admin: AdminGraphQL
): Promise<string | null> {
  const response = await admin.graphql(
    `#graphql
    query FindBundleFunction {
      shopifyFunctions(first: 25) {
        nodes {
          id
          title
          apiType
          app {
            title
          }
        }
      }
    }`
  )

  const data = await response.json()
  const functions = data.data?.shopifyFunctions?.nodes ?? []

  // Match by apiType (discount) + title or app title containing "bundle"
  const match = functions.find(
    (fn: { id: string; title: string; apiType: string; app?: { title: string } }) =>
      fn.apiType === 'discount_automatic_app' &&
      (fn.title.toLowerCase().includes('bundle') ||
       fn.app?.title?.toLowerCase()?.includes('bundle'))
  )

  return match?.id ?? null
}

/**
 * Resolves variant GIDs to product info for display in the admin UI.
 */
export async function resolveVariantProducts(
  admin: AdminGraphQL,
  variantIds: string[]
): Promise<
  Array<{
    variantId: string
    productTitle: string
    variantTitle: string
    imageUrl: string | null
  }>
> {
  if (variantIds.length === 0) return []

  // Ensure GID format
  const gids = variantIds.map((id) =>
    id.startsWith('gid://') ? id : `gid://shopify/ProductVariant/${id}`
  )

  const response = await admin.graphql(
    `#graphql
    query ResolveVariants($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          title
          displayName
          media(first: 1) {
            nodes {
              ... on MediaImage {
                image {
                  url(transform: { maxWidth: 80, maxHeight: 80 })
                }
              }
            }
          }
          product {
            title
            featuredMedia {
              preview {
                image {
                  url(transform: { maxWidth: 80, maxHeight: 80 })
                }
              }
            }
          }
        }
      }
    }`,
    {
      variables: { ids: gids },
    }
  )

  const data = await response.json()
  const nodes = data.data?.nodes ?? []

  return nodes
    .filter((node: any) => node?.id)
    .map((node: any) => ({
      variantId: node.id,
      productTitle: node.product?.title ?? 'Unknown Product',
      variantTitle: node.title ?? 'Default',
      imageUrl:
        node.media?.nodes?.[0]?.image?.url ??
        node.product?.featuredMedia?.preview?.image?.url ??
        null,
    }))
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
    const parsed = JSON.parse(metafieldValue)
    if (!parsed || !Array.isArray(parsed.bundles)) {
      return { bundles: [] }
    }
    const bundles: BundleConfig[] = parsed.bundles
      .filter((b: unknown): b is Record<string, unknown> =>
        typeof b === 'object' && b !== null &&
        typeof (b as Record<string, unknown>).bundleId === 'string' &&
        typeof (b as Record<string, unknown>).discountType === 'string' &&
        Array.isArray((b as Record<string, unknown>).tiers)
      )
      .map((b: Record<string, unknown>) => ({
        bundleId: b.bundleId as string,
        discountType: (b.discountType === 'fixed' ? 'fixed' : 'percentage') as 'percentage' | 'fixed',
        tiers: (b.tiers as unknown[])
          .filter((t: unknown): t is Record<string, unknown> =>
            typeof t === 'object' && t !== null &&
            typeof (t as Record<string, unknown>).count === 'number' &&
            typeof (t as Record<string, unknown>).discount === 'number'
          )
          .map((t: Record<string, unknown>) => ({
            count: t.count as number,
            discount: t.discount as number,
            ...(typeof t.label === 'string' ? { label: t.label } : {}),
            ...(Array.isArray(t.freeGiftVariantIds)
              ? { freeGiftVariantIds: (t.freeGiftVariantIds as unknown[]).filter((v): v is string => typeof v === 'string') }
              : {}),
          })),
        freeGiftVariantIds: Array.isArray(b.freeGiftVariantIds)
          ? (b.freeGiftVariantIds as unknown[]).filter((v): v is string => typeof v === 'string')
          : [],
      }))

    // Backward compat: migrate global freeGiftVariantIds to highest tier
    for (const bundle of bundles) {
      if (bundle.freeGiftVariantIds.length > 0) {
        const hasTierGifts = bundle.tiers.some(t => t.freeGiftVariantIds && t.freeGiftVariantIds.length > 0)
        if (!hasTierGifts && bundle.tiers.length > 0) {
          const sortedTiers = [...bundle.tiers].sort((a, b) => a.count - b.count)
          const highestTier = sortedTiers[sortedTiers.length - 1]
          const tierIndex = bundle.tiers.indexOf(highestTier)
          if (tierIndex >= 0) {
            bundle.tiers[tierIndex] = {
              ...bundle.tiers[tierIndex],
              freeGiftVariantIds: [...bundle.freeGiftVariantIds],
            }
          }
        }
      }
    }

    return { bundles }
  } catch {
    return { bundles: [] }
  }
}
