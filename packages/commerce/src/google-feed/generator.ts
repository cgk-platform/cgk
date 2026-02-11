/**
 * Google Shopping Feed Generator
 *
 * Generates XML, JSON, or TSV feeds for Google Merchant Center.
 * Follows Google Product Data Specification.
 */

import type {
  GoogleShoppingProduct,
  GoogleFeedSettings,
  GoogleFeedProduct,
  GoogleAvailability,
} from './types'

// ---------------------------------------------------------------------------
// Feed Generation
// ---------------------------------------------------------------------------

export interface FeedGeneratorInput {
  settings: GoogleFeedSettings
  products: Array<{
    shopify: ShopifyProductData
    overrides: GoogleFeedProduct | null
  }>
  storefrontUrl: string
}

export interface ShopifyProductData {
  id: string
  variantId?: string
  title: string
  description: string
  handle: string
  vendor: string | null
  productType: string | null
  priceCents: number
  compareAtPriceCents: number | null
  currency: string
  sku: string | null
  barcode: string | null
  availableForSale: boolean
  inventoryQuantity: number | null
  imageUrl: string | null
  additionalImages: string[]
  weight: number | null
  weightUnit: string | null
  tags: string[]
}

export function generateGoogleFeed(
  input: FeedGeneratorInput
): { products: GoogleShoppingProduct[]; xml: string; json: string } {
  const { settings, products, storefrontUrl } = input

  const feedProducts: GoogleShoppingProduct[] = products
    .filter((p) => !shouldExcludeProduct(p.shopify, p.overrides, settings))
    .map((p) => transformToGoogleProduct(p.shopify, p.overrides, settings, storefrontUrl))

  return {
    products: feedProducts,
    xml: generateXmlFeed(feedProducts, settings),
    json: generateJsonFeed(feedProducts),
  }
}

// ---------------------------------------------------------------------------
// Product Transformation
// ---------------------------------------------------------------------------

function transformToGoogleProduct(
  shopify: ShopifyProductData,
  overrides: GoogleFeedProduct | null,
  settings: GoogleFeedSettings,
  storefrontUrl: string
): GoogleShoppingProduct {
  const id = shopify.variantId ? `${shopify.id}_${shopify.variantId}` : shopify.id
  const title = overrides?.titleOverride || shopify.title
  const description = overrides?.descriptionOverride || shopify.description || shopify.title

  // Price formatting
  const priceCents = shopify.priceCents
  const priceFormatted = formatPrice(priceCents, settings.currency)

  // Sale price
  let salePrice: string | undefined
  let salePriceEffectiveDate: string | undefined
  if (overrides?.salePriceCents && overrides.salePriceCents < priceCents) {
    salePrice = formatPrice(overrides.salePriceCents, settings.currency)
    if (overrides.salePriceEffectiveStart && overrides.salePriceEffectiveEnd) {
      salePriceEffectiveDate = `${formatIsoDate(overrides.salePriceEffectiveStart)}/${formatIsoDate(overrides.salePriceEffectiveEnd)}`
    }
  }

  // Availability
  const availability = determineAvailability(shopify, settings)

  // Brand
  const brand = overrides?.brandOverride || settings.defaultBrand || shopify.vendor || 'Unknown'

  // GTIN/MPN
  const gtin = overrides?.gtin || shopify.barcode || undefined
  const mpn = overrides?.mpn || shopify.sku || undefined

  // Category
  const googleCategory =
    overrides?.googleCategoryId || settings.categoryMapping[shopify.productType || ''] || undefined

  // Product type
  const productType = overrides?.productType || shopify.productType || undefined

  // Condition
  const condition = overrides?.conditionOverride || settings.defaultCondition

  // Custom labels
  const customLabels = computeCustomLabels(shopify, overrides, settings)

  // Shipping weight
  let shippingWeight: string | undefined
  if (overrides?.shippingWeightGrams) {
    shippingWeight = `${overrides.shippingWeightGrams} g`
  } else if (shopify.weight && shopify.weightUnit) {
    shippingWeight = `${shopify.weight} ${shopify.weightUnit}`
  }

  // Images
  const imageLink = overrides?.additionalImageUrls?.[0] || shopify.imageUrl || ''
  const additionalImageLink =
    overrides?.additionalImageUrls?.slice(1) ||
    (shopify.additionalImages.length > 0 ? shopify.additionalImages.slice(0, 10) : undefined)

  // Product URL
  const link = `${storefrontUrl}/products/${shopify.handle}`

  const product: GoogleShoppingProduct = {
    id,
    title: truncate(title, 150),
    description: truncate(stripHtml(description), 5000),
    link,
    image_link: imageLink,
    availability,
    price: priceFormatted,
    brand,
    condition,
  }

  // Add optional fields
  if (gtin) product.gtin = gtin
  if (mpn) product.mpn = mpn
  if (!gtin && !mpn) product.identifier_exists = 'no'
  if (googleCategory) product.google_product_category = googleCategory
  if (productType) product.product_type = productType
  if (salePrice) product.sale_price = salePrice
  if (salePriceEffectiveDate) product.sale_price_effective_date = salePriceEffectiveDate
  if (additionalImageLink) product.additional_image_link = additionalImageLink
  if (shippingWeight) product.shipping_weight = shippingWeight
  if (shopify.variantId) product.item_group_id = shopify.id

  // Apparel attributes
  if (overrides?.adult) product.adult = true
  if (overrides?.ageGroup) product.age_group = overrides.ageGroup
  if (overrides?.gender) product.gender = overrides.gender
  if (overrides?.color) product.color = overrides.color
  if (overrides?.material) product.material = overrides.material
  if (overrides?.pattern) product.pattern = overrides.pattern
  if (overrides?.size) product.size = overrides.size

  // Shipping dimensions
  if (overrides?.shippingLengthCm) product.shipping_length = `${overrides.shippingLengthCm} cm`
  if (overrides?.shippingWidthCm) product.shipping_width = `${overrides.shippingWidthCm} cm`
  if (overrides?.shippingHeightCm) product.shipping_height = `${overrides.shippingHeightCm} cm`
  if (overrides?.shippingLabel) product.shipping_label = overrides.shippingLabel

  // Custom labels
  if (customLabels.label0) product.custom_label_0 = customLabels.label0
  if (customLabels.label1) product.custom_label_1 = customLabels.label1
  if (customLabels.label2) product.custom_label_2 = customLabels.label2
  if (customLabels.label3) product.custom_label_3 = customLabels.label3
  if (customLabels.label4) product.custom_label_4 = customLabels.label4

  // Shipping overrides
  if (settings.shippingOverrides && settings.shippingOverrides.length > 0) {
    product.shipping = settings.shippingOverrides.map((s) => ({
      country: s.country,
      service: s.service,
      price: s.price,
      min_handling_time: s.minHandlingTime,
      max_handling_time: s.maxHandlingTime,
      min_transit_time: s.minTransitTime,
      max_transit_time: s.maxTransitTime,
    }))
  }

  // Tax settings
  if (settings.taxSettings) {
    product.tax = [
      {
        country: settings.taxSettings.country,
        region: settings.taxSettings.region,
        rate: settings.taxSettings.rate || 0,
        tax_ship: settings.taxSettings.taxShipping,
      },
    ]
  }

  return product
}

