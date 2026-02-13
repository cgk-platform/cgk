# @cgk-platform/dam - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-11

---

## Purpose

Digital Asset Management (DAM) package for the CGK platform. Provides centralized media management for tenant content including product images, marketing assets, creator content, and ad creatives. Includes Google Drive integration, full-text search, and thumbnail generation.

---

## Quick Reference

```typescript
import {
  getAssets,
  createAsset,
  getCollections,
  createCollection,
  searchAssets,
  generateThumbnail,
} from '@cgk-platform/dam'
import { withTenant } from '@cgk-platform/db'

// Always use within tenant context
const assets = await withTenant('rawdog', async () => {
  return getAssets('rawdog', userId, filters)
})
```

---

## Key Patterns

### Pattern 1: Asset CRUD (MANDATORY: Tenant Isolation)

**When to use**: All asset operations

```typescript
import { withTenant } from '@cgk-platform/db'
import { getAssets, createAsset, updateAsset, deleteAsset } from '@cgk-platform/dam'

// List assets with filtering
const result = await withTenant(tenantSlug, () =>
  getAssets(tenantSlug, userId, {
    page: 1,
    limit: 50,
    offset: 0,
    search: 'product',
    asset_type: 'image',
    sort: 'created_at',
    dir: 'desc',
  })
)

// Create asset
const asset = await withTenant(tenantSlug, () =>
  createAsset(tenantSlug, userId, {
    title: 'Product Photo',
    asset_type: 'image',
    mime_type: 'image/jpeg',
    file_url: 'https://...',
    thumbnail_url: 'https://...',
    file_size_bytes: 1024000,
    manual_tags: ['product', 'hero'],
  })
)

// Update asset
const updated = await withTenant(tenantSlug, () =>
  updateAsset(tenantSlug, {
    id: assetId,
    title: 'New Title',
    manual_tags: ['updated', 'tags'],
  })
)

// Delete (soft delete to trash)
await withTenant(tenantSlug, () =>
  deleteAsset(tenantSlug, assetId, userId)
)
```

### Pattern 2: Collections

**When to use**: Organizing assets into folders/albums

```typescript
import {
  getCollections,
  createCollection,
  addAssetsToCollection,
  getCollectionAssets,
} from '@cgk-platform/dam'

// List collections
const collections = await withTenant(tenantSlug, () =>
  getCollections(tenantSlug)
)

// Create collection
const collection = await withTenant(tenantSlug, () =>
  createCollection(tenantSlug, userId, {
    name: 'Campaign Assets',
    description: 'Q1 2025 campaign',
    collection_type: 'manual',
  })
)

// Add assets
await withTenant(tenantSlug, () =>
  addAssetsToCollection(tenantSlug, collectionId, ['asset1', 'asset2'])
)

// Get assets in collection
const { assets, totalCount } = await withTenant(tenantSlug, () =>
  getCollectionAssets(tenantSlug, collectionId, 50, 0)
)
```

### Pattern 3: Full-Text Search

**When to use**: Searching assets by content

```typescript
import { searchAssets, getSearchSuggestions } from '@cgk-platform/dam'

// Search with filters
const result = await withTenant(tenantSlug, () =>
  searchAssets({
    query: 'product lifestyle',
    tenantId: tenantSlug,
    assetTypes: ['image', 'video'],
    tags: ['hero'],
    sort: 'relevance',
  })
)

// Get autocomplete suggestions
const suggestions = await withTenant(tenantSlug, () =>
  getSearchSuggestions(tenantSlug, 'prod', 10)
)
```

### Pattern 4: File Upload with Thumbnail

**When to use**: Uploading new assets

```typescript
import {
  createAsset,
  extractMetadata,
  computeFileHash,
  generateThumbnail,
  getAssetTypeFromMime,
  createVercelBlobStorage,
} from '@cgk-platform/dam'

// 1. Determine asset type
const assetType = getAssetTypeFromMime(file.type)

// 2. Extract metadata
const metadata = await extractMetadata(buffer, assetType, file.type)

// 3. Compute hash for deduplication
const hash = await computeFileHash(buffer)

// 4. Upload to storage
const storage = createVercelBlobStorage()
const { url } = await storage.upload(buffer, {
  filename: file.name,
  contentType: file.type,
  folder: `tenants/${tenantSlug}/assets/${assetType}`,
})

// 5. Generate thumbnail
const thumb = await generateThumbnail(buffer, assetType, file.type)
let thumbnailUrl = null
if (thumb) {
  const { url: thumbUrl } = await storage.upload(thumb.buffer, {
    filename: `${file.name}-thumb.webp`,
    contentType: thumb.contentType,
    folder: `tenants/${tenantSlug}/thumbnails`,
  })
  thumbnailUrl = thumbUrl
}

// 6. Create asset record
const asset = await withTenant(tenantSlug, () =>
  createAsset(tenantSlug, userId, {
    title: file.name,
    asset_type: assetType,
    mime_type: file.type,
    file_url: url,
    thumbnail_url: thumbnailUrl,
    file_size_bytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    file_hash: hash,
    source_type: 'upload',
  })
)
```

