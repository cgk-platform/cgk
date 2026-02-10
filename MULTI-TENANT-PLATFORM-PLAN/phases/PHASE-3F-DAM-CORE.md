# PHASE-3F: Digital Asset Management Core

**Duration**: 1.5 weeks (Week 14-15)
**Depends On**: PHASE-3A (Storefront Foundation), PHASE-5A (Jobs Setup)
**Parallel With**: PHASE-3E (Video)
**Blocks**: PHASE-3F-DAM-WORKFLOWS

---

## Goal

Implement a comprehensive Digital Asset Management (DAM) system with Google Drive integration, asset versioning, full-text search, AI tagging, and robust metadata management. This provides centralized media management for all tenant content including product images, marketing assets, creator content, and ad creatives.

---

## Success Criteria

- [ ] Asset library with all media types (images, video, audio, documents)
- [ ] Google Drive OAuth integration with folder sync
- [ ] Import queue for reviewing/approving Drive content
- [ ] Full-text search across metadata and transcripts
- [ ] AI-powered tagging and categorization
- [ ] Collection/folder organization
- [ ] Asset metadata CRUD
- [ ] Thumbnail generation for all asset types
- [ ] Tenant-isolated asset storage

---

## Deliverables

### DAM Package (`packages/dam`)

```
packages/dam/
├── src/
│   ├── types.ts               # Asset, Collection, Tag types
│   ├── db.ts                  # Database operations
│   ├── schema.ts              # Table definitions
│   ├── assets/
│   │   ├── crud.ts            # Asset CRUD operations
│   │   ├── metadata.ts        # Metadata extraction
│   │   └── thumbnails.ts      # Thumbnail generation
│   ├── storage/
│   │   ├── interface.ts       # IStorageProvider
│   │   ├── vercel-blob.ts     # Vercel Blob storage
│   │   └── gdrive.ts          # Google Drive storage
│   ├── gdrive/
│   │   ├── types.ts           # Connection, FileMapping types
│   │   ├── oauth.ts           # OAuth flow
│   │   ├── api.ts             # Drive API client
│   │   ├── sync.ts            # Sync logic
│   │   ├── webhooks.ts        # Push notification handling
│   │   └── tokens.ts          # Token encryption/refresh
│   ├── import-queue/
│   │   ├── types.ts           # QueueItem, BatchOperation types
│   │   ├── db.ts              # Queue operations
│   │   └── processing.ts      # Batch import logic
│   ├── search/
│   │   ├── full-text.ts       # PostgreSQL FTS
│   │   ├── tags.ts            # Tag-based search
│   │   └── suggestions.ts     # Autocomplete
│   ├── collections/
│   │   ├── types.ts           # Collection, SmartCollection types
│   │   ├── db.ts              # Collection CRUD
│   │   └── smart.ts           # Smart collection rules
│   ├── ai/
│   │   ├── tagging.ts         # AI tag generation
│   │   ├── description.ts     # AI description generation
│   │   └── faces.ts           # Face detection
│   └── index.ts
├── package.json
└── README.md
```

### Database Schema

