/**
 * Header Wrapper (Server Component)
 *
 * Fetches navigation menu from Shopify Storefront API and passes the
 * resolved menu items to the client-side StorefrontHeader. This keeps
 * data fetching on the server while the header remains interactive.
 */

import { createStorefrontClient, getMenu } from '@cgk-platform/shopify'
import type { ShopifyMenuItem } from '@cgk-platform/shopify'

import { getTenantConfig } from '@/lib/tenant'
import { StorefrontHeader } from './StorefrontHeader'
import type { MenuItem } from './MegaMenu'
import { logger } from '@cgk-platform/logging'

interface HeaderWrapperProps {
  storeName: string
  tenantSlug: string
  theme: {
    tenantId: string
    logoUrl: string | null
    logoHeight: number
    darkModeEnabled: boolean
  }
  logoComponent?: React.ReactNode
  darkModeToggle?: React.ReactNode
}

export async function HeaderWrapper(props: HeaderWrapperProps) {
  let menuItems: MenuItem[] = []

  const config = await getTenantConfig()
  if (config?.shopify) {
    try {
      const client = createStorefrontClient({
        storeDomain: config.shopify.storeDomain,
        storefrontAccessToken: config.shopify.storefrontAccessToken,
      })

      const menu = await getMenu(client, 'new-menu')
      if (menu) {
        menuItems = menu.items.map(mapMenuItem)
      }
    } catch (error) {
      logger.error(
        'Failed to fetch navigation menu:',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  return <StorefrontHeader {...props} menuItems={menuItems} />
}

/**
 * Recursively map a ShopifyMenuItem to the simplified MenuItem shape
 * consumed by MegaMenu. Limits nesting to 3 levels (top -> child -> grandchild).
 */
function mapMenuItem(item: ShopifyMenuItem): MenuItem {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    items: item.items.map((child) => ({
      id: child.id,
      title: child.title,
      url: child.url,
      items: child.items.map((grandchild) => ({
        id: grandchild.id,
        title: grandchild.title,
        url: grandchild.url,
        items: [],
      })),
    })),
  }
}
