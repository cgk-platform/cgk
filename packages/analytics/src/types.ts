/**
 * Analytics types
 */

export interface AnalyticsEvent {
  name: string
  params?: EventParams
  timestamp?: number
  userId?: string
  sessionId?: string
}

export interface EventParams {
  [key: string]: string | number | boolean | undefined
}

export interface UserProperties {
  userId?: string
  userType?: 'visitor' | 'customer' | 'creator' | 'admin'
  tenantId?: string
  [key: string]: string | number | boolean | undefined
}

export interface AnalyticsConfig {
  measurementId?: string
  debug?: boolean
  sendPageViews?: boolean
  anonymizeIp?: boolean
}
