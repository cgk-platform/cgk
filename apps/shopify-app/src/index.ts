/**
 * CGK Platform Shopify App
 *
 * This app contains Shopify extensions for the CGK multi-tenant platform:
 * - Delivery Customization (Rust Function for A/B testing shipping rates)
 * - Session Stitching Pixel (Web Pixel for attribution tracking)
 * - Post-Purchase Survey (Checkout UI Extension)
 *
 * Extensions are built and deployed via Shopify CLI.
 * This module exports utility functions and types.
 */

// Re-export types from the main shopify package
export type {
  ShopifyError,
  ShopifyErrorCode,
  OAuthCallbackParams,
  ShopifyConnection,
  ShopifyCredentials,
  WebhookTopic,
  WebhookHandler,
} from '@cgk/shopify'

// Extension configuration types
export interface ExtensionSettings {
  /** GA4 Measurement ID */
  ga4MeasurementId?: string
  /** GA4 API Secret for Measurement Protocol */
  ga4ApiSecret?: string
  /** Meta Pixel ID */
  metaPixelId?: string
  /** Meta CAPI Access Token */
  metaAccessToken?: string
  /** Platform API URL for events */
  platformApiUrl?: string
  /** Survey configuration URL */
  surveyConfigUrl?: string
}

// App info
export const APP_NAME = 'CGK Platform Functions'
export const API_VERSION = '2026-01'

// Extension handles (must match shopify.extension.toml files)
export const EXTENSIONS = {
  DELIVERY_CUSTOMIZATION: 'delivery-customization',
  SESSION_STITCHING_PIXEL: 'session-stitching-pixel',
  POST_PURCHASE_SURVEY: 'post-purchase-survey',
} as const

export type ExtensionHandle = (typeof EXTENSIONS)[keyof typeof EXTENSIONS]
