/**
 * Test Data Fixtures for Migration Testing
 *
 * Provides sample data for each table type covering normal cases,
 * edge cases, and boundary conditions.
 */

import type { DatabaseRow } from '../../lib/transform-row.js'

/**
 * Generate a unique ID for test data
 */
function genId(prefix: string, index: number): string {
  return `${prefix}_test_${String(index).padStart(5, '0')}`
}

/**
 * Generate a random date within a range
 */
function randomDate(start: Date, end: Date): string {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  return new Date(time).toISOString()
}

// Base dates for test data
const START_DATE = new Date('2023-01-01')
const END_DATE = new Date('2024-12-31')

/**
 * Sample customer records
 */
export const CUSTOMER_FIXTURES: DatabaseRow[] = [
  // Normal customer
  {
    id: genId('cust', 1),
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1-555-123-4567',
    orders_count: 5,
    total_spent_cents: 25000,
    currency: 'USD',
    accepts_marketing: true,
    metadata: { source: 'web', referrer: 'google' },
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Customer with null values
  {
    id: genId('cust', 2),
    email: 'jane@test.com',
    first_name: null,
    last_name: null,
    phone: null,
    orders_count: 0,
    total_spent_cents: 0,
    currency: 'USD',
    accepts_marketing: false,
    metadata: {},
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: null,
  },
  // Customer with special characters in name
  {
    id: genId('cust', 3),
    email: 'special.chars@example.com',
    first_name: "O'Brien",
    last_name: 'Smith-Jones',
    phone: '+44 20 7123 4567',
    orders_count: 10,
    total_spent_cents: 100000,
    currency: 'GBP',
    accepts_marketing: true,
    metadata: { tags: ['vip', 'wholesale'] },
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Customer with unicode characters
  {
    id: genId('cust', 4),
    email: 'unicode@test.com',
    first_name: 'Mller',
    last_name: '',
    phone: null,
    orders_count: 1,
    total_spent_cents: 5000,
    currency: 'EUR',
    accepts_marketing: false,
    metadata: {},
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Customer with very long email
  {
    id: genId('cust', 5),
    email: 'very.long.email.address.that.goes.on.for.quite.some.time@very-long-domain-name-that-is-also-quite-extended.example.com',
    first_name: 'Long',
    last_name: 'Email',
    phone: null,
    orders_count: 0,
    total_spent_cents: 0,
    currency: 'USD',
    accepts_marketing: false,
    metadata: {},
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample product records
 */
export const PRODUCT_FIXTURES: DatabaseRow[] = [
  // Normal product
  {
    id: genId('prod', 1),
    title: 'Premium Widget',
    handle: 'premium-widget',
    description: 'A high-quality widget for all your needs.',
    status: 'active',
    price_cents: 2999,
    compare_at_price_cents: 3999,
    currency: 'USD',
    images: [
      { url: 'https://example.com/images/widget1.jpg', alt: 'Widget front' },
      { url: 'https://example.com/images/widget2.jpg', alt: 'Widget back' },
    ],
    variants: [
      { id: 'v1', title: 'Small', price_cents: 2999, sku: 'WDG-SM' },
      { id: 'v2', title: 'Large', price_cents: 3499, sku: 'WDG-LG' },
    ],
    options: [{ name: 'Size', values: ['Small', 'Large'] }],
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Product with empty arrays
  {
    id: genId('prod', 2),
    title: 'Simple Product',
    handle: 'simple-product',
    description: null,
    status: 'active',
    price_cents: 999,
    compare_at_price_cents: null,
    currency: 'USD',
    images: [],
    variants: [],
    options: [],
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Draft product
  {
    id: genId('prod', 3),
    title: 'Draft Product',
    handle: 'draft-product',
    description: 'This product is still being created.',
    status: 'draft',
    price_cents: 0,
    compare_at_price_cents: null,
    currency: 'USD',
    images: [],
    variants: [],
    options: [],
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Product with HTML in description
  {
    id: genId('prod', 4),
    title: 'Product with HTML',
    handle: 'product-html',
    description: '<p>This is a <strong>bold</strong> description with <a href="https://example.com">a link</a>.</p>',
    status: 'active',
    price_cents: 4999,
    compare_at_price_cents: 5999,
    currency: 'USD',
    images: [],
    variants: [],
    options: [],
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample order records
 */
export const ORDER_FIXTURES: DatabaseRow[] = [
  // Normal completed order
  {
    id: genId('order', 1),
    customer_id: genId('cust', 1),
    order_number: 1001,
    status: 'completed',
    fulfillment_status: 'fulfilled',
    financial_status: 'paid',
    total_cents: 5998,
    subtotal_cents: 5500,
    tax_cents: 498,
    shipping_cents: 0,
    discount_cents: 0,
    gross_sales_cents: 5998,
    currency: 'USD',
    line_items: [
      { product_id: genId('prod', 1), quantity: 2, price_cents: 2999 },
    ],
    shipping_address: {
      first_name: 'John',
      last_name: 'Doe',
      address1: '123 Main St',
      city: 'New York',
      province: 'NY',
      country: 'US',
      zip: '10001',
    },
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Pending order
  {
    id: genId('order', 2),
    customer_id: genId('cust', 2),
    order_number: 1002,
    status: 'pending',
    fulfillment_status: 'unfulfilled',
    financial_status: 'pending',
    total_cents: 999,
    subtotal_cents: 999,
    tax_cents: 0,
    shipping_cents: 0,
    discount_cents: 0,
    gross_sales_cents: 999,
    currency: 'USD',
    line_items: JSON.stringify([
      { product_id: genId('prod', 2), quantity: 1, price_cents: 999 },
    ]),
    shipping_address: null,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: null,
  },
  // Cancelled order
  {
    id: genId('order', 3),
    customer_id: genId('cust', 1),
    order_number: 1003,
    status: 'CANCELLED', // Test uppercase normalization
    fulfillment_status: 'UNFULFILLED',
    financial_status: 'REFUNDED',
    total_cents: 0,
    subtotal_cents: 2999,
    tax_cents: 0,
    shipping_cents: 0,
    discount_cents: 2999,
    gross_sales_cents: '2999', // Test string-to-number conversion
    currency: 'USD',
    line_items: [],
    shipping_address: {},
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Order with large amounts
  {
    id: genId('order', 4),
    customer_id: genId('cust', 3),
    order_number: 1004,
    status: 'completed',
    fulfillment_status: 'fulfilled',
    financial_status: 'paid',
    total_cents: 9999999, // $99,999.99
    subtotal_cents: 9500000,
    tax_cents: 499999,
    shipping_cents: 0,
    discount_cents: 0,
    gross_sales_cents: 9999999,
    currency: 'USD',
    line_items: [],
    shipping_address: {},
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample line item records
 */
export const LINE_ITEM_FIXTURES: DatabaseRow[] = [
  {
    id: genId('li', 1),
    order_id: genId('order', 1),
    product_id: genId('prod', 1),
    variant_id: 'v1',
    title: 'Premium Widget - Small',
    quantity: 2,
    price_cents: 2999,
    total_cents: 5998,
    sku: 'WDG-SM',
    created_at: randomDate(START_DATE, END_DATE),
  },
  {
    id: genId('li', 2),
    order_id: genId('order', 2),
    product_id: genId('prod', 2),
    variant_id: null,
    title: 'Simple Product',
    quantity: 1,
    price_cents: 999,
    total_cents: 999,
    sku: null,
    created_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample review records
 */
export const REVIEW_FIXTURES: DatabaseRow[] = [
  // Normal approved review
  {
    id: genId('review', 1),
    product_id: genId('prod', 1),
    order_id: genId('order', 1),
    customer_email: 'john.doe@example.com',
    customer_name: 'John D.',
    rating: 5,
    title: 'Great product!',
    body: 'This widget exceeded my expectations.',
    status: 'approved',
    is_verified_purchase: true,
    helpful_votes: 10,
    unhelpful_votes: 1,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Pending review
  {
    id: genId('review', 2),
    product_id: genId('prod', 2),
    order_id: null, // Imported review without order
    customer_email: 'anonymous@test.com',
    customer_name: null,
    rating: 3,
    title: 'Okay product',
    body: null,
    status: 'pending',
    is_verified_purchase: false,
    helpful_votes: 0,
    unhelpful_votes: 0,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: null,
  },
  // Review with out-of-range rating (should be clamped)
  {
    id: genId('review', 3),
    product_id: genId('prod', 1),
    order_id: null,
    customer_email: 'test@test.com',
    customer_name: 'Test User',
    rating: 10, // Should be clamped to 5
    title: 'Amazing!',
    body: 'Best thing ever!',
    status: 'APPROVED', // Test uppercase normalization
    is_verified_purchase: false,
    helpful_votes: 0,
    unhelpful_votes: 0,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Review with string rating
  {
    id: genId('review', 4),
    product_id: genId('prod', 1),
    order_id: null,
    customer_email: 'string@test.com',
    customer_name: 'String Rating',
    rating: '4', // String that should be converted
    title: 'Good',
    body: 'Pretty good product.',
    status: 'approved',
    is_verified_purchase: false,
    helpful_votes: 0,
    unhelpful_votes: 0,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample creator records
 */
export const CREATOR_FIXTURES: DatabaseRow[] = [
  // Active creator
  {
    id: genId('creator', 1),
    user_id: genId('user', 1),
    name: 'John Creator',
    email: 'creator@example.com',
    status: 'active',
    tier: 'gold',
    commission_rate: 15.5, // Old column name
    commission_type: 'percentage',
    currency: 'USD',
    balance_cents: 50000,
    pending_balance_cents: 10000,
    total_orders: 100,
    total_revenue_cents: 1000000,
    total_commission_cents: 155000,
    social_profiles: {
      instagram: '@johncreator',
      youtube: 'JohnCreator',
    },
    payout_details: '{"bank": "Chase", "account_last4": "1234"}', // Sensitive - should be encrypted
    metadata: { verified: true },
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Pending creator
  {
    id: genId('creator', 2),
    user_id: genId('user', 2),
    name: 'Pending Creator',
    email: 'pending@example.com',
    status: 'PENDING', // Test uppercase normalization
    tier: 'BRONZE', // Test uppercase normalization
    commission_percent: '10.0', // Old column name, string value
    commission_type: 'percentage',
    currency: 'USD',
    balance_cents: 0,
    pending_balance_cents: 0,
    total_orders: 0,
    total_revenue_cents: 0,
    total_commission_cents: 0,
    social_profiles: JSON.stringify({}), // Test string JSON
    payout_details: null,
    metadata: {},
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: null,
  },
  // Creator with minimal data
  {
    id: genId('creator', 3),
    user_id: genId('user', 3),
    name: 'Minimal Creator',
    email: 'minimal@example.com',
    status: 'active',
    tier: 'bronze',
    // Missing commission_rate - should use default
    commission_type: 'percentage',
    currency: 'USD',
    // Missing balance fields - should use defaults
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample creator project records
 */
export const CREATOR_PROJECT_FIXTURES: DatabaseRow[] = [
  {
    id: genId('proj', 1),
    creator_id: genId('creator', 1),
    name: 'Summer Campaign',
    description: 'A campaign for summer products.',
    status: 'active',
    budget_cents: 100000,
    spent_cents: 50000,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  {
    id: genId('proj', 2),
    creator_id: genId('creator', 1),
    name: 'Winter Sale',
    description: null,
    status: 'completed',
    budget_cents: 50000,
    spent_cents: 50000,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample balance transaction records
 */
export const BALANCE_TRANSACTION_FIXTURES: DatabaseRow[] = [
  {
    id: genId('bt', 1),
    creator_id: genId('creator', 1),
    type: 'commission',
    amount_cents: 5000,
    balance_after_cents: 55000,
    description: 'Commission for order #1001',
    reference_type: 'order',
    reference_id: genId('order', 1),
    created_at: randomDate(START_DATE, END_DATE),
  },
  {
    id: genId('bt', 2),
    creator_id: genId('creator', 1),
    type: 'withdrawal',
    amount_cents: -10000,
    balance_after_cents: 45000,
    description: 'Withdrawal to bank',
    reference_type: 'payout',
    reference_id: genId('payout', 1),
    created_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample withdrawal request records (maps to payouts)
 */
export const WITHDRAWAL_REQUEST_FIXTURES: DatabaseRow[] = [
  // Completed withdrawal
  {
    id: genId('wr', 1),
    creator_id: genId('creator', 1),
    amount_cents: 10000,
    amount: 10000, // Alternate column name
    currency: 'USD',
    status: 'approved',
    method: 'paypal',
    fee_cents: 50,
    bank_details: '{"paypal_email": "creator@paypal.com"}', // Old column name, sensitive
    admin_notes: 'Approved by admin', // Old column name
    completed_at: randomDate(START_DATE, END_DATE),
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  // Pending withdrawal
  {
    id: genId('wr', 2),
    creator_id: genId('creator', 1),
    amount_cents: 20000,
    currency: 'USD',
    status: 'requested',
    method: 'stripe',
    fee_cents: 0,
    bank_details: null,
    admin_notes: null,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: null,
  },
  // Rejected withdrawal
  {
    id: genId('wr', 3),
    creator_id: genId('creator', 2),
    amount_cents: 5000,
    currency: 'USD',
    status: 'rejected',
    method: 'manual',
    fee_cents: 0,
    rejection_reason: 'Insufficient balance',
    bank_details: null,
    failed_at: randomDate(START_DATE, END_DATE),
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample landing page records
 */
export const LANDING_PAGE_FIXTURES: DatabaseRow[] = [
  {
    id: genId('lp', 1),
    slug: 'summer-sale',
    title: 'Summer Sale 2024',
    content: '<h1>Big Summer Sale!</h1><p>Up to 50% off.</p>',
    seo_title: 'Summer Sale - Up to 50% Off',
    seo_description: 'Shop our biggest summer sale ever.',
    is_published: true,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  {
    id: genId('lp', 2),
    slug: 'draft-page',
    title: 'Draft Landing Page',
    content: null,
    seo_title: null,
    seo_description: null,
    is_published: false,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: null,
  },
]

/**
 * Sample blog post records
 */
export const BLOG_POST_FIXTURES: DatabaseRow[] = [
  {
    id: genId('blog', 1),
    slug: 'welcome-post',
    title: 'Welcome to Our Blog',
    excerpt: 'Read our first blog post.',
    body_html: '<p>Welcome to our new blog!</p>',
    author_name: 'Admin',
    status: 'published',
    published_at: randomDate(START_DATE, END_DATE),
    tags: ['welcome', 'news'],
    related_product_ids: [genId('prod', 1)],
    metadata: { featured: true },
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  {
    id: genId('blog', 2),
    slug: 'draft-post',
    title: 'Draft Post',
    excerpt: null,
    body_html: '<p>Work in progress...</p>',
    author_name: 'Writer',
    status: 'DRAFT', // Test uppercase normalization
    published_at: null,
    tags: JSON.stringify(['draft']), // Test string JSON
    related_product_ids: [],
    metadata: {},
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: null,
  },
]

/**
 * Sample AB test records
 */
export const AB_TEST_FIXTURES: DatabaseRow[] = [
  {
    id: genId('ab', 1),
    name: 'Homepage Hero Test',
    description: 'Testing different hero images',
    status: 'active',
    variants: [
      { id: 'control', name: 'Original', weight: 50 },
      { id: 'variant_a', name: 'New Hero', weight: 50 },
    ],
    start_date: randomDate(START_DATE, END_DATE),
    end_date: null,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample attribution touchpoint records
 */
export const ATTRIBUTION_TOUCHPOINT_FIXTURES: DatabaseRow[] = [
  {
    id: genId('at', 1),
    order_id: genId('order', 1),
    channel: 'ORGANIC', // Test uppercase normalization
    source: 'google',
    medium: 'search',
    campaign: null,
    touchpoint_type: 'FIRST_CLICK', // Test uppercase normalization
    touchpoint_at: randomDate(START_DATE, END_DATE),
    created_at: randomDate(START_DATE, END_DATE),
  },
  {
    id: genId('at', 2),
    order_id: genId('order', 1),
    channel: 'paid',
    source: 'facebook',
    medium: 'cpc',
    campaign: 'summer_promo',
    touchpoint_type: 'last_click',
    touchpoint_at: randomDate(START_DATE, END_DATE),
    created_at: randomDate(START_DATE, END_DATE),
  },
]

/**
 * Sample e-sign document records
 */
export const ESIGN_DOCUMENT_FIXTURES: DatabaseRow[] = [
  {
    id: genId('esign', 1),
    creator_id: genId('creator', 1),
    template_id: 'contract_v1',
    status: 'completed',
    signed_at: randomDate(START_DATE, END_DATE),
    access_token: 'super-secret-token-12345', // Sensitive - should be encrypted
    document_url: 'https://esign.example.com/doc/12345',
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: randomDate(START_DATE, END_DATE),
  },
  {
    id: genId('esign', 2),
    creator_id: genId('creator', 2),
    template_id: 'nda_v1',
    status: 'PENDING', // Test uppercase normalization
    signed_at: null,
    access_token: 'another-secret-token', // Sensitive
    document_url: null,
    created_at: randomDate(START_DATE, END_DATE),
    updated_at: null,
  },
]

/**
 * All fixtures organized by table name
 */
export const ALL_FIXTURES: Record<string, DatabaseRow[]> = {
  customers: CUSTOMER_FIXTURES,
  products: PRODUCT_FIXTURES,
  orders: ORDER_FIXTURES,
  line_items: LINE_ITEM_FIXTURES,
  reviews: REVIEW_FIXTURES,
  creators: CREATOR_FIXTURES,
  creator_projects: CREATOR_PROJECT_FIXTURES,
  balance_transactions: BALANCE_TRANSACTION_FIXTURES,
  withdrawal_requests: WITHDRAWAL_REQUEST_FIXTURES,
  landing_pages: LANDING_PAGE_FIXTURES,
  blog_posts: BLOG_POST_FIXTURES,
  ab_tests: AB_TEST_FIXTURES,
  attribution_touchpoints: ATTRIBUTION_TOUCHPOINT_FIXTURES,
  esign_documents: ESIGN_DOCUMENT_FIXTURES,
}

/**
 * Edge case test data
 */
export const EDGE_CASES = {
  // Very long string values
  longString: 'A'.repeat(10000),

  // Special characters
  specialChars: "O'Reilly & Sons <script>alert('xss')</script>",

  // Unicode and emoji
  unicodeText: 'Caf au lait with ',

  // Large numbers
  largeNumber: Number.MAX_SAFE_INTEGER,

  // Very small decimal
  smallDecimal: 0.000001,

  // Negative number
  negativeNumber: -9999,

  // Empty string
  emptyString: '',

  // Whitespace only
  whitespaceOnly: '   \n\t  ',

  // SQL injection attempt
  sqlInjection: "'; DROP TABLE users; --",

  // JSON string that looks like an object
  jsonLikeString: '{"key": "value"}',

  // Date edge cases
  dates: {
    minDate: new Date('1970-01-01'),
    maxDate: new Date('2099-12-31'),
    invalidDate: 'not-a-date',
  },
}

/**
 * Generate a large dataset for performance testing
 */
export function generateLargeDataset(
  count: number,
  template: DatabaseRow
): DatabaseRow[] {
  const result: DatabaseRow[] = []

  for (let i = 0; i < count; i++) {
    const row: DatabaseRow = {}
    for (const [key, value] of Object.entries(template)) {
      if (key === 'id') {
        row[key] = `generated_${String(i).padStart(8, '0')}`
      } else if (key === 'email' && typeof value === 'string') {
        row[key] = `user${i}@example.com`
      } else if (key === 'created_at' || key === 'updated_at') {
        row[key] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      } else {
        row[key] = value
      }
    }
    result.push(row)
  }

  return result
}