```sql
-- Core asset library
CREATE TABLE dam_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- File information
  title TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'document')),
  mime_type TEXT NOT NULL,
  file_extension TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size_bytes BIGINT,

  -- Dimensions (for images/video)
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,     -- For video/audio

  -- Quality variant tracking
  quality_variant TEXT DEFAULT 'master' CHECK (quality_variant IN ('master', 'full', 'web', 'thumbnail', 'proxy')),
  parent_asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  asset_group_id UUID,          -- Groups variants of same content
  version_number INTEGER DEFAULT 1,

  -- Mux integration (for video)
  mux_asset_id TEXT,
  mux_playback_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',  -- Flexible metadata storage
  exif_data JSONB,              -- Extracted EXIF data

  -- Tags and classification
  manual_tags TEXT[],           -- User-added tags
  ai_tags TEXT[],               -- Auto-generated tags
  ai_objects TEXT[],            -- Detected objects
  ai_scenes TEXT[],             -- Detected scenes
  ai_visual_description TEXT,   -- AI description
  content_tags TEXT[],          -- Content classification (hook, testimonial, etc.)
  product_tags TEXT[],          -- Product association (cleanser, moisturizer, etc.)

  -- Rights and status
  rights_status TEXT DEFAULT 'pending' CHECK (rights_status IN ('active', 'pending', 'expired', 'revoked')),
  rights_expires_at TIMESTAMPTZ,
  rights_holder TEXT,
  rights_notes TEXT,

  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,

  -- Source tracking
  source_type TEXT CHECK (source_type IN ('upload', 'gdrive', 'api', 'import')),
  source_file_id TEXT,          -- Original file ID (e.g., Drive file ID)
  source_folder_path TEXT,

  -- File hash for deduplication
  file_hash TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(ai_visual_description, '')), 'C')
  ) STORED
);

-- Collections (folders/albums)
CREATE TABLE dam_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  collection_type TEXT DEFAULT 'manual' CHECK (collection_type IN ('manual', 'smart')),
  cover_asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  smart_rules JSONB,            -- Rules for smart collections
  is_public BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  asset_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Collection-Asset junction
CREATE TABLE dam_collection_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  collection_id UUID NOT NULL REFERENCES dam_collections(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, asset_id)
);

-- Google Drive connections
CREATE TABLE dam_gdrive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,                    -- User-friendly connection name
  folder_id TEXT NOT NULL,               -- Root folder to sync
  folder_name TEXT,

  -- Encrypted OAuth tokens
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- Sync configuration
  sync_mode TEXT DEFAULT 'one_way' CHECK (sync_mode IN ('one_way', 'two_way')),
  auto_sync BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  sync_page_token TEXT,                  -- For incremental sync

  -- Watch channel (push notifications)
  watch_channel_id TEXT,
  watch_channel_expiry TIMESTAMPTZ,
  watch_resource_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  needs_reauth BOOLEAN DEFAULT false,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- File mappings (Drive → DAM)
CREATE TABLE dam_gdrive_file_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  connection_id UUID NOT NULL REFERENCES dam_gdrive_connections(id) ON DELETE CASCADE,
  gdrive_file_id TEXT NOT NULL,
  dam_asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  gdrive_name TEXT,
  gdrive_path TEXT,
  gdrive_mime_type TEXT,
  gdrive_modified_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'imported', 'skipped', 'failed', 'removed')),
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(connection_id, gdrive_file_id)
);

-- Import queue
CREATE TABLE dam_import_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('gdrive', 'upload', 'api')),
  source_file_id TEXT,
  source_folder_path TEXT,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  preview_url TEXT,

  -- Pre-fill metadata
  suggested_title TEXT,
  suggested_tags TEXT[],
  suggested_creator_id UUID,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  assigned_to TEXT,             -- User assigned to review
  priority INTEGER DEFAULT 0,
  error_message TEXT,

  -- Result
  imported_asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Trash (soft delete recovery)
CREATE TABLE dam_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  asset_id UUID NOT NULL,
  asset_data JSONB NOT NULL,    -- Full asset snapshot
  deleted_by TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  permanent_delete_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days')
);

-- Usage/analytics logs
CREATE TABLE dam_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  user_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('view', 'download', 'export', 'share')),
  metadata JSONB,               -- Action-specific data
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE dam_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL,         -- create, update, delete, restore, rights_change, etc.
  entity_type TEXT NOT NULL,    -- asset, collection, connection
  entity_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dam_assets_tenant ON dam_assets(tenant_id, created_at DESC);
CREATE INDEX idx_dam_assets_type ON dam_assets(tenant_id, asset_type);
CREATE INDEX idx_dam_assets_group ON dam_assets(asset_group_id);
CREATE INDEX idx_dam_assets_search ON dam_assets USING GIN(search_vector);
CREATE INDEX idx_dam_assets_tags ON dam_assets USING GIN(manual_tags);
CREATE INDEX idx_dam_assets_ai_tags ON dam_assets USING GIN(ai_tags);
CREATE INDEX idx_dam_assets_hash ON dam_assets(file_hash);
CREATE INDEX idx_dam_collections_tenant ON dam_collections(tenant_id);
CREATE INDEX idx_dam_queue_status ON dam_import_queue_items(tenant_id, status);
CREATE INDEX idx_dam_gdrive_connection ON dam_gdrive_connections(tenant_id);
CREATE INDEX idx_dam_usage_asset ON dam_usage_logs(asset_id, created_at);
```

### API Routes