// ---------------------------------------------------------------------------
// Exclusion Logic
// ---------------------------------------------------------------------------

function shouldExcludeProduct(
  shopify: ShopifyProductData,
  overrides: GoogleFeedProduct | null,
  settings: GoogleFeedSettings
): boolean {
  // Explicitly excluded
  if (overrides?.isExcluded) {
    return true
  }

  // Out of stock exclusion
  if (!settings.includeOutOfStock && !shopify.availableForSale) {
    return true
  }

  // Minimum price
  if (settings.minimumPriceCents > 0 && shopify.priceCents < settings.minimumPriceCents) {
    return true
  }

  // Check exclusion rules
  for (const rule of settings.exclusionRules) {
    if (!rule.enabled) continue

    switch (rule.type) {
      case 'tag':
        if (shopify.tags.includes(rule.value)) return true
        break
      case 'vendor':
        if (shopify.vendor === rule.value) return true
        break
      case 'product_type':
        if (shopify.productType === rule.value) return true
        break
      case 'price_below':
        if (shopify.priceCents < parseInt(rule.value, 10)) return true
        break
      case 'out_of_stock':
        if (!shopify.availableForSale) return true
        break
    }
  }

  return false
}

// ---------------------------------------------------------------------------
// Custom Labels
// ---------------------------------------------------------------------------

interface CustomLabels {
  label0?: string
  label1?: string
  label2?: string
  label3?: string
  label4?: string
}

