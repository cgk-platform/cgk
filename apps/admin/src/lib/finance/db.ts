/**
 * P&L Configuration Database Operations
 *
 * All operations use tenant context via withTenant() for proper isolation.
 */

import { sql, withTenant } from '@cgk/db'

import type {
  COGSConfig,
  COGSConfigUpdate,
  ExpenseCategory,
  ExpenseCategoryCreate,
  ExpenseCategoryUpdate,
  ExpenseType,
  PLConfigAction,
  PLConfigAuditLog,
  PLConfigAuditLogFilters,
  PLConfigType,
  PLFormulaConfig,
  PLFormulaConfigUpdate,
  ProductCOGS,
  ProductCOGSBulkUpdate,
  ProductCOGSSource,
  ProductCOGSUpdate,
  VariableCostConfig,
  VariableCostConfigUpdate,
  DEFAULT_VARIABLE_COST_CONFIG,
  DEFAULT_COGS_CONFIG,
  DEFAULT_PL_FORMULA_CONFIG,
} from './types'

// ============================================================
// Variable Cost Configuration
// ============================================================

export async function getVariableCostConfig(
  tenantSlug: string,
  tenantId: string,
): Promise<VariableCostConfig | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        primary_processor as "primaryProcessor",
        payment_percentage_rate as "paymentPercentageRate",
        payment_fixed_fee_cents as "paymentFixedFeeCents",
        additional_processors as "additionalProcessors",
        fulfillment_cost_model as "fulfillmentCostModel",
        pick_pack_fee_cents as "pickPackFeeCents",
        pick_pack_per_item_cents as "pickPackPerItemCents",
        packaging_cost_cents as "packagingCostCents",
        handling_fee_cents as "handlingFeeCents",
        weight_tiers as "weightTiers",
        shipping_tracking_method as "shippingTrackingMethod",
        shipping_estimated_percent as "shippingEstimatedPercent",
        shipping_flat_rate_cents as "shippingFlatRateCents",
        other_variable_costs as "otherVariableCosts",
        version,
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM variable_cost_config
      WHERE tenant_id = ${tenantId}
    `

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      paymentProcessing: {
        primaryProcessor: row.primaryProcessor as VariableCostConfig['paymentProcessing']['primaryProcessor'],
        percentageRate: Number(row.paymentPercentageRate),
        fixedFeeCents: Number(row.paymentFixedFeeCents),
        additionalProcessors: row.additionalProcessors as VariableCostConfig['paymentProcessing']['additionalProcessors'],
      },
      fulfillment: {
        costModel: row.fulfillmentCostModel as VariableCostConfig['fulfillment']['costModel'],
        pickPackFeeCents: Number(row.pickPackFeeCents),
        pickPackPerItemCents: Number(row.pickPackPerItemCents),
        packagingCostCents: Number(row.packagingCostCents),
        handlingFeeCents: Number(row.handlingFeeCents),
        weightTiers: row.weightTiers as VariableCostConfig['fulfillment']['weightTiers'],
      },
      shipping: {
        trackingMethod: row.shippingTrackingMethod as VariableCostConfig['shipping']['trackingMethod'],
        estimatedPercent: row.shippingEstimatedPercent ? Number(row.shippingEstimatedPercent) : undefined,
        flatRateCents: row.shippingFlatRateCents ? Number(row.shippingFlatRateCents) : undefined,
      },
      otherVariableCosts: row.otherVariableCosts as VariableCostConfig['otherVariableCosts'],
      version: Number(row.version),
      updatedAt: String(row.updatedAt),
      updatedBy: row.updatedBy as string | null,
    }
  })
}

export async function upsertVariableCostConfig(
  tenantSlug: string,
  tenantId: string,
  data: VariableCostConfigUpdate,
  userId: string,
): Promise<VariableCostConfig> {
  return withTenant(tenantSlug, async () => {
    const pp = { ...DEFAULT_VARIABLE_COST_CONFIG.paymentProcessing, ...data.paymentProcessing }
    const ff = { ...DEFAULT_VARIABLE_COST_CONFIG.fulfillment, ...data.fulfillment }
    const sh = { ...DEFAULT_VARIABLE_COST_CONFIG.shipping, ...data.shipping }
    const ov = data.otherVariableCosts ?? DEFAULT_VARIABLE_COST_CONFIG.otherVariableCosts

    const result = await sql`
      INSERT INTO variable_cost_config (
        tenant_id,
        primary_processor,
        payment_percentage_rate,
        payment_fixed_fee_cents,
        additional_processors,
        fulfillment_cost_model,
        pick_pack_fee_cents,
        pick_pack_per_item_cents,
        packaging_cost_cents,
        handling_fee_cents,
        weight_tiers,
        shipping_tracking_method,
        shipping_estimated_percent,
        shipping_flat_rate_cents,
        other_variable_costs,
        updated_by
      ) VALUES (
        ${tenantId},
        ${pp.primaryProcessor},
        ${pp.percentageRate},
        ${pp.fixedFeeCents},
        ${JSON.stringify(pp.additionalProcessors)},
        ${ff.costModel},
        ${ff.pickPackFeeCents},
        ${ff.pickPackPerItemCents},
        ${ff.packagingCostCents},
        ${ff.handlingFeeCents},
        ${JSON.stringify(ff.weightTiers)},
        ${sh.trackingMethod},
        ${sh.estimatedPercent ?? null},
        ${sh.flatRateCents ?? null},
        ${JSON.stringify(ov)},
        ${userId}
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        primary_processor = EXCLUDED.primary_processor,
        payment_percentage_rate = EXCLUDED.payment_percentage_rate,
        payment_fixed_fee_cents = EXCLUDED.payment_fixed_fee_cents,
        additional_processors = EXCLUDED.additional_processors,
        fulfillment_cost_model = EXCLUDED.fulfillment_cost_model,
        pick_pack_fee_cents = EXCLUDED.pick_pack_fee_cents,
        pick_pack_per_item_cents = EXCLUDED.pick_pack_per_item_cents,
        packaging_cost_cents = EXCLUDED.packaging_cost_cents,
        handling_fee_cents = EXCLUDED.handling_fee_cents,
        weight_tiers = EXCLUDED.weight_tiers,
        shipping_tracking_method = EXCLUDED.shipping_tracking_method,
        shipping_estimated_percent = EXCLUDED.shipping_estimated_percent,
        shipping_flat_rate_cents = EXCLUDED.shipping_flat_rate_cents,
        other_variable_costs = EXCLUDED.other_variable_costs,
        version = variable_cost_config.version + 1,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING
        id,
        tenant_id as "tenantId",
        primary_processor as "primaryProcessor",
        payment_percentage_rate as "paymentPercentageRate",
        payment_fixed_fee_cents as "paymentFixedFeeCents",
        additional_processors as "additionalProcessors",
        fulfillment_cost_model as "fulfillmentCostModel",
        pick_pack_fee_cents as "pickPackFeeCents",
        pick_pack_per_item_cents as "pickPackPerItemCents",
        packaging_cost_cents as "packagingCostCents",
        handling_fee_cents as "handlingFeeCents",
        weight_tiers as "weightTiers",
        shipping_tracking_method as "shippingTrackingMethod",
        shipping_estimated_percent as "shippingEstimatedPercent",
        shipping_flat_rate_cents as "shippingFlatRateCents",
        other_variable_costs as "otherVariableCosts",
        version,
        updated_at as "updatedAt",
        updated_by as "updatedBy"
    `

    const row = result.rows[0]
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      paymentProcessing: {
        primaryProcessor: row.primaryProcessor as VariableCostConfig['paymentProcessing']['primaryProcessor'],
        percentageRate: Number(row.paymentPercentageRate),
        fixedFeeCents: Number(row.paymentFixedFeeCents),
        additionalProcessors: row.additionalProcessors as VariableCostConfig['paymentProcessing']['additionalProcessors'],
      },
      fulfillment: {
        costModel: row.fulfillmentCostModel as VariableCostConfig['fulfillment']['costModel'],
        pickPackFeeCents: Number(row.pickPackFeeCents),
        pickPackPerItemCents: Number(row.pickPackPerItemCents),
        packagingCostCents: Number(row.packagingCostCents),
        handlingFeeCents: Number(row.handlingFeeCents),
        weightTiers: row.weightTiers as VariableCostConfig['fulfillment']['weightTiers'],
      },
      shipping: {
        trackingMethod: row.shippingTrackingMethod as VariableCostConfig['shipping']['trackingMethod'],
        estimatedPercent: row.shippingEstimatedPercent ? Number(row.shippingEstimatedPercent) : undefined,
        flatRateCents: row.shippingFlatRateCents ? Number(row.shippingFlatRateCents) : undefined,
      },
      otherVariableCosts: row.otherVariableCosts as VariableCostConfig['otherVariableCosts'],
      version: Number(row.version),
      updatedAt: String(row.updatedAt),
      updatedBy: row.updatedBy as string | null,
    }
  })
}

export async function resetVariableCostConfig(
  tenantSlug: string,
  tenantId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM variable_cost_config
      WHERE tenant_id = ${tenantId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

// ============================================================
// COGS Configuration
// ============================================================

export async function getCOGSConfig(
  tenantSlug: string,
  tenantId: string,
): Promise<COGSConfig | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        cogs_source as "source",
        shopify_sync_enabled as "shopifySyncEnabled",
        shopify_sync_frequency as "shopifySyncFrequency",
        shopify_cost_field as "shopifyCostField",
        shopify_last_sync_at as "shopifyLastSyncAt",
        fallback_behavior as "fallbackBehavior",
        fallback_percent as "fallbackPercent",
        fallback_default_cogs_cents as "fallbackDefaultCogsCents",
        last_import_at as "lastImportAt",
        import_source as "importSource",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM cogs_config
      WHERE tenant_id = ${tenantId}
    `

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      source: row.source as COGSConfig['source'],
      shopifySyncEnabled: Boolean(row.shopifySyncEnabled),
      shopifySyncFrequency: row.shopifySyncFrequency as COGSConfig['shopifySyncFrequency'],
      shopifyCostField: row.shopifyCostField as string,
      shopifyLastSyncAt: row.shopifyLastSyncAt ? String(row.shopifyLastSyncAt) : null,
      fallbackBehavior: row.fallbackBehavior as COGSConfig['fallbackBehavior'],
      fallbackPercent: row.fallbackPercent ? Number(row.fallbackPercent) : undefined,
      fallbackDefaultCogsCents: row.fallbackDefaultCogsCents ? Number(row.fallbackDefaultCogsCents) : undefined,
      lastImportAt: row.lastImportAt ? String(row.lastImportAt) : null,
      importSource: row.importSource as COGSConfig['importSource'],
      updatedAt: String(row.updatedAt),
      updatedBy: row.updatedBy as string | null,
    }
  })
}

