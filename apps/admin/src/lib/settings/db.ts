/**
 * Tenant Settings Database Operations
 *
 * CRUD operations for AI Settings, Payout Settings, and Site Configuration.
 * All operations assume tenant context is already set via withTenant().
 */

import { sql } from '@cgk-platform/db'

import type {
  AISettings,
  AISettingsUpdate,
  PayoutSettings,
  PayoutSettingsUpdate,
  SettingType,
  SiteConfig,
  SiteConfigUpdate,
} from './types'

// ============================================================
// AI Settings
// ============================================================

export async function getAISettings(tenantId: string): Promise<AISettings | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      ai_enabled as "aiEnabled",
      brii_enabled as "briiEnabled",
      ai_content_enabled as "aiContentEnabled",
      ai_insights_enabled as "aiInsightsEnabled",
      ai_model_preference as "aiModelPreference",
      ai_monthly_budget_usd as "aiMonthlyBudgetUsd",
      ai_current_month_usage_usd as "aiCurrentMonthUsageUsd",
      ai_content_auto_approve as "aiContentAutoApprove",
      ai_memory_enabled as "aiMemoryEnabled",
      ai_memory_retention_days as "aiMemoryRetentionDays",
      updated_at as "updatedAt",
      updated_by as "updatedBy"
    FROM ai_settings
    WHERE tenant_id = ${tenantId}
  `

  return result.rows[0] as AISettings | undefined ?? null
}

export async function upsertAISettings(
  tenantId: string,
  data: AISettingsUpdate,
  userId: string | null
): Promise<AISettings> {
  const result = await sql`
    INSERT INTO ai_settings (
      tenant_id,
      ai_enabled,
      brii_enabled,
      ai_content_enabled,
      ai_insights_enabled,
      ai_model_preference,
      ai_monthly_budget_usd,
      ai_content_auto_approve,
      ai_memory_enabled,
      ai_memory_retention_days,
      updated_by
    ) VALUES (
      ${tenantId},
      ${data.aiEnabled ?? true},
      ${data.briiEnabled ?? false},
      ${data.aiContentEnabled ?? true},
      ${data.aiInsightsEnabled ?? true},
      ${data.aiModelPreference ?? 'auto'},
      ${data.aiMonthlyBudgetUsd ?? null},
      ${data.aiContentAutoApprove ?? false},
      ${data.aiMemoryEnabled ?? true},
      ${data.aiMemoryRetentionDays ?? 90},
      ${userId}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      ai_enabled = COALESCE(${data.aiEnabled}, ai_settings.ai_enabled),
      brii_enabled = COALESCE(${data.briiEnabled}, ai_settings.brii_enabled),
      ai_content_enabled = COALESCE(${data.aiContentEnabled}, ai_settings.ai_content_enabled),
      ai_insights_enabled = COALESCE(${data.aiInsightsEnabled}, ai_settings.ai_insights_enabled),
      ai_model_preference = COALESCE(${data.aiModelPreference}, ai_settings.ai_model_preference),
      ai_monthly_budget_usd = CASE
        WHEN ${data.aiMonthlyBudgetUsd === undefined} THEN ai_settings.ai_monthly_budget_usd
        ELSE ${data.aiMonthlyBudgetUsd}
      END,
      ai_content_auto_approve = COALESCE(${data.aiContentAutoApprove}, ai_settings.ai_content_auto_approve),
      ai_memory_enabled = COALESCE(${data.aiMemoryEnabled}, ai_settings.ai_memory_enabled),
      ai_memory_retention_days = COALESCE(${data.aiMemoryRetentionDays}, ai_settings.ai_memory_retention_days),
      updated_by = ${userId},
      updated_at = NOW()
    RETURNING
      id,
      tenant_id as "tenantId",
      ai_enabled as "aiEnabled",
      brii_enabled as "briiEnabled",
      ai_content_enabled as "aiContentEnabled",
      ai_insights_enabled as "aiInsightsEnabled",
      ai_model_preference as "aiModelPreference",
      ai_monthly_budget_usd as "aiMonthlyBudgetUsd",
      ai_current_month_usage_usd as "aiCurrentMonthUsageUsd",
      ai_content_auto_approve as "aiContentAutoApprove",
      ai_memory_enabled as "aiMemoryEnabled",
      ai_memory_retention_days as "aiMemoryRetentionDays",
      updated_at as "updatedAt",
      updated_by as "updatedBy"
  `

  return result.rows[0] as AISettings
}

export async function getAIUsage(tenantId: string): Promise<{
  currentMonthUsageUsd: number
  monthlyBudgetUsd: number | null
  percentUsed: number | null
}> {
  const settings = await getAISettings(tenantId)

  if (!settings) {
    return {
      currentMonthUsageUsd: 0,
      monthlyBudgetUsd: null,
      percentUsed: null,
    }
  }

  const currentMonthUsageUsd = Number(settings.aiCurrentMonthUsageUsd) || 0
  const monthlyBudgetUsd = settings.aiMonthlyBudgetUsd
    ? Number(settings.aiMonthlyBudgetUsd)
    : null
  const percentUsed = monthlyBudgetUsd
    ? Math.round((currentMonthUsageUsd / monthlyBudgetUsd) * 100)
    : null

  return { currentMonthUsageUsd, monthlyBudgetUsd, percentUsed }
}

export async function resetAIUsage(tenantId: string): Promise<void> {
  await sql`
    UPDATE ai_settings
    SET ai_current_month_usage_usd = 0, updated_at = NOW()
    WHERE tenant_id = ${tenantId}
  `
}

// ============================================================
// Payout Settings
// ============================================================

export async function getPayoutSettings(tenantId: string): Promise<PayoutSettings | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      default_payment_method as "defaultPaymentMethod",
      stripe_connect_enabled as "stripeConnectEnabled",
      paypal_enabled as "paypalEnabled",
      wise_enabled as "wiseEnabled",
      check_enabled as "checkEnabled",
      venmo_enabled as "venmoEnabled",
      payout_schedule as "payoutSchedule",
      payout_day as "payoutDay",
      min_payout_threshold_usd as "minPayoutThresholdUsd",
      max_pending_withdrawals as "maxPendingWithdrawals",
      hold_period_days as "holdPeriodDays",
      auto_payout_enabled as "autoPayoutEnabled",
      payout_fee_type as "payoutFeeType",
      payout_fee_amount as "payoutFeeAmount",
      require_tax_info as "requireTaxInfo",
      updated_at as "updatedAt",
      updated_by as "updatedBy"
    FROM payout_settings
    WHERE tenant_id = ${tenantId}
  `

  return result.rows[0] as PayoutSettings | undefined ?? null
}