function computeCustomLabels(
  shopify: ShopifyProductData,
  overrides: GoogleFeedProduct | null,
  settings: GoogleFeedSettings
): CustomLabels {
  const labels: CustomLabels = {}

  // Override values take precedence
  if (overrides?.customLabel0) labels.label0 = overrides.customLabel0
  if (overrides?.customLabel1) labels.label1 = overrides.customLabel1
  if (overrides?.customLabel2) labels.label2 = overrides.customLabel2
  if (overrides?.customLabel3) labels.label3 = overrides.customLabel3
  if (overrides?.customLabel4) labels.label4 = overrides.customLabel4

  // Apply rules for labels without overrides
  const { customLabelRules } = settings

  if (!labels.label0 && customLabelRules.label0) {
    labels.label0 = computeLabelFromRule(shopify, customLabelRules.label0)
  }
  if (!labels.label1 && customLabelRules.label1) {
    labels.label1 = computeLabelFromRule(shopify, customLabelRules.label1)
  }
  if (!labels.label2 && customLabelRules.label2) {
    labels.label2 = computeLabelFromRule(shopify, customLabelRules.label2)
  }
  if (!labels.label3 && customLabelRules.label3) {
    labels.label3 = computeLabelFromRule(shopify, customLabelRules.label3)
  }
  if (!labels.label4 && customLabelRules.label4) {
    labels.label4 = computeLabelFromRule(shopify, customLabelRules.label4)
  }

  return labels
}

function computeLabelFromRule(
  shopify: ShopifyProductData,
  rule: { type: string; conditions?: Array<{ field: string; operator: string; value: string | number; value2?: number; label: string }>; defaultValue?: string }
): string | undefined {
  if (!rule.conditions || rule.conditions.length === 0) {
    return rule.defaultValue
  }

  for (const condition of rule.conditions) {
    const fieldValue = getFieldValue(shopify, condition.field)

    if (evaluateCondition(fieldValue, condition)) {
      return condition.label
    }
  }

  return rule.defaultValue
}

function getFieldValue(shopify: ShopifyProductData, field: string): unknown {
  switch (field) {
    case 'price':
      return shopify.priceCents
    case 'vendor':
      return shopify.vendor
    case 'product_type':
      return shopify.productType
    case 'tags':
      return shopify.tags
    case 'inventory':
      return shopify.inventoryQuantity
    default:
      return undefined
  }
}