export async function upsertCOGSConfig(
  tenantSlug: string,
  tenantId: string,
  data: COGSConfigUpdate,
  userId: string,
): Promise<COGSConfig> {
  return withTenant(tenantSlug, async () => {
    const defaults = DEFAULT_COGS_CONFIG

    const result = await sql`
      INSERT INTO cogs_config (
        tenant_id,
        cogs_source,
        shopify_sync_enabled,
        shopify_sync_frequency,
        shopify_cost_field,
        fallback_behavior,
        fallback_percent,
        fallback_default_cogs_cents,
        updated_by
      ) VALUES (
        ${tenantId},
        ${data.source ?? defaults.source},
        ${data.shopifySyncEnabled ?? defaults.shopifySyncEnabled},
        ${data.shopifySyncFrequency ?? defaults.shopifySyncFrequency},
        ${data.shopifyCostField ?? defaults.shopifyCostField},
        ${data.fallbackBehavior ?? defaults.fallbackBehavior},
        ${data.fallbackPercent ?? null},
        ${data.fallbackDefaultCogsCents ?? null},
        ${userId}
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        cogs_source = COALESCE(${data.source}, cogs_config.cogs_source),
        shopify_sync_enabled = COALESCE(${data.shopifySyncEnabled}, cogs_config.shopify_sync_enabled),
        shopify_sync_frequency = COALESCE(${data.shopifySyncFrequency}, cogs_config.shopify_sync_frequency),
        shopify_cost_field = COALESCE(${data.shopifyCostField}, cogs_config.shopify_cost_field),
        fallback_behavior = COALESCE(${data.fallbackBehavior}, cogs_config.fallback_behavior),
        fallback_percent = CASE WHEN ${data.fallbackPercent === undefined} THEN cogs_config.fallback_percent ELSE ${data.fallbackPercent ?? null} END,
        fallback_default_cogs_cents = CASE WHEN ${data.fallbackDefaultCogsCents === undefined} THEN cogs_config.fallback_default_cogs_cents ELSE ${data.fallbackDefaultCogsCents ?? null} END,
        updated_by = ${userId},
        updated_at = NOW()
      RETURNING
        id,
        tenant_id as "tenantId",
        cogs_source as "source",
        shopify_sync_enabled as "shopifySyncEnabled",
        shopify_sync_frequency as "shopifySyncFrequency",
        shopify_cost_field as "shopifyCostField",
        shopify_last_sync_at as "shopifyLastSyncAt",
        fallback_behavior as "fallbackBehavior",
        fallback_percent as "fallbackPercent",
        fallback_default_cogs_cents as "fallbackDefaultCogsCents",
        last_import_at as "lastImportAt",
        import_source as "importSource",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
    `

    const row = result.rows[0]
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      source: row.source as COGSConfig['source'],
      shopifySyncEnabled: Boolean(row.shopifySyncEnabled),
      shopifySyncFrequency: row.shopifySyncFrequency as COGSConfig['shopifySyncFrequency'],
      shopifyCostField: row.shopifyCostField as string,
      shopifyLastSyncAt: row.shopifyLastSyncAt ? String(row.shopifyLastSyncAt) : null,
      fallbackBehavior: row.fallbackBehavior as COGSConfig['fallbackBehavior'],
      fallbackPercent: row.fallbackPercent ? Number(row.fallbackPercent) : undefined,
      fallbackDefaultCogsCents: row.fallbackDefaultCogsCents ? Number(row.fallbackDefaultCogsCents) : undefined,
      lastImportAt: row.lastImportAt ? String(row.lastImportAt) : null,
      importSource: row.importSource as COGSConfig['importSource'],
      updatedAt: String(row.updatedAt),
      updatedBy: row.updatedBy as string | null,
    }
  })
}

