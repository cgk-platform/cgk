# @cgk-platform/dam

Digital Asset Management for the CGK platform - centralized media management for product images, marketing assets, creator content, and ad creatives.

## Installation

```bash
pnpm add @cgk-platform/dam
```

## Features

- **Asset Storage** - Upload and manage images, videos, and documents
- **Collections** - Organize assets into collections
- **Smart Collections** - Auto-organize with rule-based collections
- **Google Drive Sync** - Import assets from Google Drive
- **Rights Management** - Track usage rights and licensing
- **Quality Variants** - Generate multiple quality versions
- **Metadata & Tags** - Rich metadata and taxonomy support
- **Tenant Isolation** - Multi-tenant asset separation

## Quick Start

### Upload an Asset

```typescript
import { createAsset } from '@cgk-platform/dam'

const asset = await createAsset({
  tenantId: 'tenant_123',
  fileName: 'product-hero.jpg',
  fileSize: 245760,
  mimeType: 'image/jpeg',
  assetType: 'image',
  sourceType: 'upload',
  url: 'https://cdn.example.com/images/product-hero.jpg',
  width: 1920,
  height: 1080,
  tags: ['product', 'hero', 'bedding'],
  rightsStatus: 'owned',
})
```

### Create a Collection

```typescript
import { createCollection } from '@cgk-platform/dam'

const collection = await createCollection({
  tenantId: 'tenant_123',
  name: 'Spring Campaign 2026',
  type: 'manual',
  description: 'Marketing assets for spring campaign',
})

// Add assets to collection
await addAssetsToCollection(collection.id, [asset.id])
```

### Smart Collections

```typescript
import { createSmartCollection } from '@cgk-platform/dam'

// Auto-collect all product images
const smartCollection = await createSmartCollection({
  tenantId: 'tenant_123',
  name: 'All Product Images',
  type: 'smart',
  rules: {
    match: 'all',
    conditions: [
      { field: 'assetType', operator: 'equals', value: 'image' },
      { field: 'tags', operator: 'contains', value: 'product' },
    ],
  },
})
```

### Google Drive Integration

```typescript
import { createGDriveConnection, syncGDriveFolder } from '@cgk-platform/dam'

// Connect Google Drive
const connection = await createGDriveConnection({
  tenantId: 'tenant_123',
  accessToken: 'ya29...',
  refreshToken: 'refresh_token',
  email: 'team@my-brand.com',
})

// Sync folder
await syncGDriveFolder({
  connectionId: connection.id,
  folderId: 'google_drive_folder_id',
  syncMode: 'auto', // or 'manual'
})
```

### Search Assets

```typescript
import { searchAssets } from '@cgk-platform/dam'

const results = await searchAssets({
  tenantId: 'tenant_123',
  query: 'product bedding',
  assetTypes: ['image'],
  tags: ['hero'],
  limit: 20,
})
```

## Key Exports

### Assets
- `createAsset()`, `updateAsset()`, `deleteAsset()`
- `getAsset()`, `listAssets()`, `searchAssets()`
- `generateQualityVariants()`, `getAssetUrl()`

### Collections
- `createCollection()`, `updateCollection()`, `deleteCollection()`
- `addAssetsToCollection()`, `removeAssetsFromCollection()`
- `createSmartCollection()`, `evaluateSmartCollection()`

### Google Drive
- `createGDriveConnection()`, `updateGDriveConnection()`
- `syncGDriveFolder()`, `getSyncStatus()`
- `listGDriveFiles()`, `importGDriveFile()`

### Types
- `Asset`, `AssetType`, `SourceType`, `RightsStatus`
- `Collection`, `CollectionType`, `SmartCollectionRules`
- `GDriveConnection`, `SyncMode`, `QualityVariant`

## Asset Types

Supported asset types:
- `image` - JPEG, PNG, WebP, GIF
- `video` - MP4, MOV, WebM
- `document` - PDF, DOCX, XLSX
- `audio` - MP3, WAV, M4A
- `archive` - ZIP, RAR

## Rights Management

Rights statuses:
- `owned` - Full ownership
- `licensed` - Licensed for use
- `royalty_free` - Royalty-free license
- `creative_commons` - CC license
- `unknown` - Rights unknown

## License

MIT
