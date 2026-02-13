# PHASE-2O: Commerce - Google Feed Complete System

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Duration**: 0.5 weeks (after PHASE-2B)
**Depends On**: PHASE-2B-ADMIN-COMMERCE (product data)
**Parallel With**: Other PHASE-2O commerce phases

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Google Feed contains product catalog data - tenant-scoped.
- ALL feed queries use `withTenant(tenantId, ...)`
- Feed URLs are unique per tenant
- Merchant Center credentials stored per-tenant
- Product data never crosses tenant boundaries

---

## Goal

Document and specify the complete Google Merchant Center feed management system including all 6 sub-pages: overview, images, preview, products list, product detail, and settings.

---

## Success Criteria

- [x] All 6 Google Feed admin pages fully specified
- [x] Feed generation with proper product data
- [x] Image feed for Shopping campaigns
- [x] Feed validation and error handling
- [x] Merchant Center integration
- [x] Per-product customization support

---

## Complete Page Specifications

### 1. `/admin/google-feed` - Feed Overview

**Purpose**: Dashboard for Google Merchant Center feed health

**Dashboard Sections**:

1. **Feed Status**:
   - Last sync timestamp
   - Next scheduled sync
   - Sync status (success, warning, error)
   - Feed URL (copyable)

2. **Product Coverage**:
   - Total products in Shopify
   - Products in feed
   - Products excluded (with reasons)
   - Products with warnings

3. **Feed Health**:
   - Approval rate
   - Disapproved products count
   - Pending review count
   - Warnings count

4. **Error Summary**:
   - Top errors by count
   - Link to error details
   - Quick fixes available

5. **Performance Metrics** (if connected):
   - Impressions
   - Clicks
   - CTR
   - Top performing products

**Quick Actions**:
- Force sync now
- Download feed file
- View in Merchant Center

---

### 2. `/admin/google-feed/images` - Image Feed

**Purpose**: Manage product images for Google Shopping

**Features**:

1. **Image Requirements Display**:
   - Minimum dimensions (100x100 for non-apparel, 250x250 for apparel)
   - Maximum file size
   - Supported formats (JPEG, PNG, GIF, BMP, TIFF)
   - White background recommendation

2. **Image Status Grid**:
   - Product thumbnail
   - Image dimensions
   - Status (approved, warning, disapproved)
   - Issue if any

3. **Bulk Actions**:
   - Regenerate thumbnails
   - Remove background (AI)
   - Replace images
   - Set as primary

4. **Image Optimization**:
   - Auto-optimize on upload
   - Compression settings
   - Format conversion

**Filters**:
- Status (all, approved, issues)
- Product category
- Missing images only

---

### 3. `/admin/google-feed/preview` - Feed Preview

**Purpose**: Preview feed XML/JSON before submission

**Features**:

1. **Format Toggle**:
   - XML view
   - JSON view
   - Table view (parsed)

2. **Sample Products**:
   - First N products (configurable)
   - Random sample
   - Specific product search

3. **Field Validation**:
   - Required fields highlighted
   - Missing data warnings
   - Format errors

4. **Download Options**:
   - Download full feed
   - Download sample
   - Copy to clipboard

5. **Diff View**:
   - Compare with last published
   - Show changes

---

### 4. `/admin/google-feed/products` - Product List

**Purpose**: View and manage all products in the feed

**DataTable Columns**:
- Thumbnail
- Product Title
- SKU/ID
- Price
- Availability
- Feed Status (included, excluded, error)
- Last Updated
- Actions

**Filters**:
- Feed status (included, excluded, errors only)
- Product type
- Availability
- Price range
- Search

**Bulk Actions**:
- Include in feed
- Exclude from feed
- Refresh data
- Set category

**Per Product Actions**:
- View details
- Edit feed data
- Exclude/Include
- Force refresh

---

### 5. `/admin/google-feed/products/[handle]` - Product Detail

**Purpose**: View and customize feed data for a specific product

**Sections**:

1. **Product Info**:
   - Title (Shopify)
   - Feed title (can override)
   - Description (Shopify)
   - Feed description (can override)

2. **Identifiers**:
   - GTIN/UPC/EAN
   - MPN
   - Brand
   - Item group ID (for variants)

3. **Categorization**:
   - Google product category (dropdown/search)
   - Product type (custom)
   - Custom labels 0-4

4. **Pricing**:
   - Regular price
   - Sale price
   - Sale price effective date
   - Unit pricing

5. **Availability**:
   - Availability status
   - Quantity in stock
   - Pre-order info

6. **Shipping**:
   - Weight
   - Dimensions
   - Shipping label

7. **Images**:
   - Primary image
   - Additional images (up to 10)
   - Image link URLs

8. **Feed Status**:
   - Current status in Merchant Center
   - Issues/warnings
   - Last synced

**Actions**:
- Save changes
- Revert to Shopify data
- Force sync
- Exclude from feed

---

