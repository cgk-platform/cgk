/**
 * Integration types and interfaces for the Integration Hub
 */

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending'

export type IntegrationCategory = 'commerce' | 'advertising' | 'communications' | 'marketing' | 'platform'

export type ConnectionType = 'oauth' | 'api_key' | 'env' | 'hybrid'

export interface IntegrationCard {
  id: string
  name: string
  description: string
  icon: string
  status: IntegrationStatus
  statusDetails?: string
  configPath: string
  category: IntegrationCategory
  connectionType: ConnectionType
  lastSyncedAt?: string
  expiresAt?: string
}

export interface IntegrationCategory {
  id: string
  label: string
  description: string
  integrations: string[]
}

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  {
    id: 'commerce',
    label: 'E-Commerce',
    description: 'Store and inventory management',
    integrations: ['shopify-app'],
  },
  {
    id: 'advertising',
    label: 'Advertising',
    description: 'Paid media and attribution',
    integrations: ['meta-ads', 'google-ads', 'tiktok-ads'],
  },
  {
    id: 'communications',
    label: 'Communications',
    description: 'Customer and team messaging',
    integrations: ['sms', 'slack'],
  },
  {
    id: 'marketing',
    label: 'Marketing & Reviews',
    description: 'Email, SMS marketing and reviews',
    integrations: ['klaviyo', 'yotpo'],
  },
  {
    id: 'platform',
    label: 'Platform',
    description: 'AI and developer tools',
    integrations: ['mcp'],
  },
]

export const INTEGRATION_DEFINITIONS: Record<string, Omit<IntegrationCard, 'status' | 'statusDetails' | 'lastSyncedAt' | 'expiresAt'>> = {
  'shopify-app': {
    id: 'shopify-app',
    name: 'Shopify',
    description: 'E-commerce platform with order sync and pixel tracking',
    icon: 'shopify',
    configPath: '/admin/integrations/shopify-app',
    category: 'commerce',
    connectionType: 'oauth',
  },
  'meta-ads': {
    id: 'meta-ads',
    name: 'Meta Ads',
    description: 'Facebook & Instagram advertising with CAPI',
    icon: 'meta',
    configPath: '/admin/integrations/meta-ads',
    category: 'advertising',
    connectionType: 'oauth',
  },
  'google-ads': {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Search and display advertising',
    icon: 'google',
    configPath: '/admin/integrations/google-ads',
    category: 'advertising',
    connectionType: 'hybrid',
  },
  'tiktok-ads': {
    id: 'tiktok-ads',
    name: 'TikTok Ads',
    description: 'TikTok advertising with Events API',
    icon: 'tiktok',
    configPath: '/admin/integrations/tiktok-ads',
    category: 'advertising',
    connectionType: 'oauth',
  },
  'sms': {
    id: 'sms',
    name: 'SMS & Voice',
    description: 'Customer messaging via Retell.ai',
    icon: 'phone',
    configPath: '/admin/integrations/sms',
    category: 'communications',
    connectionType: 'api_key',
  },
  'slack': {
    id: 'slack',
    name: 'Slack',
    description: 'Team notifications and AI tools',
    icon: 'slack',
    configPath: '/admin/integrations/slack',
    category: 'communications',
    connectionType: 'oauth',
  },
  'klaviyo': {
    id: 'klaviyo',
    name: 'Klaviyo',
    description: 'Email and SMS marketing automation',
    icon: 'mail',
    configPath: '/admin/integrations/klaviyo',
    category: 'marketing',
    connectionType: 'api_key',
  },
  'yotpo': {
    id: 'yotpo',
    name: 'Yotpo',
    description: 'Product reviews and ratings',
    icon: 'star',
    configPath: '/admin/integrations/yotpo',
    category: 'marketing',
    connectionType: 'api_key',
  },
  'mcp': {
    id: 'mcp',
    name: 'MCP Server',
    description: 'Claude AI integration tools',
    icon: 'cpu',
    configPath: '/admin/integrations/mcp',
    category: 'platform',
    connectionType: 'api_key',
  },
}

// SMS/Voice types
export interface SmsConsentStats {
  totalOptedIn: number
  totalOptedOut: number
  optInRate: number
  todayMessages: number
  weekMessages: number
  monthMessages: number
}

export interface SmsAuditLogEntry {
  id: string
  phone: string
  email: string | null
  channel: 'sms' | 'email'
  action: 'opt_in' | 'opt_out' | 'consent_granted' | 'consent_revoked' | 'consent_violation_attempt'
  source: 'checkout' | 'admin' | 'stop_keyword' | 'api' | 'import'
  ipAddress: string | null
  createdAt: string
}

export interface SmsNotificationConfig {
  id: string
  type: string
  label: string
  description: string
  channels: {
    sms: boolean
    email: boolean
    portal: boolean
  }
}

// Slack types
export interface SlackNotificationCategory {
  id: string
  label: string
  icon: string
  notifications: SlackNotification[]
}

export interface SlackNotification {
  id: string
  label: string
  description: string
  enabled: boolean
  channelId?: string
}

// MCP types
export interface McpCapability {
  id: string
  icon: string
  title: string
  description: string
  toolCount?: number
}

export interface McpApiKey {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
}

export interface McpAnalyticsSummary {
  totalToolCalls: number
  uniqueTools: number
  totalTokens: number
  avgTokensPerSession: number
  errorRate: number
  uniqueSessions: number
}

// Meta Ads types
export interface MetaAdAccount {
  id: string
  name: string
  currency: string
  status: string
}

export interface MetaAdsStatus {
  connected: boolean
  accounts: MetaAdAccount[]
  selectedAccountId?: string
  pixelId?: string
  capiConfigured: boolean
  lastSyncedAt?: string
  tokenExpiresAt?: string
  syncStatus: 'idle' | 'syncing' | 'error'
}

// Google Ads types
export interface GoogleAdsStatus {
  connected: boolean
  mode: 'api' | 'script' | 'none'
  customerId?: string
  customerName?: string
  lastSyncedAt?: string
  tokenExpiresAt?: string
}

// TikTok Ads types
export interface TikTokAdsStatus {
  connected: boolean
  advertiserId?: string
  pixelId?: string
  eventsApiConfigured: boolean
  lastSyncedAt?: string
  tokenExpiresAt?: string
}

// Klaviyo types
export interface KlaviyoStatus {
  connected: boolean
  companyName?: string
  smsListId?: string
  emailListId?: string
  authSource: 'database' | 'env'
}

// Yotpo types
export interface YotpoStatus {
  connected: boolean
  appKey?: string
  productMappings?: {
    cleanser?: string
    moisturizer?: string
    eyeCream?: string
    bundle?: string
  }
  authSource: 'database' | 'env'
}

// Shopify types
export interface ShopifyAppStatus {
  connected: boolean
  shopDomain?: string
  scopes: string[]
  pixelEnabled: boolean
  storefrontConfigured: boolean
  lastSyncedAt?: string
}