```
-- Assets
/api/admin/dam/assets
  GET    - List assets with filters, pagination, search
  POST   - Upload new asset

/api/admin/dam/assets/[id]
  GET    - Get asset details
  PATCH  - Update metadata
  DELETE - Move to trash

/api/admin/dam/assets/[id]/download
  GET    - Download original file

/api/admin/dam/assets/bulk
  POST   - Bulk operations (tag, move, delete)

-- Collections
/api/admin/dam/collections
  GET    - List collections
  POST   - Create collection

/api/admin/dam/collections/[id]
  GET    - Get collection with assets
  PATCH  - Update collection
  DELETE - Delete collection

/api/admin/dam/collections/[id]/assets
  POST   - Add assets to collection
  DELETE - Remove assets from collection

-- Google Drive
/api/admin/dam/gdrive/connect
  POST   - Initiate OAuth flow

/api/admin/dam/gdrive/callback
  GET    - OAuth callback

/api/admin/dam/gdrive/connections
  GET    - List connections

/api/admin/dam/gdrive/connections/[id]
  DELETE - Disconnect

/api/admin/dam/gdrive/connections/[id]/sync
  POST   - Trigger manual sync

/api/admin/dam/gdrive/webhook
  POST   - Handle Drive push notifications

-- Import Queue
/api/admin/dam/import-queue
  GET    - List queue items

/api/admin/dam/import-queue/[id]/approve
  POST   - Approve and import

/api/admin/dam/import-queue/[id]/skip
  POST   - Skip item

/api/admin/dam/import-queue/bulk
  POST   - Bulk approve/skip

-- Search
/api/admin/dam/search
  GET    - Full-text search with filters

/api/admin/dam/tags/suggestions
  GET    - Tag autocomplete
```

### Admin UI Components

```
apps/admin/src/app/admin/dam/
├── page.tsx                    # Asset library main view
├── upload/
│   └── page.tsx                # Upload interface
├── collections/
│   ├── page.tsx                # Collections list
│   └── [id]/
│       └── page.tsx            # Collection detail
├── import-queue/
│   └── page.tsx                # Import queue review
├── gdrive/
│   ├── page.tsx                # Drive connections
│   └── connect/
│       └── page.tsx            # OAuth flow
└── settings/
    └── page.tsx                # DAM settings

apps/admin/src/components/admin/dam/
├── asset-library.tsx           # Grid/list view with filters
├── asset-card.tsx              # Thumbnail with metadata
├── asset-detail-modal.tsx      # Full asset view/edit
├── asset-uploader.tsx          # Drag-drop upload
├── collection-sidebar.tsx      # Collection navigation
├── search-bar.tsx              # Search with filters
├── tag-editor.tsx              # Tag management
├── import-queue-table.tsx      # Queue review interface
├── gdrive-connection-card.tsx  # Drive connection status
├── bulk-actions-bar.tsx        # Multi-select actions
└── metadata-panel.tsx          # Asset metadata editor
```

---

## Google Drive Integration

### OAuth Flow

```typescript
// 1. Generate authorization URL
const authUrl = generateGoogleAuthUrl({
  clientId: GOOGLE_CLIENT_ID,
  redirectUri: `${BASE_URL}/api/admin/dam/gdrive/callback`,
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ],
  state: encodeState({ tenantId, userId, folderId }),
})

// 2. Exchange code for tokens (in callback)
const tokens = await exchangeCodeForTokens(code)

// 3. Encrypt and store
const encryptedAccess = await encryptToken(tokens.access_token)
const encryptedRefresh = await encryptToken(tokens.refresh_token)
```

### Token Encryption

```typescript
// AES-256-GCM encryption
const ENCRYPTION_KEY = process.env.DAM_TOKEN_ENCRYPTION_KEY  // 32 bytes
const IV_LENGTH = 12

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(token), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}
```

### Sync Process

```typescript
// Initial sync - full folder scan
async function initialSync(connection: GdriveConnection): Promise<void> {
  const files = await listFilesRecursively(connection.folderId)
  for (const file of files) {
    await createFileMapping(connection.id, file)
    await queueForImport(file)
  }
}

// Incremental sync - changes only
async function incrementalSync(connection: GdriveConnection): Promise<void> {
  const { changes, newPageToken } = await listChanges(connection.syncPageToken)
  for (const change of changes) {
    if (change.removed) {
      await markFileRemoved(connection.id, change.fileId)
    } else {
      await updateOrCreateMapping(connection.id, change.file)
    }
  }
  await updateSyncPageToken(connection.id, newPageToken)
}
```

### Push Notifications (Webhooks)

```typescript
// Create watch channel (expires in 7 days)
const channel = await drive.files.watch({
  fileId: folderId,
  requestBody: {
    id: generateChannelId(),
    type: 'web_hook',
    address: `${BASE_URL}/api/admin/dam/gdrive/webhook`,
    expiration: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }
})

// Handle webhook
async function handleGdriveWebhook(req: Request): Promise<void> {
  const channelId = req.headers.get('X-Goog-Channel-ID')
  const resourceState = req.headers.get('X-Goog-Resource-State')

  if (resourceState === 'change') {
    const connection = await findConnectionByChannel(channelId)
    await incrementalSync(connection)
  }
}
```