function evaluateCondition(
  value: unknown,
  condition: { operator: string; value: string | number; value2?: number }
): boolean {
  const { operator, value: condValue, value2 } = condition

  if (value === undefined || value === null) return false

  switch (operator) {
    case 'equals':
      return value === condValue
    case 'contains':
      if (Array.isArray(value)) return value.includes(condValue)
      return String(value).includes(String(condValue))
    case 'greater_than':
      return Number(value) > Number(condValue)
    case 'less_than':
      return Number(value) < Number(condValue)
    case 'between':
      return Number(value) >= Number(condValue) && Number(value) <= Number(value2 || condValue)
    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

function determineAvailability(
  shopify: ShopifyProductData,
  settings: GoogleFeedSettings
): GoogleAvailability {
  if (!shopify.availableForSale) {
    return 'out_of_stock'
  }

  if (shopify.inventoryQuantity !== null && shopify.inventoryQuantity <= 0) {
    return settings.defaultAvailability === 'backorder' ? 'backorder' : 'out_of_stock'
  }

  return 'in_stock'
}

// ---------------------------------------------------------------------------
// XML Generation
// ---------------------------------------------------------------------------

function generateXmlFeed(products: GoogleShoppingProduct[], settings: GoogleFeedSettings): string {
  const items = products.map(productToXmlItem).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(settings.feedName)}</title>
    <link>${escapeXml(settings.targetCountry === 'US' ? 'https://www.google.com' : `https://www.google.${settings.targetCountry.toLowerCase()}`)}</link>
    <description>Product feed for Google Merchant Center</description>
${items}
  </channel>
</rss>`
}

function productToXmlItem(product: GoogleShoppingProduct): string {
  const lines: string[] = ['    <item>']

  // Required fields
  lines.push(`      <g:id>${escapeXml(product.id)}</g:id>`)
  lines.push(`      <g:title>${escapeXml(product.title)}</g:title>`)
  lines.push(`      <g:description>${escapeXml(product.description)}</g:description>`)
  lines.push(`      <g:link>${escapeXml(product.link)}</g:link>`)
  lines.push(`      <g:image_link>${escapeXml(product.image_link)}</g:image_link>`)
  lines.push(`      <g:availability>${product.availability}</g:availability>`)
  lines.push(`      <g:price>${escapeXml(product.price)}</g:price>`)
  lines.push(`      <g:brand>${escapeXml(product.brand)}</g:brand>`)

  // Optional fields
  if (product.gtin) lines.push(`      <g:gtin>${escapeXml(product.gtin)}</g:gtin>`)
  if (product.mpn) lines.push(`      <g:mpn>${escapeXml(product.mpn)}</g:mpn>`)
  if (product.identifier_exists) lines.push(`      <g:identifier_exists>${product.identifier_exists}</g:identifier_exists>`)
  if (product.google_product_category) lines.push(`      <g:google_product_category>${escapeXml(String(product.google_product_category))}</g:google_product_category>`)
  if (product.product_type) lines.push(`      <g:product_type>${escapeXml(product.product_type)}</g:product_type>`)
  if (product.condition) lines.push(`      <g:condition>${product.condition}</g:condition>`)
  if (product.item_group_id) lines.push(`      <g:item_group_id>${escapeXml(product.item_group_id)}</g:item_group_id>`)

  // Sale price
  if (product.sale_price) lines.push(`      <g:sale_price>${escapeXml(product.sale_price)}</g:sale_price>`)
  if (product.sale_price_effective_date) lines.push(`      <g:sale_price_effective_date>${product.sale_price_effective_date}</g:sale_price_effective_date>`)

  // Additional images
  if (product.additional_image_link) {
    for (const img of product.additional_image_link) {
      lines.push(`      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
    }
  }

  // Apparel
  if (product.adult) lines.push(`      <g:adult>yes</g:adult>`)
  if (product.age_group) lines.push(`      <g:age_group>${product.age_group}</g:age_group>`)
  if (product.gender) lines.push(`      <g:gender>${product.gender}</g:gender>`)
  if (product.color) lines.push(`      <g:color>${escapeXml(product.color)}</g:color>`)
  if (product.material) lines.push(`      <g:material>${escapeXml(product.material)}</g:material>`)
  if (product.pattern) lines.push(`      <g:pattern>${escapeXml(product.pattern)}</g:pattern>`)
  if (product.size) lines.push(`      <g:size>${escapeXml(product.size)}</g:size>`)

  // Shipping
  if (product.shipping_weight) lines.push(`      <g:shipping_weight>${escapeXml(product.shipping_weight)}</g:shipping_weight>`)
  if (product.shipping_length) lines.push(`      <g:shipping_length>${escapeXml(product.shipping_length)}</g:shipping_length>`)
  if (product.shipping_width) lines.push(`      <g:shipping_width>${escapeXml(product.shipping_width)}</g:shipping_width>`)
  if (product.shipping_height) lines.push(`      <g:shipping_height>${escapeXml(product.shipping_height)}</g:shipping_height>`)
  if (product.shipping_label) lines.push(`      <g:shipping_label>${escapeXml(product.shipping_label)}</g:shipping_label>`)

  // Shipping options
  if (product.shipping) {
    for (const ship of product.shipping) {
      lines.push('      <g:shipping>')
      lines.push(`        <g:country>${ship.country}</g:country>`)
      if (ship.service) lines.push(`        <g:service>${escapeXml(ship.service)}</g:service>`)
      lines.push(`        <g:price>${escapeXml(ship.price)}</g:price>`)
      if (ship.min_handling_time) lines.push(`        <g:min_handling_time>${ship.min_handling_time}</g:min_handling_time>`)
      if (ship.max_handling_time) lines.push(`        <g:max_handling_time>${ship.max_handling_time}</g:max_handling_time>`)
      if (ship.min_transit_time) lines.push(`        <g:min_transit_time>${ship.min_transit_time}</g:min_transit_time>`)
      if (ship.max_transit_time) lines.push(`        <g:max_transit_time>${ship.max_transit_time}</g:max_transit_time>`)
      lines.push('      </g:shipping>')
    }
  }

  // Tax
  if (product.tax) {
    for (const t of product.tax) {
      lines.push('      <g:tax>')
      lines.push(`        <g:country>${t.country}</g:country>`)
      if (t.region) lines.push(`        <g:region>${escapeXml(t.region)}</g:region>`)
      lines.push(`        <g:rate>${t.rate}</g:rate>`)
      if (t.tax_ship !== undefined) lines.push(`        <g:tax_ship>${t.tax_ship ? 'yes' : 'no'}</g:tax_ship>`)
      lines.push('      </g:tax>')
    }
  }

  // Custom labels
  if (product.custom_label_0) lines.push(`      <g:custom_label_0>${escapeXml(product.custom_label_0)}</g:custom_label_0>`)
  if (product.custom_label_1) lines.push(`      <g:custom_label_1>${escapeXml(product.custom_label_1)}</g:custom_label_1>`)
  if (product.custom_label_2) lines.push(`      <g:custom_label_2>${escapeXml(product.custom_label_2)}</g:custom_label_2>`)
  if (product.custom_label_3) lines.push(`      <g:custom_label_3>${escapeXml(product.custom_label_3)}</g:custom_label_3>`)
  if (product.custom_label_4) lines.push(`      <g:custom_label_4>${escapeXml(product.custom_label_4)}</g:custom_label_4>`)

  lines.push('    </item>')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// JSON Generation
// ---------------------------------------------------------------------------

function generateJsonFeed(products: GoogleShoppingProduct[]): string {
  return JSON.stringify({ products }, null, 2)
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2)
  return `${amount} ${currency}`
}

function formatIsoDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toISOString().replace('Z', '+00:00')
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