### 6. `/admin/google-feed/settings` - Feed Settings

**Purpose**: Configure Google Merchant Center integration and feed behavior

**Sections**:

1. **Merchant Center Connection**:
   - Account ID
   - API credentials
   - Connection status
   - Test connection button

2. **Feed Configuration**:
   - Feed name
   - Feed URL
   - Update frequency (hourly, daily, weekly)
   - Feed format (XML, TSV)
   - Target country
   - Language

3. **Product Defaults**:
   - Default brand (if not set on product)
   - Default shipping label
   - Default availability
   - Default condition

4. **Exclusion Rules**:
   - Exclude by tag
   - Exclude by vendor
   - Exclude by collection
   - Exclude out of stock
   - Minimum price threshold

5. **Category Mapping**:
   - Shopify type → Google category mapping
   - Default category
   - Auto-categorization (AI)

6. **Custom Labels**:
   - Label 0-4 rules
   - Based on: price range, margin, bestseller, etc.

7. **Advanced**:
   - Include variants separately
   - Tax settings
   - Shipping overrides
   - Promotional pricing

---

## Feed Schema

```typescript
interface GoogleFeedProduct {
  // Required
  id: string                    // SKU
  title: string                 // Max 150 chars
  description: string           // Max 5000 chars
  link: string                  // Product URL
  image_link: string            // Primary image
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder'
  price: string                 // Format: "9.99 USD"

  // Strongly recommended
  gtin?: string                 // UPC/EAN/ISBN
  mpn?: string                  // Manufacturer part number
  brand: string
  google_product_category?: string | number
  product_type?: string

  // Optional
  additional_image_link?: string[]  // Up to 10
  sale_price?: string
  sale_price_effective_date?: string
  condition?: 'new' | 'refurbished' | 'used'
  adult?: boolean
  age_group?: 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult'
  color?: string
  gender?: 'male' | 'female' | 'unisex'
  material?: string
  pattern?: string
  size?: string
  item_group_id?: string        // For variants
  shipping?: ShippingInfo
  shipping_weight?: string
  shipping_length?: string
  shipping_width?: string
  shipping_height?: string
  custom_label_0?: string
  custom_label_1?: string
  custom_label_2?: string
  custom_label_3?: string
  custom_label_4?: string
}
```

---

## Database Schema Additions

```sql
-- Google Feed settings
CREATE TABLE google_feed_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  merchant_id VARCHAR(100),
  api_credentials JSONB, -- encrypted
  feed_name VARCHAR(255),
  target_country VARCHAR(10) DEFAULT 'US',
  language VARCHAR(10) DEFAULT 'en',
  update_frequency VARCHAR(50) DEFAULT 'daily',
  feed_format VARCHAR(10) DEFAULT 'xml',
  default_brand VARCHAR(255),
  default_availability VARCHAR(50) DEFAULT 'in_stock',
  exclusion_rules JSONB DEFAULT '[]',
  category_mapping JSONB DEFAULT '{}',
  custom_label_rules JSONB DEFAULT '{}',
  include_variants BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product feed overrides
CREATE TABLE google_feed_products (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  shopify_product_id VARCHAR(100) NOT NULL,
  shopify_variant_id VARCHAR(100),
  is_excluded BOOLEAN DEFAULT false,
  exclude_reason VARCHAR(255),

  -- Overrides (null = use Shopify data)
  title_override VARCHAR(500),
  description_override TEXT,
  gtin VARCHAR(50),
  mpn VARCHAR(100),
  brand_override VARCHAR(255),
  google_category_id VARCHAR(100),
  product_type VARCHAR(255),
  condition VARCHAR(50),
  custom_label_0 VARCHAR(100),
  custom_label_1 VARCHAR(100),
  custom_label_2 VARCHAR(100),
  custom_label_3 VARCHAR(100),
  custom_label_4 VARCHAR(100),

  -- Sync status
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(50), -- synced, pending, error
  merchant_status VARCHAR(50), -- approved, disapproved, pending
  merchant_issues JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, shopify_product_id, shopify_variant_id)
);

-- Feed sync history
CREATE TABLE google_feed_sync_history (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50), -- running, completed, failed
  products_synced INTEGER,
  products_added INTEGER,
  products_updated INTEGER,
  products_removed INTEGER,
  errors JSONB DEFAULT '[]',
  feed_url TEXT
);
```

---

## API Routes Required

```
-- Overview
GET    /api/admin/google-feed/status
POST   /api/admin/google-feed/sync

-- Images
GET    /api/admin/google-feed/images
POST   /api/admin/google-feed/images/optimize

-- Preview
GET    /api/admin/google-feed/preview
GET    /api/admin/google-feed/download

-- Products
GET    /api/admin/google-feed/products
GET    /api/admin/google-feed/products/[handle]
PUT    /api/admin/google-feed/products/[handle]
POST   /api/admin/google-feed/products/[handle]/exclude
POST   /api/admin/google-feed/products/[handle]/include
POST   /api/admin/google-feed/products/bulk-action

-- Settings
GET    /api/admin/google-feed/settings
PUT    /api/admin/google-feed/settings
POST   /api/admin/google-feed/settings/test-connection

-- Feed file endpoint (public, authenticated by URL token)
GET    /api/feeds/google/[tenant-token]/products.xml
GET    /api/feeds/google/[tenant-token]/products.json
```