---

## Supported File Types

```typescript
const SUPPORTED_TYPES = {
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'raw', 'psd', 'ai', 'avif'],
  video: ['mp4', 'mov', 'mxf', 'webm', 'mkv', 'avi'],
  audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
}

// Quality rankings (higher = better quality)
const QUALITY_RANKINGS = {
  image: { tiff: 100, raw: 100, psd: 90, png: 80, jpg: 70, webp: 70, gif: 50 },
  video: { mxf: 100, mov: 90, mp4: 80, mkv: 70, avi: 60, webm: 60 },
}
```

---

## Constraints

- All asset queries MUST use `withTenant(tenantId, ...)`
- OAuth tokens MUST be encrypted at rest
- File hashes MUST be computed for deduplication
- Soft deletes with 30-day trash retention
- Google Drive connections require re-auth every 6 months

---

## Tenant Isolation (MANDATORY)

```typescript
// ✅ CORRECT - Tenant-scoped queries
export async function getAssets(tenantId: string, options: ListOptions) {
  return withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM dam_assets
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${options.limit} OFFSET ${options.offset}
    `
  })
}

// ✅ CORRECT - Tenant-scoped cache
const cache = createTenantCache(tenantId)
await cache.set('dam:stats', stats, 900)  // 15 min TTL
```

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Asset library grid, upload interface, metadata panel
- Context7 MCP: "google drive api nodejs"
- Context7 MCP: "vercel blob upload"

**RAWDOG code to reference:**
- `src/lib/dam/types.ts` - Asset and collection types
- `src/lib/dam/db.ts` - Database operations
- `src/lib/dam/gdrive/` - Google Drive integration
- `src/lib/dam/import-queue/` - Import queue logic
- `src/lib/dam/search.ts` - Full-text search
- `src/app/admin/dam/` - Admin UI patterns

---

## AI Discretion Areas

1. Thumbnail generation strategy (server-side vs CDN)
2. Search ranking algorithm weights
3. Smart collection rule syntax
4. Deduplication strategy (hash-based vs visual similarity)
5. Batch import chunk size

---

## Tasks

### [PARALLEL] Package Setup
- [ ] Create `packages/dam/` structure
- [ ] Add dependencies: `@google-cloud/local-auth`, `@vercel/blob`
- [ ] Configure package.json with proper exports

### [PARALLEL] Database Layer
- [ ] Create schema with migrations
- [ ] Implement `dam_assets` CRUD with tenant isolation
- [ ] Implement `dam_collections` CRUD
- [ ] Implement `dam_gdrive_connections` CRUD
- [ ] Implement `dam_import_queue_items` CRUD
- [ ] Create audit logging functions

### [PARALLEL] Storage Layer
- [ ] Create `IStorageProvider` interface
- [ ] Implement Vercel Blob storage
- [ ] Implement thumbnail generation
- [ ] Implement file hash computation

### [PARALLEL] Google Drive Integration
- [ ] Implement OAuth flow
- [ ] Implement token encryption
- [ ] Implement Drive API client
- [ ] Implement sync logic (initial + incremental)
- [ ] Implement push notification handling

### [SEQUENTIAL after database] Import Queue
- [ ] Create queue item types
- [ ] Implement queue processing logic
- [ ] Implement bulk approve/skip
- [ ] Implement variant detection

### [SEQUENTIAL after database] Search
- [ ] Implement full-text search
- [ ] Implement tag-based search
- [ ] Implement autocomplete suggestions
- [ ] Add caching layer

### [SEQUENTIAL after storage] API Routes
- [ ] Create asset CRUD routes
- [ ] Create collection routes
- [ ] Create Google Drive routes
- [ ] Create import queue routes
- [ ] Create search routes

### [SEQUENTIAL after API] Admin UI
- [ ] Create asset library with grid/list views
- [ ] Create upload interface with drag-drop
- [ ] Create asset detail modal
- [ ] Create collection management UI
- [ ] Create import queue review interface
- [ ] Create Google Drive connection UI
- [ ] Create search with filters

---

## Definition of Done

- [ ] Assets can be uploaded via drag-drop
- [ ] Google Drive folders can be connected
- [ ] Drive files sync to import queue
- [ ] Queue items can be reviewed and imported
- [ ] Full-text search finds assets
- [ ] Collections organize assets
- [ ] Metadata can be edited
- [ ] Audit logs track all changes
- [ ] All operations tenant-isolated
- [ ] `npx tsc --noEmit` passes
