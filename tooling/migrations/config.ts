/**
 * Migration Configuration
 *
 * Defines table order, batch sizes, and connection configuration
 * for the RAWDOG data migration to the new multi-tenant schema.
 */

/**
 * Batch size for migration operations
 * Keep this reasonable to avoid memory issues
 */
export const BATCH_SIZE = 1000

/**
 * Maximum retry attempts for failed operations
 */
export const MAX_RETRIES = 3

/**
 * Delay between retries in milliseconds
 */
export const RETRY_DELAY_MS = 1000

/**
 * Sample size for data validation comparisons
 */
export const VALIDATION_SAMPLE_SIZE = 100

/**
 * Default tenant slug for RAWDOG migration
 */
export const DEFAULT_TENANT_SLUG = 'rawdog'

/**
 * Tables to migrate in foreign key dependency order
 * Parents must be migrated before children to maintain referential integrity
 */
export const TABLE_MIGRATION_ORDER = [
  // Independent tables (no foreign keys to other tenant tables)
  'customers',
  'products',

  // Tables with foreign keys to customers/products
  'orders',

  // Tables with foreign keys to orders
  'line_items',

  // Tables with foreign keys to products/orders
  'reviews',

  // Creator system tables (hierarchy: creators -> projects -> transactions)
  'creators',
  'creator_projects',
  'balance_transactions',
  'withdrawal_requests',

  // Content and marketing tables
  'landing_pages',
  'blog_posts',
  'ab_tests',

  // Attribution and documents
  'attribution_touchpoints',
  'esign_documents',
] as const

export type MigratableTable = (typeof TABLE_MIGRATION_ORDER)[number]

/**
 * Tables with financial amounts that need sum validation
 */
export const FINANCIAL_TABLES: {
  table: MigratableTable
  column: string
}[] = [
  { table: 'orders', column: 'total_cents' },
  { table: 'balance_transactions', column: 'amount_cents' },
]

/**
 * Foreign key relationships to validate
 * Each entry specifies the child table, child column, parent table, and parent column
 */
export const FOREIGN_KEY_RELATIONSHIPS: {
  childTable: MigratableTable
  childColumn: string
  parentTable: MigratableTable
  parentColumn: string
}[] = [
  {
    childTable: 'line_items',
    childColumn: 'order_id',
    parentTable: 'orders',
    parentColumn: 'id',
  },
  {
    childTable: 'creator_projects',
    childColumn: 'creator_id',
    parentTable: 'creators',
    parentColumn: 'id',
  },
  {
    childTable: 'balance_transactions',
    childColumn: 'creator_id',
    parentTable: 'creators',
    parentColumn: 'id',
  },
  {
    childTable: 'withdrawal_requests',
    childColumn: 'creator_id',
    parentTable: 'creators',
    parentColumn: 'id',
  },
]

/**
 * Review-specific foreign keys (optional references)
 */
export const REVIEW_FOREIGN_KEYS = [
  {
    childTable: 'reviews' as MigratableTable,
    childColumn: 'product_id',
    parentTable: 'products' as MigratableTable,
    parentColumn: 'id',
  },
  {
    childTable: 'reviews' as MigratableTable,
    childColumn: 'order_id',
    parentTable: 'orders' as MigratableTable,
    parentColumn: 'id',
    optional: true, // order_id may be null for imported reviews
  },
]

/**
 * Environment variable names for database connections
 */
export const DB_CONNECTIONS = {
  /** Old RAWDOG database (source) */
  source: 'RAWDOG_POSTGRES_URL',
  /** New CGK database (destination) */
  destination: 'POSTGRES_URL',
  /** Encryption key for sensitive data */
  encryptionKey: 'MIGRATION_ENCRYPTION_KEY',
} as const

/**
 * Get database connection URL from environment
 */
export function getConnectionUrl(
  type: keyof typeof DB_CONNECTIONS
): string | undefined {
  return process.env[DB_CONNECTIONS[type]]
}

/**
 * Validate that required environment variables are set
 */
export function validateEnvironment(): {
  valid: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []

  if (!process.env[DB_CONNECTIONS.source]) {
    missing.push(DB_CONNECTIONS.source)
  }
  if (!process.env[DB_CONNECTIONS.destination]) {
    missing.push(DB_CONNECTIONS.destination)
  }
  if (!process.env[DB_CONNECTIONS.encryptionKey]) {
    warnings.push(
      `${DB_CONNECTIONS.encryptionKey} not set - sensitive data will use auto-generated key`
    )
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Column mappings for tables with different schemas between source and destination
 */
export const COLUMN_MAPPINGS: Partial<
  Record<MigratableTable, Record<string, string>>
> = {
  creators: {
    commission_rate: 'commission_rate_pct',
    commission_percent: 'commission_rate_pct',
  },
  withdrawal_requests: {
    // withdrawal_requests in RAWDOG maps to payouts in CGK
    rejection_reason: 'failure_reason',
    admin_notes: 'notes',
    bank_details: 'payout_details',
  },
}

/**
 * Default values for required columns that may be missing in source
 */
export const DEFAULT_VALUES: Partial<
  Record<MigratableTable, Record<string, unknown>>
> = {
  orders: {
    currency: 'USD',
    status: 'pending',
    fulfillment_status: 'unfulfilled',
    financial_status: 'pending',
    line_items: [],
  },
  creators: {
    status: 'pending',
    tier: 'bronze',
    commission_rate_pct: 10.0,
    commission_type: 'percentage',
    currency: 'USD',
    balance_cents: 0,
    pending_balance_cents: 0,
    total_orders: 0,
    total_revenue_cents: 0,
    total_commission_cents: 0,
    social_profiles: {},
    metadata: {},
  },
  products: {
    status: 'active',
    currency: 'USD',
    images: [],
    variants: [],
    options: [],
  },
  customers: {
    currency: 'USD',
    orders_count: 0,
    total_spent_cents: 0,
    accepts_marketing: false,
    metadata: {},
  },
  reviews: {
    status: 'pending',
    helpful_votes: 0,
    unhelpful_votes: 0,
    is_verified_purchase: false,
  },
  blog_posts: {
    status: 'draft',
    metadata: {},
    tags: [],
    related_product_ids: [],
  },
}