### Pattern 5: Google Drive Integration

**When to use**: Connecting Google Drive folders

```typescript
import {
  generateAuthorizationUrl,
  exchangeCodeForTokens,
  createConnection,
  initialSync,
  getOAuthConfigFromEnv,
} from '@cgk-platform/dam'

// 1. Generate OAuth URL
const config = getOAuthConfigFromEnv()
const authUrl = generateAuthorizationUrl(config, {
  tenantId,
  userId,
  folderId,
})

// 2. Exchange code for tokens (in callback)
const tokens = await exchangeCodeForTokens(config, code)

// 3. Create connection
const connection = await withTenant(tenantSlug, () =>
  createConnection(tenantSlug, userId, {
    name: 'My Drive Folder',
    folder_id: folderId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(tokens.expiry_date).toISOString(),
  })
)

// 4. Trigger initial sync
const result = await withTenant(tenantSlug, () =>
  initialSync(tenantSlug, connection)
)
```

---

## File Map

| Directory | Purpose |
|-----------|---------|
| `src/types.ts` | All type definitions |
| `src/assets/crud.ts` | Asset CRUD operations |
| `src/assets/metadata.ts` | Metadata extraction |
| `src/assets/thumbnails.ts` | Thumbnail generation |
| `src/storage/` | Storage provider interface and implementations |
| `src/collections/db.ts` | Collection operations |
| `src/gdrive/` | Google Drive integration |
| `src/import-queue/db.ts` | Import queue operations |
| `src/search/` | Full-text search and tags |
| `src/audit.ts` | Audit and usage logging |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `dam_assets` | Core asset records |
| `dam_collections` | Folders/albums |
| `dam_collection_assets` | Asset-collection junction |
| `dam_gdrive_connections` | Google Drive connections |
| `dam_gdrive_file_mappings` | Drive file to DAM asset mapping |
| `dam_import_queue_items` | Import queue |
| `dam_trash` | Soft-deleted assets |
| `dam_usage_logs` | View/download tracking |
| `dam_audit_logs` | Change history |

---

## Supported File Types

```typescript
// Images
image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'raw', 'psd', 'ai', 'avif', 'svg', 'heic']

// Videos
video: ['mp4', 'mov', 'mxf', 'webm', 'mkv', 'avi', 'm4v']

// Audio
audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']

// Documents
document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv']
```

---

## Environment Variables

```bash
# Storage
BLOB_READ_WRITE_TOKEN=      # Vercel Blob token

# Google Drive OAuth
GOOGLE_CLIENT_ID=           # Google OAuth client ID
GOOGLE_CLIENT_SECRET=       # Google OAuth client secret
GOOGLE_REDIRECT_URI=        # OAuth callback URL

# Token Encryption (32 bytes / 64 hex chars)
DAM_TOKEN_ENCRYPTION_KEY=   # openssl rand -hex 32
```

---

## Common Gotchas

### 1. Always use tenant context

```typescript
// WRONG - Queries wrong schema
const assets = await getAssets(tenantSlug, userId, filters)

// CORRECT - Use withTenant wrapper
const assets = await withTenant(tenantSlug, () =>
  getAssets(tenantSlug, userId, filters)
)
```

### 2. OAuth tokens must be encrypted

```typescript
// Tokens are automatically encrypted when using createConnection
// Never store raw tokens in the database

import { encryptToken, decryptToken } from '@cgk-platform/dam'

const encrypted = encryptToken(accessToken)
const decrypted = decryptToken(encrypted)
```

### 3. Soft deletes use trash table

```typescript
// deleteAsset moves to trash, doesn't permanently delete
await deleteAsset(tenantSlug, assetId, userId)

// To restore from trash
await restoreAsset(tenantSlug, assetId)

// For permanent deletion
await permanentlyDeleteAsset(tenantSlug, assetId)
```

### 4. Search requires PostgreSQL FTS

The `dam_assets` table has a generated `search_vector` column. Searches use PostgreSQL full-text search with proper ranking.

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@cgk-platform/db` | Database operations and tenant context |
| `@cgk-platform/core` | Shared types |
| `@vercel/blob` | File storage |
| `googleapis` | Google Drive API |
| `sharp` | Image processing (optional) |

---

## Integration Points

### Used by:
- `apps/admin` - DAM admin pages
- `@cgk-platform/commerce` - Product images
- Creator portal - Creator content uploads

### Uses:
- `@cgk-platform/db` - Database and tenant isolation
- `@cgk-platform/jobs` - Background sync jobs (when available)