---

## Background Jobs

```typescript
// Scheduled feed sync
const googleFeedSync = task({
  id: 'google-feed-sync',
  run: async (payload: { tenantId: string }) => {
    // 1. Fetch products from Shopify
    // 2. Apply exclusion rules
    // 3. Apply category mappings
    // 4. Apply custom label rules
    // 5. Generate feed file
    // 6. Upload to storage
    // 7. Notify Merchant Center (if connected)
    // 8. Update sync status
  }
})

// Product update webhook handler
const googleFeedProductUpdate = task({
  id: 'google-feed-product-update',
  run: async (payload: { tenantId: string, productId: string }) => {
    // Update single product in feed
  }
})
```

---

## Definition of Done

- [x] All 6 Google Feed pages documented with full specifications
- [x] Feed generation with proper Google schema
- [x] Product-level overrides and customization
- [x] Exclusion rules system
- [x] Category mapping (Shopify → Google)
- [x] Custom labels configuration
- [x] Image optimization integration
- [x] Merchant Center connection (optional)
- [x] All APIs listed with tenant isolation
- [x] Database schema additions specified
- [x] Background sync jobs specified

---

## Implementation Status: COMPLETE

### Files Created

#### Database Migration
- `packages/db/src/migrations/tenant/016_google_feed.sql` - Complete schema for google_feed_settings, google_feed_products, google_feed_sync_history, google_feed_images

#### Commerce Package (Types & Generator)
- `packages/commerce/src/google-feed/types.ts` - All TypeScript types for Google Feed
- `packages/commerce/src/google-feed/generator.ts` - XML/JSON feed generator with Google Shopping schema
- `packages/commerce/src/google-feed/index.ts` - Module exports

#### Jobs Package
- `packages/jobs/src/handlers/google-feed-sync.ts` - Background job definitions for feed sync, product updates, and image optimization

#### Admin App - Lib
- `apps/admin/src/lib/google-feed/types.ts` - Admin-specific types
- `apps/admin/src/lib/google-feed/db.ts` - Database operations with tenant isolation

#### Admin App - API Routes
- `apps/admin/src/app/api/admin/google-feed/status/route.ts` - GET feed status
- `apps/admin/src/app/api/admin/google-feed/sync/route.ts` - POST trigger sync
- `apps/admin/src/app/api/admin/google-feed/settings/route.ts` - GET/PUT settings
- `apps/admin/src/app/api/admin/google-feed/settings/test-connection/route.ts` - POST test Merchant Center connection
- `apps/admin/src/app/api/admin/google-feed/products/route.ts` - GET product list
- `apps/admin/src/app/api/admin/google-feed/products/[handle]/route.ts` - GET/PUT product detail
- `apps/admin/src/app/api/admin/google-feed/products/[handle]/exclude/route.ts` - POST exclude product
- `apps/admin/src/app/api/admin/google-feed/products/[handle]/include/route.ts` - POST include product
- `apps/admin/src/app/api/admin/google-feed/products/bulk-action/route.ts` - POST bulk actions
- `apps/admin/src/app/api/admin/google-feed/preview/route.ts` - GET feed preview
- `apps/admin/src/app/api/admin/google-feed/download/route.ts` - GET download feed file
- `apps/admin/src/app/api/admin/google-feed/images/route.ts` - GET image list
- `apps/admin/src/app/api/admin/google-feed/images/optimize/route.ts` - POST optimize images
- `apps/admin/src/app/api/feeds/google/[token]/products.xml/route.ts` - Public XML feed endpoint
- `apps/admin/src/app/api/feeds/google/[token]/products.json/route.ts` - Public JSON feed endpoint

#### Admin App - Pages
- `apps/admin/src/app/admin/google-feed/page.tsx` - Feed Overview dashboard
- `apps/admin/src/app/admin/google-feed/products/page.tsx` - Product list with filters
- `apps/admin/src/app/admin/google-feed/products/[handle]/page.tsx` - Product detail with overrides form
- `apps/admin/src/app/admin/google-feed/images/page.tsx` - Image management grid
- `apps/admin/src/app/admin/google-feed/preview/page.tsx` - Feed preview (XML/JSON/Table)
- `apps/admin/src/app/admin/google-feed/settings/page.tsx` - Feed settings configuration

### Tenant Isolation
All database operations use `withTenant()` wrapper. Feed URLs are unique per tenant using feed tokens. All API routes validate tenant context via `x-tenant-slug` header.