export async function upsertPayoutSettings(
  tenantId: string,
  data: PayoutSettingsUpdate,
  userId: string | null
): Promise<PayoutSettings> {
  const result = await sql`
    INSERT INTO payout_settings (
      tenant_id,
      default_payment_method,
      stripe_connect_enabled,
      paypal_enabled,
      wise_enabled,
      check_enabled,
      venmo_enabled,
      payout_schedule,
      payout_day,
      min_payout_threshold_usd,
      max_pending_withdrawals,
      hold_period_days,
      auto_payout_enabled,
      payout_fee_type,
      payout_fee_amount,
      require_tax_info,
      updated_by
    ) VALUES (
      ${tenantId},
      ${data.defaultPaymentMethod ?? 'stripe_connect'},
      ${data.stripeConnectEnabled ?? true},
      ${data.paypalEnabled ?? true},
      ${data.wiseEnabled ?? false},
      ${data.checkEnabled ?? false},
      ${data.venmoEnabled ?? true},
      ${data.payoutSchedule ?? 'weekly'},
      ${data.payoutDay ?? 5},
      ${data.minPayoutThresholdUsd ?? 10},
      ${data.maxPendingWithdrawals ?? 3},
      ${data.holdPeriodDays ?? 7},
      ${data.autoPayoutEnabled ?? true},
      ${data.payoutFeeType ?? 'none'},
      ${data.payoutFeeAmount ?? 0},
      ${data.requireTaxInfo ?? true},
      ${userId}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      default_payment_method = COALESCE(${data.defaultPaymentMethod}, payout_settings.default_payment_method),
      stripe_connect_enabled = COALESCE(${data.stripeConnectEnabled}, payout_settings.stripe_connect_enabled),
      paypal_enabled = COALESCE(${data.paypalEnabled}, payout_settings.paypal_enabled),
      wise_enabled = COALESCE(${data.wiseEnabled}, payout_settings.wise_enabled),
      check_enabled = COALESCE(${data.checkEnabled}, payout_settings.check_enabled),
      venmo_enabled = COALESCE(${data.venmoEnabled}, payout_settings.venmo_enabled),
      payout_schedule = COALESCE(${data.payoutSchedule}, payout_settings.payout_schedule),
      payout_day = COALESCE(${data.payoutDay}, payout_settings.payout_day),
      min_payout_threshold_usd = COALESCE(${data.minPayoutThresholdUsd}, payout_settings.min_payout_threshold_usd),
      max_pending_withdrawals = COALESCE(${data.maxPendingWithdrawals}, payout_settings.max_pending_withdrawals),
      hold_period_days = COALESCE(${data.holdPeriodDays}, payout_settings.hold_period_days),
      auto_payout_enabled = COALESCE(${data.autoPayoutEnabled}, payout_settings.auto_payout_enabled),
      payout_fee_type = COALESCE(${data.payoutFeeType}, payout_settings.payout_fee_type),
      payout_fee_amount = COALESCE(${data.payoutFeeAmount}, payout_settings.payout_fee_amount),
      require_tax_info = COALESCE(${data.requireTaxInfo}, payout_settings.require_tax_info),
      updated_by = ${userId},
      updated_at = NOW()
    RETURNING
      id,
      tenant_id as "tenantId",
      default_payment_method as "defaultPaymentMethod",
      stripe_connect_enabled as "stripeConnectEnabled",
      paypal_enabled as "paypalEnabled",
      wise_enabled as "wiseEnabled",
      check_enabled as "checkEnabled",
      venmo_enabled as "venmoEnabled",
      payout_schedule as "payoutSchedule",
      payout_day as "payoutDay",
      min_payout_threshold_usd as "minPayoutThresholdUsd",
      max_pending_withdrawals as "maxPendingWithdrawals",
      hold_period_days as "holdPeriodDays",
      auto_payout_enabled as "autoPayoutEnabled",
      payout_fee_type as "payoutFeeType",
      payout_fee_amount as "payoutFeeAmount",
      require_tax_info as "requireTaxInfo",
      updated_at as "updatedAt",
      updated_by as "updatedBy"
  `

  return result.rows[0] as PayoutSettings
}

