/**
 * Bundle Builder Module
 *
 * Headless bundle builder that replicates the Shopify Liquid bundle builder.
 * Drop into any PDP to enable tier-based "build your own bundle" UX.
 *
 * @example
 * ```tsx
 * import { BundleBuilder } from '@/components/bundles'
 *
 * <BundleBuilder
 *   products={bundleProducts}
 *   config={{
 *     bundleId: 'sheet-set-bundle',
 *     bundleName: 'Custom Sheet Set Bundle',
 *     discountType: 'percentage',
 *     tiers: [
 *       { count: 2, discount: 10, label: 'Starter Bundle' },
 *       { count: 3, discount: 15, label: 'Value Bundle' },
 *       { count: 4, discount: 20, label: 'Best Value' },
 *       { count: 5, discount: 25, label: 'Ultimate Bundle' },
 *     ],
 *     minItems: 2,
 *     maxItems: 8,
 *   }}
 *   headline="Build Your Bundle & Save"
 *   showSavings
 *   showTierProgress
 * />
 * ```
 */

export { BundleBuilder } from './BundleBuilder'
export { BundleProductCard } from './BundleProductCard'
export { BundleSummary } from './BundleSummary'
export { addBundleToCart } from './bundle-actions'

export type {
  BundleProduct,
  BundleVariant,
  BundleTier,
  BundleConfig,
  BundleCartItem,
  SelectedProduct,
} from './types'
