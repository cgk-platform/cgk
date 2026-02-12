/**
 * Gift Card Reward Processing
 *
 * Handles processing orders to detect gift cards and issue store credit
 */
import type {
  GiftCardTransaction,
  CreateGiftCardTransactionInput,
  GiftCardProduct,
} from './types'
import {
  getGiftCardProducts,
  createGiftCardTransaction,
  getTransactionByOrderAndVariant,
  markTransactionCredited,
  markTransactionFailed,
} from './db'
import { getGiftCardSettings } from './settings'
import { buildGiftCardVariantIdSet, isGiftCardLineItem, extractNumericId } from './shopify-products'
import { createGiftCardEmail } from './db/emails'

/**
 * Order line item data from Shopify webhook
 */
export interface OrderLineItem {
  variant_id: string | number
  quantity: number
  price: string
  sku?: string | null
}

/**
 * Order data from Shopify webhook
 */
export interface OrderData {
  id: string // Shopify order GID or numeric ID
  name: string // Order number like #1001
  customer: {
    id: string // Shopify customer GID or numeric ID
    email: string
    first_name?: string | null
    last_name?: string | null
  }
  subtotal_price: string
  line_items: OrderLineItem[]
  note_attributes?: Array<{
    name: string
    value: string
  }>
}

/**
 * Result of processing a gift card reward
 */
export interface ProcessRewardResult {
  success: boolean
  transaction?: GiftCardTransaction
  skipped?: boolean
  reason?: string
}

/**
 * Detect gift card line items in an order
 */
export function detectGiftCardLineItems(
  lineItems: OrderLineItem[],
  giftCardProducts: GiftCardProduct[]
): Array<{ lineItem: OrderLineItem; product: GiftCardProduct }> {
  const variantIdSet = buildGiftCardVariantIdSet(giftCardProducts)
  const productMap = new Map<string, GiftCardProduct>()

  for (const product of giftCardProducts) {
    productMap.set(product.variant_id, product)
    productMap.set(product.variant_id_numeric, product)
  }

  const matches: Array<{ lineItem: OrderLineItem; product: GiftCardProduct }> = []

  for (const lineItem of lineItems) {
    const variantId = String(lineItem.variant_id)
    if (isGiftCardLineItem(variantId, variantIdSet)) {
      const product = productMap.get(variantId) || productMap.get(extractNumericId(variantId))
      if (product) {
        matches.push({ lineItem, product })
      }
    }
  }

  return matches
}

/**
 * Process a single gift card reward from an order
 * Must be called within withTenant() context
 *
 * @param order - Order data from Shopify
 * @param lineItem - Line item containing the gift card
 * @param product - Gift card product configuration
 * @param sourcePageSlug - Optional page slug (e.g., bundle builder page)
 */
export async function processGiftCardReward(
  order: OrderData,
  lineItem: OrderLineItem,
  product: GiftCardProduct,
  sourcePageSlug?: string
): Promise<ProcessRewardResult> {
  // Check if system is enabled
  const settings = await getGiftCardSettings()
  if (!settings.enabled) {
    return { success: false, skipped: true, reason: 'Gift card system is disabled' }
  }

  // Check order subtotal threshold if configured
  const orderSubtotalCents = Math.round(parseFloat(order.subtotal_price) * 100)
  if (product.min_order_subtotal_cents > 0 && orderSubtotalCents < product.min_order_subtotal_cents) {
    return {
      success: false,
      skipped: true,
      reason: `Order subtotal ($${orderSubtotalCents / 100}) below minimum ($${product.min_order_subtotal_cents / 100})`,
    }
  }

  // Check for existing transaction (idempotency)
  const existingTransaction = await getTransactionByOrderAndVariant(
    order.id,
    product.variant_id
  )
  if (existingTransaction) {
    return {
      success: true,
      transaction: existingTransaction,
      skipped: true,
      reason: 'Transaction already exists',
    }
  }

  // Create transaction
  const customerName = [order.customer.first_name, order.customer.last_name]
    .filter(Boolean)
    .join(' ') || null

  const transactionInput: CreateGiftCardTransactionInput = {
    shopify_order_id: order.id,
    shopify_order_name: order.name,
    shopify_customer_id: order.customer.id,
    customer_email: order.customer.email,
    customer_name: customerName || undefined,
    gift_card_product_id: product.id,
    gift_card_variant_id: product.variant_id,
    gift_card_sku: lineItem.sku || product.sku || undefined,
    amount_cents: product.amount_cents * lineItem.quantity,
    source: 'bundle_builder',
    source_page_slug: sourcePageSlug || undefined,
  }

  const transaction = await createGiftCardTransaction(transactionInput)

  // Queue email notification if enabled
  if (settings.email_enabled) {
    await createGiftCardEmail({
      transaction_id: transaction.id,
      to_email: order.customer.email,
      to_name: customerName || undefined,
      subject: settings.email_template.subject,
    })
  }

  return { success: true, transaction }
}

