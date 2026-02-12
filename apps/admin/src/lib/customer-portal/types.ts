/**
 * Customer Portal Admin Types
 *
 * Type definitions for portal settings, customer data, and analytics.
 */

/** Portal feature flags configuration */
export interface PortalFeatures {
  /** Show orders page in portal */
  orders: boolean
  /** Show subscriptions page in portal */
  subscriptions: boolean
  /** Show addresses page in portal */
  addresses: boolean
  /** Show profile page in portal */
  profile: boolean
  /** Show store credit balance page */
  storeCredit: boolean
  /** Show rewards/loyalty page */
  rewards: boolean
  /** Show referrals page */
  referrals: boolean
  /** Allow self-service subscription pause */
  subscriptionPause: boolean
  /** Allow self-service subscription skip */
  subscriptionSkip: boolean
  /** Allow self-service subscription cancellation */
  subscriptionCancelSelfServe: boolean
  /** Allow subscription delivery reschedule */
  subscriptionReschedule: boolean
  /** Allow payment method updates */
  subscriptionPaymentUpdate: boolean
  /** Allow shipping address updates on subscription */
  subscriptionAddressUpdate: boolean
}

/** Portal branding configuration */
export interface PortalBranding {
  /** Primary brand color (hex) */
  primaryColor: string
  /** Secondary brand color (hex) */
  secondaryColor: string
  /** Accent color for CTAs (hex) */
  accentColor: string
  /** Background color (hex) */
  backgroundColor: string
  /** Card background color (hex) */
  cardBackgroundColor: string
  /** Border color (hex) */
  borderColor: string
  /** Logo URL */
  logoUrl: string | null
  /** Favicon URL */
  faviconUrl: string | null
  /** Font family for headings */
  headingFont: string
  /** Font family for body text */
  bodyFont: string
  /** Border radius for cards (px) */
  cardBorderRadius: number
  /** Border radius for buttons (px) */
  buttonBorderRadius: number
  /** Custom CSS overrides */
  customCss: string | null
}

/** Portal messaging strings */
export interface PortalMessaging {
  /** Welcome message on dashboard */
  welcomeMessage: string
  /** Dashboard page title */
  dashboardTitle: string
  /** Orders page title */
  ordersTitle: string
  /** Orders page description */
  ordersDescription: string
  /** Empty orders state message */
  ordersEmptyMessage: string
  /** Subscriptions page title */
  subscriptionsTitle: string
  /** Subscriptions page description */
  subscriptionsDescription: string
  /** Empty subscriptions state message */
  subscriptionsEmptyMessage: string
  /** Sign out button text */
  signOutText: string
  /** Footer text */
  footerText: string
}

/** Communication preference options */
export interface CommunicationPreference {
  id: string
  customerId: string
  /** Email for order confirmations */
  orderConfirmations: boolean
  /** Email for shipping updates */
  shippingUpdates: boolean
  /** Email for subscription reminders */
  subscriptionReminders: boolean
  /** Marketing emails */
  marketingEmails: boolean
  /** SMS notifications */
  smsNotifications: boolean
  /** Promotional SMS */
  promotionalSms: boolean
  createdAt: string
  updatedAt: string
}