export async function updateCOGSLastSync(
  tenantSlug: string,
  tenantId: string,
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE cogs_config
      SET shopify_last_sync_at = NOW()
      WHERE tenant_id = ${tenantId}
    `
  })
}

// ============================================================
// Product COGS
// ============================================================

export async function getProductCOGS(
  tenantSlug: string,
  tenantId: string,
  filters: {
    page?: number
    limit?: number
    search?: string
    productId?: string
  } = {},
): Promise<{ rows: ProductCOGS[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 50
    const offset = (page - 1) * limit

    let whereClause = 'WHERE tenant_id = $1'
    const values: unknown[] = [tenantId]
    let paramIndex = 1

    if (filters.search) {
      paramIndex++
      whereClause += ` AND (sku ILIKE $${paramIndex} OR product_id ILIKE $${paramIndex})`
      values.push(`%${filters.search}%`)
    }

    if (filters.productId) {
      paramIndex++
      whereClause += ` AND product_id = $${paramIndex}`
      values.push(filters.productId)
    }

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    const dataResult = await sql.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        product_id as "productId",
        variant_id as "variantId",
        sku,
        cogs_cents as "cogsCents",
        source,
        created_at as "createdAt",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM product_cogs
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM product_cogs ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as ProductCOGS[],
      totalCount: Number(countResult.rows[0]?.count ?? 0),
    }
  })
}

export async function getProductCOGSById(
  tenantSlug: string,
  tenantId: string,
  productId: string,
  variantId?: string,
): Promise<ProductCOGS | null> {
  return withTenant(tenantSlug, async () => {
    const result = variantId
      ? await sql`
          SELECT
            id,
            tenant_id as "tenantId",
            product_id as "productId",
            variant_id as "variantId",
            sku,
            cogs_cents as "cogsCents",
            source,
            created_at as "createdAt",
            updated_at as "updatedAt",
            updated_by as "updatedBy"
          FROM product_cogs
          WHERE tenant_id = ${tenantId}
            AND product_id = ${productId}
            AND variant_id = ${variantId}
        `
      : await sql`
          SELECT
            id,
            tenant_id as "tenantId",
            product_id as "productId",
            variant_id as "variantId",
            sku,
            cogs_cents as "cogsCents",
            source,
            created_at as "createdAt",
            updated_at as "updatedAt",
            updated_by as "updatedBy"
          FROM product_cogs
          WHERE tenant_id = ${tenantId}
            AND product_id = ${productId}
            AND variant_id IS NULL
        `

    return (result.rows[0] as ProductCOGS) || null
  })
}

export async function upsertProductCOGS(
  tenantSlug: string,
  tenantId: string,
  productId: string,
  variantId: string | null,
  sku: string | null,
  data: ProductCOGSUpdate,
  userId: string,
): Promise<ProductCOGS> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO product_cogs (
        tenant_id,
        product_id,
        variant_id,
        sku,
        cogs_cents,
        source,
        updated_by
      ) VALUES (
        ${tenantId},
        ${productId},
        ${variantId},
        ${sku},
        ${data.cogsCents},
        ${data.source ?? 'manual'},
        ${userId}
      )
      ON CONFLICT (tenant_id, product_id, COALESCE(variant_id, ''::TEXT)) DO UPDATE SET
        cogs_cents = EXCLUDED.cogs_cents,
        source = EXCLUDED.source,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING
        id,
        tenant_id as "tenantId",
        product_id as "productId",
        variant_id as "variantId",
        sku,
        cogs_cents as "cogsCents",
        source,
        created_at as "createdAt",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
    `

    return result.rows[0] as ProductCOGS
  })
}