export async function getEnabledPaymentMethods(
  tenantId: string
): Promise<{ method: string; enabled: boolean }[]> {
  const settings = await getPayoutSettings(tenantId)

  if (!settings) {
    return [
      { method: 'stripe_connect', enabled: true },
      { method: 'paypal', enabled: true },
      { method: 'wise', enabled: false },
      { method: 'check', enabled: false },
      { method: 'venmo', enabled: true },
    ]
  }

  return [
    { method: 'stripe_connect', enabled: settings.stripeConnectEnabled },
    { method: 'paypal', enabled: settings.paypalEnabled },
    { method: 'wise', enabled: settings.wiseEnabled },
    { method: 'check', enabled: settings.checkEnabled },
    { method: 'venmo', enabled: settings.venmoEnabled },
  ]
}

// ============================================================
// Site Configuration
// ============================================================

export async function getSiteConfig(tenantId: string): Promise<SiteConfig | null> {
  const result = await sql`
    SELECT
      id,
      tenant_id as "tenantId",
      pricing_config as "pricingConfig",
      sale_active as "saleActive",
      sale_name as "saleName",
      sale_start_date as "saleStartDate",
      sale_end_date as "saleEndDate",
      sale_config as "saleConfig",
      announcement_bar_enabled as "announcementBarEnabled",
      announcement_bar_text as "announcementBarText",
      announcement_bar_link as "announcementBarLink",
      announcement_bar_bg_color as "announcementBarBgColor",
      announcement_bar_text_color as "announcementBarTextColor",
      promo_banners as "promoBanners",
      logo_url as "logoUrl",
      logo_dark_url as "logoDarkUrl",
      favicon_url as "faviconUrl",
      brand_colors as "brandColors",
      brand_fonts as "brandFonts",
      header_nav as "headerNav",
      footer_nav as "footerNav",
      social_links as "socialLinks",
      default_meta_title as "defaultMetaTitle",
      default_meta_description as "defaultMetaDescription",
      ga4_measurement_id as "ga4MeasurementId",
      fb_pixel_id as "fbPixelId",
      tiktok_pixel_id as "tiktokPixelId",
      updated_at as "updatedAt",
      updated_by as "updatedBy"
    FROM site_config
    WHERE tenant_id = ${tenantId}
  `

  return result.rows[0] as SiteConfig | undefined ?? null
}