/** Portal settings record */
export interface PortalSettings {
  id: string
  tenantId: string
  features: PortalFeatures
  branding: PortalBranding
  messaging: PortalMessaging
  /** Custom domain for portal */
  customDomain: string | null
  /** SSL certificate status */
  sslStatus: 'pending' | 'active' | 'failed' | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/** Customer lookup result */
export interface PortalCustomer {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  ordersCount: number
  totalSpentCents: number
  currency: string
  lastLoginAt: string | null
  portalAccessEnabled: boolean
  createdAt: string
}

/** Customer session for impersonation */
export interface CustomerSession {
  id: string
  customerId: string
  adminUserId: string
  impersonationReason: string
  startedAt: string
  endedAt: string | null
  actionsPerformed: string[]
}

/** Portal analytics event */
export interface PortalAnalyticsEvent {
  id: string
  customerId: string | null
  eventType: 'login' | 'page_view' | 'action'
  eventName: string
  pagePath: string | null
  metadata: Record<string, unknown> | null
  occurredAt: string
}

/** Portal analytics summary */
export interface PortalAnalyticsSummary {
  /** Total unique logins in period */
  uniqueLogins: number
  /** Total login events in period */
  totalLogins: number
  /** Total page views in period */
  pageViews: number
  /** Total actions taken in period */
  actions: number
  /** Top pages by views */
  topPages: Array<{ path: string; views: number }>
  /** Top actions by count */
  topActions: Array<{ name: string; count: number }>
  /** Logins by day for chart */
  loginsByDay: Array<{ date: string; count: number }>
  /** Page views by day for chart */
  pageViewsByDay: Array<{ date: string; count: number }>
}

/** Default portal features */
export const DEFAULT_PORTAL_FEATURES: PortalFeatures = {
  orders: true,
  subscriptions: true,
  addresses: true,
  profile: true,
  storeCredit: true,
  rewards: false,
  referrals: false,
  subscriptionPause: true,
  subscriptionSkip: true,
  subscriptionCancelSelfServe: true,
  subscriptionReschedule: true,
  subscriptionPaymentUpdate: true,
  subscriptionAddressUpdate: true,
}

/** Default portal branding */
export const DEFAULT_PORTAL_BRANDING: PortalBranding = {
  primaryColor: '#18181b',
  secondaryColor: '#71717a',
  accentColor: '#f59e0b',
  backgroundColor: '#fafafa',
  cardBackgroundColor: '#ffffff',
  borderColor: '#e4e4e7',
  logoUrl: null,
  faviconUrl: null,
  headingFont: 'system-ui',
  bodyFont: 'system-ui',
  cardBorderRadius: 12,
  buttonBorderRadius: 8,
  customCss: null,
}

/** Default portal messaging */
export const DEFAULT_PORTAL_MESSAGING: PortalMessaging = {
  welcomeMessage: 'Welcome back, {{firstName}}!',
  dashboardTitle: 'My Account',
  ordersTitle: 'Orders',
  ordersDescription: 'View your order history and track shipments',
  ordersEmptyMessage: 'No orders yet. Start shopping to see your orders here.',
  subscriptionsTitle: 'Subscriptions',
  subscriptionsDescription: 'Manage your recurring orders',
  subscriptionsEmptyMessage: 'No active subscriptions.',
  signOutText: 'Sign Out',
  footerText: 'Need help? Contact us.',
}

/** Feature toggle metadata for UI */
export interface FeatureToggleMeta {
  key: keyof PortalFeatures
  label: string
  description: string
  category: 'core' | 'subscription'
  warning?: string
}

/** Feature toggles with UI metadata */
export const FEATURE_TOGGLES: FeatureToggleMeta[] = [
  // Core pages
  {
    key: 'orders',
    label: 'Orders',
    description: 'Show order history and tracking',
    category: 'core',
    warning: 'Disabling this hides all order information from customers',
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    description: 'Show subscription management page',
    category: 'core',
  },
  {
    key: 'addresses',
    label: 'Addresses',
    description: 'Show saved addresses page',
    category: 'core',
  },
  {
    key: 'profile',
    label: 'Profile',
    description: 'Show profile editing page',
    category: 'core',
  },
  {
    key: 'storeCredit',
    label: 'Store Credit',
    description: 'Show store credit balance and history',
    category: 'core',
  },
  {
    key: 'rewards',
    label: 'Rewards',
    description: 'Show loyalty rewards program',
    category: 'core',
  },
  {
    key: 'referrals',
    label: 'Referrals',
    description: 'Show referral program and codes',
    category: 'core',
  },
  // Subscription actions
  {
    key: 'subscriptionPause',
    label: 'Pause Subscription',
    description: 'Allow customers to pause subscriptions',
    category: 'subscription',
  },
  {
    key: 'subscriptionSkip',
    label: 'Skip Delivery',
    description: 'Allow customers to skip next delivery',
    category: 'subscription',
  },
  {
    key: 'subscriptionCancelSelfServe',
    label: 'Self-Service Cancel',
    description: 'Allow customers to cancel without support',
    category: 'subscription',
    warning: 'Disabling requires customers to contact support to cancel',
  },
  {
    key: 'subscriptionReschedule',
    label: 'Reschedule Delivery',
    description: 'Allow customers to change delivery dates',
    category: 'subscription',
  },
  {
    key: 'subscriptionPaymentUpdate',
    label: 'Update Payment',
    description: 'Allow customers to update payment methods',
    category: 'subscription',
  },
  {
    key: 'subscriptionAddressUpdate',
    label: 'Update Address',
    description: 'Allow customers to change shipping address',
    category: 'subscription',
  },
]