export async function bulkUpsertProductCOGS(
  tenantSlug: string,
  tenantId: string,
  data: ProductCOGSBulkUpdate,
  userId: string,
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const source: ProductCOGSSource = data.source ?? 'manual'
    let affected = 0

    for (const item of data.products) {
      await sql`
        INSERT INTO product_cogs (
          tenant_id,
          product_id,
          variant_id,
          cogs_cents,
          source,
          updated_by
        ) VALUES (
          ${tenantId},
          ${item.productId},
          ${item.variantId ?? null},
          ${item.cogsCents},
          ${source},
          ${userId}
        )
        ON CONFLICT (tenant_id, product_id, COALESCE(variant_id, ''::TEXT)) DO UPDATE SET
          cogs_cents = EXCLUDED.cogs_cents,
          source = EXCLUDED.source,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `
      affected++
    }

    return affected
  })
}

export async function deleteProductCOGS(
  tenantSlug: string,
  tenantId: string,
  productId: string,
  variantId?: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = variantId
      ? await sql`
          DELETE FROM product_cogs
          WHERE tenant_id = ${tenantId}
            AND product_id = ${productId}
            AND variant_id = ${variantId}
          RETURNING id
        `
      : await sql`
          DELETE FROM product_cogs
          WHERE tenant_id = ${tenantId}
            AND product_id = ${productId}
            AND variant_id IS NULL
          RETURNING id
        `

    return (result.rowCount ?? 0) > 0
  })
}

