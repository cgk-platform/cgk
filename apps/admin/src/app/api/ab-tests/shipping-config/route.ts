/**
 * Cart Attribute Sync API (Public)
 *
 * POST - Sync shipping variant to cart attributes
 *
 * This endpoint is called from the storefront to sync
 * the A/B test assignment to the Shopify cart.
 */

import { getTenantContext } from '@cgk/auth'
import { withTenant, sql } from '@cgk/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CART_ATTRIBUTE_KEYS = {
  SHIPPING_SUFFIX: '_ab_shipping_suffix',
  TEST_TYPE: '_ab_test_type',
  TEST_ID: '_ab_test_id',
  VISITOR_ID: '_ab_visitor_id',
} as const

interface CartAttributeUpdate {
  key: string
  value: string
}

interface CartSyncRequest {
  cartId: string
  testId: string
  suffix: string
  visitorId: string
}

function validateCartSyncRequest(
  body: unknown
): { valid: true; data: CartSyncRequest } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be an object' }
  }

  const { cartId, testId, suffix, visitorId } = body as Record<string, unknown>

  if (typeof cartId !== 'string' || !cartId) {
    return { valid: false, error: 'cartId is required' }
  }

  if (typeof testId !== 'string' || !testId) {
    return { valid: false, error: 'testId is required' }
  }

  if (typeof suffix !== 'string' || !suffix) {
    return { valid: false, error: 'suffix is required' }
  }

  if (!['A', 'B', 'C', 'D'].includes(suffix.toUpperCase())) {
    return { valid: false, error: 'suffix must be A, B, C, or D' }
  }

  if (typeof visitorId !== 'string' || !visitorId) {
    return { valid: false, error: 'visitorId is required' }
  }

  return {
    valid: true,
    data: {
      cartId,
      testId,
      suffix: suffix.toUpperCase(),
      visitorId,
    },
  }
}

function buildShippingCartAttributes(
  testId: string,
  variantSuffix: string,
  visitorId: string
): CartAttributeUpdate[] {
  return [
    { key: CART_ATTRIBUTE_KEYS.SHIPPING_SUFFIX, value: variantSuffix },
    { key: CART_ATTRIBUTE_KEYS.TEST_TYPE, value: 'shipping' },
    { key: CART_ATTRIBUTE_KEYS.TEST_ID, value: testId },
    { key: CART_ATTRIBUTE_KEYS.VISITOR_ID, value: visitorId },
  ]
}

/**
 * Sync shipping variant to cart
 */
export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = await req.json()
  const validation = validateCartSyncRequest(body)

  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const { cartId, testId, suffix, visitorId } = validation.data

  // Verify test exists and is running
  const testValid = await withTenant(tenantId, async () => {
    const result = await sql`
      SELECT id, status FROM ab_tests
      WHERE id = ${testId} AND test_type = 'shipping' AND status = 'running'
    `
    return result.rows.length > 0
  })

  if (!testValid) {
    return Response.json(
      { error: 'Test not found or not running' },
      { status: 400 }
    )
  }

  // Build the attributes that should be set
  const attributes = buildShippingCartAttributes(testId, suffix, visitorId)

  // Note: The actual cart update is done via Shopify Storefront API
  // from the client side. This endpoint validates and returns the
  // attributes that should be set.
  return Response.json({
    success: true,
    cartId,
    attributes,
    message: 'Use these attributes with cartAttributesUpdate mutation',
  })
}
