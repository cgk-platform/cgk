// src/app/tenant-resolution.ts
import { sql } from "@cgk-platform/db";
async function getOrganizationIdForShop(shop) {
  const result = await sql`
    SELECT organization_id
    FROM public.shopify_app_installations
    WHERE shop = ${shop}
      AND status = 'active'
    LIMIT 1
  `;
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  return row ? row.organization_id : null;
}
async function recordShopInstallation(params) {
  const scopesArrayLiteral = `{${params.scopes.join(",")}}`;
  await sql`
    INSERT INTO public.shopify_app_installations (
      shop,
      organization_id,
      scopes,
      shopify_app_id,
      primary_contact_email,
      status,
      installed_at
    ) VALUES (
      ${params.shop},
      ${params.organizationId},
      ${scopesArrayLiteral}::TEXT[],
      ${params.shopifyAppId || null},
      ${params.primaryContactEmail || null},
      'active',
      NOW()
    )
    ON CONFLICT (shop)
    DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      scopes = EXCLUDED.scopes,
      shopify_app_id = EXCLUDED.shopify_app_id,
      primary_contact_email = EXCLUDED.primary_contact_email,
      status = 'active',
      installed_at = NOW(),
      uninstalled_at = NULL,
      updated_at = NOW()
  `;
}
async function recordShopUninstallation(shop) {
  await sql`
    UPDATE public.shopify_app_installations
    SET
      status = 'uninstalled',
      uninstalled_at = NOW(),
      updated_at = NOW()
    WHERE shop = ${shop}
  `;
}
async function reactivateShopInstallation(shop) {
  await sql`
    UPDATE public.shopify_app_installations
    SET
      status = 'active',
      installed_at = NOW(),
      uninstalled_at = NULL,
      updated_at = NOW()
    WHERE shop = ${shop}
  `;
}
async function suspendShopInstallation(shop) {
  await sql`
    UPDATE public.shopify_app_installations
    SET
      status = 'suspended',
      updated_at = NOW()
    WHERE shop = ${shop}
  `;
}
async function getShopInstallation(shop) {
  const result = await sql`
    SELECT
      id,
      shop,
      organization_id as "organizationId",
      status,
      scopes,
      installed_at as "installedAt",
      uninstalled_at as "uninstalledAt"
    FROM public.shopify_app_installations
    WHERE shop = ${shop}
    LIMIT 1
  `;
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    shop: row.shop,
    organizationId: row.organizationId,
    status: row.status,
    scopes: row.scopes || [],
    installedAt: new Date(row.installedAt),
    uninstalledAt: row.uninstalledAt ? new Date(row.uninstalledAt) : null
  };
}
async function getOrganizationShops(organizationId) {
  const result = await sql`
    SELECT shop
    FROM public.shopify_app_installations
    WHERE organization_id = ${organizationId}
      AND status = 'active'
    ORDER BY installed_at DESC
  `;
  return result.rows.map((row) => row.shop);
}
async function isShopActive(shop) {
  const result = await sql`
    SELECT 1
    FROM public.shopify_app_installations
    WHERE shop = ${shop}
      AND status = 'active'
    LIMIT 1
  `;
  return result.rows.length > 0;
}
async function listAllInstallations(filters) {
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  let query = `
    SELECT
      sai.id,
      sai.shop,
      sai.organization_id as "organizationId",
      sai.status,
      sai.scopes,
      sai.installed_at as "installedAt",
      sai.uninstalled_at as "uninstalledAt",
      o.name as "organizationName",
      o.slug as "organizationSlug"
    FROM public.shopify_app_installations sai
    JOIN public.organizations o ON sai.organization_id = o.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;
  if (filters?.status) {
    query += ` AND sai.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }
  if (filters?.organizationId) {
    query += ` AND sai.organization_id = $${paramIndex}`;
    params.push(filters.organizationId);
    paramIndex++;
  }
  query += ` ORDER BY sai.installed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  const result = await sql.query(query, params);
  return result.rows.map((row) => ({
    id: row.id,
    shop: row.shop,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    status: row.status,
    scopes: row.scopes || [],
    installedAt: new Date(row.installedAt),
    uninstalledAt: row.uninstalledAt ? new Date(row.uninstalledAt) : null
  }));
}

export {
  getOrganizationIdForShop,
  recordShopInstallation,
  recordShopUninstallation,
  reactivateShopInstallation,
  suspendShopInstallation,
  getShopInstallation,
  getOrganizationShops,
  isShopActive,
  listAllInstallations
};