// ============================================================
// P&L Formula Configuration
// ============================================================

export async function getPLFormulaConfig(
  tenantSlug: string,
  tenantId: string,
): Promise<PLFormulaConfig | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        tenant_id as "tenantId",
        revenue_include_shipping as "revenueIncludeShipping",
        revenue_include_tax as "revenueIncludeTax",
        revenue_show_gross_sales as "revenueShowGrossSales",
        revenue_show_discounts as "revenueShowDiscounts",
        revenue_show_returns as "revenueShowReturns",
        cogs_label as "cogsLabel",
        cogs_include_free_samples as "cogsIncludeFreeSamples",
        cogs_show_as_percentage as "cogsShowAsPercentage",
        variable_costs_label as "variableCostsLabel",
        variable_show_payment_processing as "variableShowPaymentProcessing",
        variable_show_fulfillment as "variableShowFulfillment",
        variable_show_packaging as "variableShowPackaging",
        variable_show_shipping as "variableShowShipping",
        variable_group_fulfillment as "variableGroupFulfillment",
        variable_custom_cost_visibility as "variableCustomCostVisibility",
        contribution_margin_label as "contributionMarginLabel",
        contribution_show_as_percentage as "contributionShowAsPercentage",
        contribution_highlight_negative as "contributionHighlightNegative",
        marketing_label as "marketingLabel",
        marketing_show_ad_spend_by_platform as "marketingShowAdSpendByPlatform",
        marketing_show_creator_payouts as "marketingShowCreatorPayouts",
        marketing_show_influencer_fees as "marketingShowInfluencerFees",
        marketing_combine_ad_spend_and_payouts as "marketingCombineAdSpendAndPayouts",
        operating_expenses_label as "operatingExpensesLabel",
        operating_show_by_category as "operatingShowByCategory",
        operating_include_vendor_payouts as "operatingIncludeVendorPayouts",
        operating_include_contractor_payouts as "operatingIncludeContractorPayouts",
        operating_categories_order as "operatingCategoriesOrder",
        show_operating_income as "showOperatingIncome",
        show_other_income_expense as "showOtherIncomeExpense",
        net_profit_label as "netProfitLabel",
        updated_at as "updatedAt",
        updated_by as "updatedBy"
      FROM pl_formula_config
      WHERE tenant_id = ${tenantId}
    `

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      revenue: {
        includeShippingRevenue: Boolean(row.revenueIncludeShipping),
        includeTaxCollected: Boolean(row.revenueIncludeTax),
        showGrossSales: Boolean(row.revenueShowGrossSales),
        showDiscounts: Boolean(row.revenueShowDiscounts),
        showReturns: Boolean(row.revenueShowReturns),
      },
      cogs: {
        label: row.cogsLabel as string,
        includeFreeSamples: Boolean(row.cogsIncludeFreeSamples),
        showAsPercentage: Boolean(row.cogsShowAsPercentage),
      },
      variableCosts: {
        label: row.variableCostsLabel as string,
        showPaymentProcessing: Boolean(row.variableShowPaymentProcessing),
        showFulfillment: Boolean(row.variableShowFulfillment),
        showPackaging: Boolean(row.variableShowPackaging),
        showShipping: Boolean(row.variableShowShipping),
        customCostVisibility: row.variableCustomCostVisibility as Record<string, boolean>,
        groupFulfillmentCosts: Boolean(row.variableGroupFulfillment),
      },
      contributionMargin: {
        label: row.contributionMarginLabel as string,
        showAsPercentage: Boolean(row.contributionShowAsPercentage),
        highlightNegative: Boolean(row.contributionHighlightNegative),
      },
      marketing: {
        label: row.marketingLabel as string,
        showAdSpendByPlatform: Boolean(row.marketingShowAdSpendByPlatform),
        showCreatorPayouts: Boolean(row.marketingShowCreatorPayouts),
        showInfluencerFees: Boolean(row.marketingShowInfluencerFees),
        combineAdSpendAndPayouts: Boolean(row.marketingCombineAdSpendAndPayouts),
      },
      operatingExpenses: {
        label: row.operatingExpensesLabel as string,
        showByCategory: Boolean(row.operatingShowByCategory),
        includeVendorPayouts: Boolean(row.operatingIncludeVendorPayouts),
        includeContractorPayouts: Boolean(row.operatingIncludeContractorPayouts),
        categoriesOrder: row.operatingCategoriesOrder as string[],
      },
      showOperatingIncome: Boolean(row.showOperatingIncome),
      showOtherIncomeExpense: Boolean(row.showOtherIncomeExpense),
      netProfitLabel: row.netProfitLabel as string,
      updatedAt: String(row.updatedAt),
      updatedBy: row.updatedBy as string | null,
    }
  })
}

export async function upsertPLFormulaConfig(
  tenantSlug: string,
  tenantId: string,
  data: PLFormulaConfigUpdate,
  userId: string,
): Promise<PLFormulaConfig> {
  return withTenant(tenantSlug, async () => {
    const d = DEFAULT_PL_FORMULA_CONFIG
    const rev = { ...d.revenue, ...data.revenue }
    const cogs = { ...d.cogs, ...data.cogs }
    const vc = { ...d.variableCosts, ...data.variableCosts }
    const cm = { ...d.contributionMargin, ...data.contributionMargin }
    const mkt = { ...d.marketing, ...data.marketing }
    const opex = { ...d.operatingExpenses, ...data.operatingExpenses }

    const result = await sql`
      INSERT INTO pl_formula_config (
        tenant_id,
        revenue_include_shipping,
        revenue_include_tax,
        revenue_show_gross_sales,
        revenue_show_discounts,
        revenue_show_returns,
        cogs_label,
        cogs_include_free_samples,
        cogs_show_as_percentage,
        variable_costs_label,
        variable_show_payment_processing,
        variable_show_fulfillment,
        variable_show_packaging,
        variable_show_shipping,
        variable_group_fulfillment,
        variable_custom_cost_visibility,
        contribution_margin_label,
        contribution_show_as_percentage,
        contribution_highlight_negative,
        marketing_label,
        marketing_show_ad_spend_by_platform,
        marketing_show_creator_payouts,
        marketing_show_influencer_fees,
        marketing_combine_ad_spend_and_payouts,
        operating_expenses_label,
        operating_show_by_category,
        operating_include_vendor_payouts,
        operating_include_contractor_payouts,
        operating_categories_order,
        show_operating_income,
        show_other_income_expense,
        net_profit_label,
        updated_by
      ) VALUES (
        ${tenantId},
        ${rev.includeShippingRevenue},
        ${rev.includeTaxCollected},
        ${rev.showGrossSales},
        ${rev.showDiscounts},
        ${rev.showReturns},
        ${cogs.label},
        ${cogs.includeFreeSamples},
        ${cogs.showAsPercentage},
        ${vc.label},
        ${vc.showPaymentProcessing},
        ${vc.showFulfillment},
        ${vc.showPackaging},
        ${vc.showShipping},
        ${vc.groupFulfillmentCosts},
        ${JSON.stringify(vc.customCostVisibility)},
        ${cm.label},
        ${cm.showAsPercentage},
        ${cm.highlightNegative},
        ${mkt.label},
        ${mkt.showAdSpendByPlatform},
        ${mkt.showCreatorPayouts},
        ${mkt.showInfluencerFees},
        ${mkt.combineAdSpendAndPayouts},
        ${opex.label},
        ${opex.showByCategory},
        ${opex.includeVendorPayouts},
        ${opex.includeContractorPayouts},
        ${JSON.stringify(opex.categoriesOrder)},
        ${data.showOperatingIncome ?? d.showOperatingIncome},
        ${data.showOtherIncomeExpense ?? d.showOtherIncomeExpense},
        ${data.netProfitLabel ?? d.netProfitLabel},
        ${userId}
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        revenue_include_shipping = EXCLUDED.revenue_include_shipping,
        revenue_include_tax = EXCLUDED.revenue_include_tax,
        revenue_show_gross_sales = EXCLUDED.revenue_show_gross_sales,
        revenue_show_discounts = EXCLUDED.revenue_show_discounts,
        revenue_show_returns = EXCLUDED.revenue_show_returns,
        cogs_label = EXCLUDED.cogs_label,
        cogs_include_free_samples = EXCLUDED.cogs_include_free_samples,
        cogs_show_as_percentage = EXCLUDED.cogs_show_as_percentage,
        variable_costs_label = EXCLUDED.variable_costs_label,
        variable_show_payment_processing = EXCLUDED.variable_show_payment_processing,
        variable_show_fulfillment = EXCLUDED.variable_show_fulfillment,
        variable_show_packaging = EXCLUDED.variable_show_packaging,
        variable_show_shipping = EXCLUDED.variable_show_shipping,
        variable_group_fulfillment = EXCLUDED.variable_group_fulfillment,
        variable_custom_cost_visibility = EXCLUDED.variable_custom_cost_visibility,
        contribution_margin_label = EXCLUDED.contribution_margin_label,
        contribution_show_as_percentage = EXCLUDED.contribution_show_as_percentage,
        contribution_highlight_negative = EXCLUDED.contribution_highlight_negative,
        marketing_label = EXCLUDED.marketing_label,
        marketing_show_ad_spend_by_platform = EXCLUDED.marketing_show_ad_spend_by_platform,
        marketing_show_creator_payouts = EXCLUDED.marketing_show_creator_payouts,
        marketing_show_influencer_fees = EXCLUDED.marketing_show_influencer_fees,
        marketing_combine_ad_spend_and_payouts = EXCLUDED.marketing_combine_ad_spend_and_payouts,
        operating_expenses_label = EXCLUDED.operating_expenses_label,
        operating_show_by_category = EXCLUDED.operating_show_by_category,
        operating_include_vendor_payouts = EXCLUDED.operating_include_vendor_payouts,
        operating_include_contractor_payouts = EXCLUDED.operating_include_contractor_payouts,
        operating_categories_order = EXCLUDED.operating_categories_order,
        show_operating_income = EXCLUDED.show_operating_income,
        show_other_income_expense = EXCLUDED.show_other_income_expense,
        net_profit_label = EXCLUDED.net_profit_label,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `

    // Re-fetch to get proper structure
    const config = await getPLFormulaConfig(tenantSlug, tenantId)
    return config!
  })
}

export async function resetPLFormulaConfig(
  tenantSlug: string,
  tenantId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM pl_formula_config
      WHERE tenant_id = ${tenantId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

// ============================================================
// Expense Categories
// ============================================================

export async function getExpenseCategories(
  tenantSlug: string,
  tenantId: string,
  filters: { expenseType?: ExpenseType; activeOnly?: boolean } = {},
): Promise<ExpenseCategory[]> {
  return withTenant(tenantSlug, async () => {
    let query = `
      SELECT
        id,
        tenant_id as "tenantId",
        category_id as "categoryId",
        name,
        expense_type as "expenseType",
        is_system as "isSystem",
        is_active as "isActive",
        display_order as "displayOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM expense_categories
      WHERE tenant_id = $1
    `
    const values: unknown[] = [tenantId]
    let paramIndex = 1

    if (filters.expenseType) {
      paramIndex++
      query += ` AND expense_type = $${paramIndex}::expense_type`
      values.push(filters.expenseType)
    }

    if (filters.activeOnly) {
      query += ' AND is_active = true'
    }

    query += ' ORDER BY display_order ASC, name ASC'

    const result = await sql.query(query, values)
    return result.rows as ExpenseCategory[]
  })
}

export async function createExpenseCategory(
  tenantSlug: string,
  tenantId: string,
  data: ExpenseCategoryCreate,
): Promise<ExpenseCategory> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO expense_categories (
        tenant_id,
        category_id,
        name,
        expense_type,
        is_system,
        display_order
      ) VALUES (
        ${tenantId},
        ${data.categoryId},
        ${data.name},
        ${data.expenseType}::expense_type,
        false,
        ${data.displayOrder ?? 50}
      )
      RETURNING
        id,
        tenant_id as "tenantId",
        category_id as "categoryId",
        name,
        expense_type as "expenseType",
        is_system as "isSystem",
        is_active as "isActive",
        display_order as "displayOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    return result.rows[0] as ExpenseCategory
  })
}

export async function updateExpenseCategory(
  tenantSlug: string,
  tenantId: string,
  categoryId: string,
  data: ExpenseCategoryUpdate,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (data.name !== undefined) {
      paramIndex++
      setClauses.push(`name = $${paramIndex}`)
      values.push(data.name)
    }

    if (data.expenseType !== undefined) {
      paramIndex++
      setClauses.push(`expense_type = $${paramIndex}::expense_type`)
      values.push(data.expenseType)
    }

    if (data.isActive !== undefined) {
      paramIndex++
      setClauses.push(`is_active = $${paramIndex}`)
      values.push(data.isActive)
    }

    if (data.displayOrder !== undefined) {
      paramIndex++
      setClauses.push(`display_order = $${paramIndex}`)
      values.push(data.displayOrder)
    }

    paramIndex++
    values.push(tenantId)
    paramIndex++
    values.push(categoryId)

    const result = await sql.query(
      `UPDATE expense_categories
       SET ${setClauses.join(', ')}
       WHERE tenant_id = $${paramIndex - 1} AND category_id = $${paramIndex}
       RETURNING id`,
      values,
    )

    return (result.rowCount ?? 0) > 0
  })
}

export async function deleteExpenseCategory(
  tenantSlug: string,
  tenantId: string,
  categoryId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    // Only allow deleting non-system categories
    const result = await sql`
      DELETE FROM expense_categories
      WHERE tenant_id = ${tenantId}
        AND category_id = ${categoryId}
        AND is_system = false
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function reorderExpenseCategories(
  tenantSlug: string,
  tenantId: string,
  categoryOrders: Array<{ categoryId: string; displayOrder: number }>,
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    for (const item of categoryOrders) {
      await sql`
        UPDATE expense_categories
        SET display_order = ${item.displayOrder}, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND category_id = ${item.categoryId}
      `
    }
  })
}