/**
 * Process all gift card rewards in an order
 * Must be called within withTenant() context
 *
 * @param order - Order data from Shopify
 */
export async function processOrderGiftCards(
  order: OrderData
): Promise<ProcessRewardResult[]> {
  // Get active gift card products
  const products = await getGiftCardProducts('active')
  if (products.length === 0) {
    return []
  }

  // Detect gift card line items
  const matches = detectGiftCardLineItems(order.line_items, products)
  if (matches.length === 0) {
    return []
  }

  // Extract source page slug from order note attributes if present
  const sourcePageSlug = order.note_attributes?.find(
    (attr) => attr.name === 'bundle_page_slug' || attr.name === 'page_slug'
  )?.value

  // Process each gift card
  const results: ProcessRewardResult[] = []
  for (const { lineItem, product } of matches) {
    const result = await processGiftCardReward(order, lineItem, product, sourcePageSlug)
    results.push(result)
  }

  return results
}

/**
 * Issue store credit to a customer via Shopify
 * This is a placeholder that would integrate with Shopify Customer API
 *
 * @param transaction - Transaction to process
 * @returns Shopify transaction ID if successful
 */
export async function issueStoreCredit(
  transaction: GiftCardTransaction
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Placeholder for Shopify integration
  // In production, this would:
  // 1. Use Shopify Admin API to create store credit
  // 2. Use Customer Account API if available
  // 3. Or create a draft order with negative line item

  // For now, simulate success with a generated ID
  console.log(`issueStoreCredit: Processing transaction ${transaction.id} for ${transaction.amount_cents} cents`)

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Return success with mock transaction ID
  const mockTransactionId = `sc_${Date.now()}_${transaction.id.slice(0, 8)}`
  return { success: true, transactionId: mockTransactionId }
}

/**
 * Process pending transactions and issue store credit
 * Must be called within withTenant() context
 */
export async function processPendingTransactions(
  transactions: GiftCardTransaction[]
): Promise<Array<{ transaction: GiftCardTransaction; success: boolean; error?: string }>> {
  const results: Array<{ transaction: GiftCardTransaction; success: boolean; error?: string }> = []

  for (const transaction of transactions) {
    try {
      const result = await issueStoreCredit(transaction)

      if (result.success && result.transactionId) {
        const updated = await markTransactionCredited(transaction.id, result.transactionId)
        results.push({ transaction: updated || transaction, success: true })
      } else {
        const updated = await markTransactionFailed(
          transaction.id,
          result.error || 'Unknown error issuing store credit'
        )
        results.push({
          transaction: updated || transaction,
          success: false,
          error: result.error,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await markTransactionFailed(transaction.id, errorMessage)
      results.push({ transaction, success: false, error: errorMessage })
    }
  }

  return results
}

/**
 * Create a manual gift card transaction
 * Used for admin-initiated store credit
 * Must be called within withTenant() context
 */
export async function createManualGiftCardCredit(input: {
  shopify_customer_id: string
  customer_email: string
  customer_name?: string
  amount_cents: number
  note?: string
}): Promise<GiftCardTransaction> {
  const transactionInput: CreateGiftCardTransactionInput = {
    shopify_order_id: `manual_${Date.now()}`,
    shopify_order_name: 'Manual Credit',
    shopify_customer_id: input.shopify_customer_id,
    customer_email: input.customer_email,
    customer_name: input.customer_name,
    amount_cents: input.amount_cents,
    source: 'manual',
    source_config: input.note ? { note: input.note } : undefined,
  }

  return createGiftCardTransaction(transactionInput)
}