export async function upsertSiteConfig(
  tenantId: string,
  data: SiteConfigUpdate,
  userId: string | null
): Promise<SiteConfig> {
  const result = await sql`
    INSERT INTO site_config (
      tenant_id,
      pricing_config,
      sale_active,
      sale_name,
      sale_start_date,
      sale_end_date,
      sale_config,
      announcement_bar_enabled,
      announcement_bar_text,
      announcement_bar_link,
      announcement_bar_bg_color,
      announcement_bar_text_color,
      promo_banners,
      logo_url,
      logo_dark_url,
      favicon_url,
      brand_colors,
      brand_fonts,
      header_nav,
      footer_nav,
      social_links,
      default_meta_title,
      default_meta_description,
      ga4_measurement_id,
      fb_pixel_id,
      tiktok_pixel_id,
      updated_by
    ) VALUES (
      ${tenantId},
      ${JSON.stringify(data.pricingConfig ?? {})},
      ${data.saleActive ?? false},
      ${data.saleName ?? null},
      ${data.saleStartDate ?? null},
      ${data.saleEndDate ?? null},
      ${JSON.stringify(data.saleConfig ?? {})},
      ${data.announcementBarEnabled ?? false},
      ${data.announcementBarText ?? null},
      ${data.announcementBarLink ?? null},
      ${data.announcementBarBgColor ?? '#000000'},
      ${data.announcementBarTextColor ?? '#FFFFFF'},
      ${JSON.stringify(data.promoBanners ?? [])},
      ${data.logoUrl ?? null},
      ${data.logoDarkUrl ?? null},
      ${data.faviconUrl ?? null},
      ${JSON.stringify(data.brandColors ?? { primary: '#000000', secondary: '#374d42' })},
      ${JSON.stringify(data.brandFonts ?? { heading: 'Inter', body: 'Inter' })},
      ${JSON.stringify(data.headerNav ?? [])},
      ${JSON.stringify(data.footerNav ?? {})},
      ${JSON.stringify(data.socialLinks ?? {})},
      ${data.defaultMetaTitle ?? null},
      ${data.defaultMetaDescription ?? null},
      ${data.ga4MeasurementId ?? null},
      ${data.fbPixelId ?? null},
      ${data.tiktokPixelId ?? null},
      ${userId}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      pricing_config = CASE WHEN ${data.pricingConfig === undefined} THEN site_config.pricing_config ELSE ${JSON.stringify(data.pricingConfig ?? {})} END,
      sale_active = COALESCE(${data.saleActive}, site_config.sale_active),
      sale_name = CASE WHEN ${data.saleName === undefined} THEN site_config.sale_name ELSE ${data.saleName} END,
      sale_start_date = CASE WHEN ${data.saleStartDate === undefined} THEN site_config.sale_start_date ELSE ${data.saleStartDate} END,
      sale_end_date = CASE WHEN ${data.saleEndDate === undefined} THEN site_config.sale_end_date ELSE ${data.saleEndDate} END,
      sale_config = CASE WHEN ${data.saleConfig === undefined} THEN site_config.sale_config ELSE ${JSON.stringify(data.saleConfig ?? {})} END,
      announcement_bar_enabled = COALESCE(${data.announcementBarEnabled}, site_config.announcement_bar_enabled),
      announcement_bar_text = CASE WHEN ${data.announcementBarText === undefined} THEN site_config.announcement_bar_text ELSE ${data.announcementBarText} END,
      announcement_bar_link = CASE WHEN ${data.announcementBarLink === undefined} THEN site_config.announcement_bar_link ELSE ${data.announcementBarLink} END,
      announcement_bar_bg_color = COALESCE(${data.announcementBarBgColor}, site_config.announcement_bar_bg_color),
      announcement_bar_text_color = COALESCE(${data.announcementBarTextColor}, site_config.announcement_bar_text_color),
      promo_banners = CASE WHEN ${data.promoBanners === undefined} THEN site_config.promo_banners ELSE ${JSON.stringify(data.promoBanners ?? [])} END,
      logo_url = CASE WHEN ${data.logoUrl === undefined} THEN site_config.logo_url ELSE ${data.logoUrl} END,
      logo_dark_url = CASE WHEN ${data.logoDarkUrl === undefined} THEN site_config.logo_dark_url ELSE ${data.logoDarkUrl} END,
      favicon_url = CASE WHEN ${data.faviconUrl === undefined} THEN site_config.favicon_url ELSE ${data.faviconUrl} END,
      brand_colors = CASE WHEN ${data.brandColors === undefined} THEN site_config.brand_colors ELSE ${JSON.stringify(data.brandColors ?? {})} END,
      brand_fonts = CASE WHEN ${data.brandFonts === undefined} THEN site_config.brand_fonts ELSE ${JSON.stringify(data.brandFonts ?? {})} END,
      header_nav = CASE WHEN ${data.headerNav === undefined} THEN site_config.header_nav ELSE ${JSON.stringify(data.headerNav ?? [])} END,
      footer_nav = CASE WHEN ${data.footerNav === undefined} THEN site_config.footer_nav ELSE ${JSON.stringify(data.footerNav ?? {})} END,
      social_links = CASE WHEN ${data.socialLinks === undefined} THEN site_config.social_links ELSE ${JSON.stringify(data.socialLinks ?? {})} END,
      default_meta_title = CASE WHEN ${data.defaultMetaTitle === undefined} THEN site_config.default_meta_title ELSE ${data.defaultMetaTitle} END,
      default_meta_description = CASE WHEN ${data.defaultMetaDescription === undefined} THEN site_config.default_meta_description ELSE ${data.defaultMetaDescription} END,
      ga4_measurement_id = CASE WHEN ${data.ga4MeasurementId === undefined} THEN site_config.ga4_measurement_id ELSE ${data.ga4MeasurementId} END,
      fb_pixel_id = CASE WHEN ${data.fbPixelId === undefined} THEN site_config.fb_pixel_id ELSE ${data.fbPixelId} END,
      tiktok_pixel_id = CASE WHEN ${data.tiktokPixelId === undefined} THEN site_config.tiktok_pixel_id ELSE ${data.tiktokPixelId} END,
      updated_by = ${userId},
      updated_at = NOW()
    RETURNING
      id,
      tenant_id as "tenantId",
      pricing_config as "pricingConfig",
      sale_active as "saleActive",
      sale_name as "saleName",
      sale_start_date as "saleStartDate",
      sale_end_date as "saleEndDate",
      sale_config as "saleConfig",
      announcement_bar_enabled as "announcementBarEnabled",
      announcement_bar_text as "announcementBarText",
      announcement_bar_link as "announcementBarLink",
      announcement_bar_bg_color as "announcementBarBgColor",
      announcement_bar_text_color as "announcementBarTextColor",
      promo_banners as "promoBanners",
      logo_url as "logoUrl",
      logo_dark_url as "logoDarkUrl",
      favicon_url as "faviconUrl",
      brand_colors as "brandColors",
      brand_fonts as "brandFonts",
      header_nav as "headerNav",
      footer_nav as "footerNav",
      social_links as "socialLinks",
      default_meta_title as "defaultMetaTitle",
      default_meta_description as "defaultMetaDescription",
      ga4_measurement_id as "ga4MeasurementId",
      fb_pixel_id as "fbPixelId",
      tiktok_pixel_id as "tiktokPixelId",
      updated_at as "updatedAt",
      updated_by as "updatedBy"
  `

  return result.rows[0] as SiteConfig
}

// ============================================================
// Audit Logging
// ============================================================

export async function logSettingsChange(
  tenantId: string,
  userId: string | null,
  settingType: SettingType,
  changes: Record<string, unknown>,
  previousValues: Record<string, unknown> | null
): Promise<void> {
  await sql`
    INSERT INTO settings_audit_log (
      tenant_id, user_id, setting_type, changes, previous_values
    ) VALUES (
      ${tenantId},
      ${userId},
      ${settingType},
      ${JSON.stringify(changes)},
      ${previousValues ? JSON.stringify(previousValues) : null}
    )
  `
}