export async function seedDefaultExpenseCategories(
  tenantSlug: string,
  tenantId: string,
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`SELECT seed_default_expense_categories(${tenantId})`
  })
}

// ============================================================
// Audit Log
// ============================================================

export async function logPLConfigChange(
  tenantSlug: string,
  tenantId: string,
  configType: PLConfigType,
  action: PLConfigAction,
  changedBy: string,
  options: {
    fieldChanged?: string
    oldValue?: unknown
    newValue?: unknown
    ipAddress?: string
    userAgent?: string
  } = {},
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO pl_config_audit_log (
        tenant_id,
        config_type,
        action,
        field_changed,
        old_value,
        new_value,
        changed_by,
        ip_address,
        user_agent
      ) VALUES (
        ${tenantId},
        ${configType},
        ${action},
        ${options.fieldChanged ?? null},
        ${options.oldValue ? JSON.stringify(options.oldValue) : null},
        ${options.newValue ? JSON.stringify(options.newValue) : null},
        ${changedBy},
        ${options.ipAddress ?? null},
        ${options.userAgent ?? null}
      )
    `
  })
}

export async function getPLConfigAuditLog(
  tenantSlug: string,
  tenantId: string,
  filters: PLConfigAuditLogFilters = {},
): Promise<{ rows: PLConfigAuditLog[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 50
    const offset = (page - 1) * limit

    let whereClause = 'WHERE tenant_id = $1'
    const values: unknown[] = [tenantId]
    let paramIndex = 1

    if (filters.configType) {
      paramIndex++
      whereClause += ` AND config_type = $${paramIndex}`
      values.push(filters.configType)
    }

    if (filters.startDate) {
      paramIndex++
      whereClause += ` AND changed_at >= $${paramIndex}::timestamptz`
      values.push(filters.startDate)
    }

    if (filters.endDate) {
      paramIndex++
      whereClause += ` AND changed_at <= $${paramIndex}::timestamptz`
      values.push(filters.endDate)
    }

    if (filters.changedBy) {
      paramIndex++
      whereClause += ` AND changed_by = $${paramIndex}`
      values.push(filters.changedBy)
    }

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    const dataResult = await sql.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        config_type as "configType",
        action,
        field_changed as "fieldChanged",
        old_value as "oldValue",
        new_value as "newValue",
        changed_by as "changedBy",
        changed_at as "changedAt",
        ip_address as "ipAddress",
        user_agent as "userAgent"
      FROM pl_config_audit_log
      ${whereClause}
      ORDER BY changed_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM pl_config_audit_log ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as PLConfigAuditLog[],
      totalCount: Number(countResult.rows[0]?.count ?? 0),
    }
  })
}
