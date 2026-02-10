# PHASE-3E: Video Processing Core

**Duration**: 1.5 weeks (Week 14-15)
**Depends On**: PHASE-3A (Storefront Foundation), PHASE-5A (Jobs Setup)
**Parallel With**: PHASE-3F (DAM)
**Blocks**: PHASE-3E-VIDEO-TRANSCRIPTION, PHASE-3E-VIDEO-CREATOR-TOOLS

---

## Goal

Implement multi-tenant video hosting and streaming using Mux, with direct browser uploads, adaptive bitrate playback, video analytics, and comprehensive permission system. This provides the foundation for creator video content, teleprompter recordings, and marketing videos.

---

## Success Criteria

- [ ] Direct browser uploads to Mux (no server bandwidth used)
- [ ] HLS adaptive streaming with thumbnails and storyboards
- [ ] Video library with folders, search, and filters
- [ ] Video permissions (public, team, user, password-protected)
- [ ] View tracking and analytics
- [ ] Webhook handlers for Mux events
- [ ] Tenant isolation for all video operations

---

## Deliverables

### Video Package (`packages/video`)
```
packages/video/
├── src/
│   ├── types.ts           # Video, Folder, Permission, View types
│   ├── db.ts              # Database operations (tenant-isolated)
│   ├── schema.ts          # Table definitions
│   ├── mux/
│   │   ├── client.ts      # Mux API client
│   │   ├── uploads.ts     # Direct upload creation
│   │   ├── assets.ts      # Asset management
│   │   ├── playback.ts    # URL generation (stream, thumbnail, storyboard)
│   │   └── webhooks.ts    # Webhook signature verification
│   ├── permissions/
│   │   ├── types.ts       # Permission levels (owner, editor, commenter, viewer)
│   │   ├── db.ts          # Permission CRUD
│   │   └── check.ts       # Permission validation
│   ├── analytics/
│   │   ├── views.ts       # View tracking
│   │   └── aggregates.ts  # View counts, watch time
│   └── index.ts
├── package.json
└── README.md
```

### Database Schema

```sql
-- Video library
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  folder_id UUID REFERENCES video_folders(id) ON DELETE SET NULL,

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  recording_type TEXT CHECK (recording_type IN ('screen', 'camera', 'screen_camera', 'upload')),

  -- Mux integration
  mux_upload_id TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  thumbnail_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'processing', 'ready', 'error', 'deleted')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

-- Folder organization
CREATE TABLE video_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_id UUID REFERENCES video_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permissions (Loom-style sharing)
CREATE TABLE video_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'commenter', 'editor', 'owner')),

  -- Target (exactly one should be set)
  user_id TEXT,
  email TEXT,
  is_public BOOLEAN DEFAULT false,
  is_team BOOLEAN DEFAULT false,

  -- Optional security
  password_hash TEXT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- View tracking
CREATE TABLE video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT,
  watch_duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_videos_tenant_user ON videos(tenant_id, user_id);
CREATE INDEX idx_videos_tenant_status ON videos(tenant_id, status);
CREATE INDEX idx_videos_tenant_folder ON videos(tenant_id, folder_id);
CREATE INDEX idx_videos_mux_asset_id ON videos(mux_asset_id);
CREATE INDEX idx_videos_search ON videos USING GIN(search_vector);
CREATE INDEX idx_video_permissions_video ON video_permissions(video_id);
CREATE INDEX idx_video_views_video ON video_views(video_id, created_at);
```

### API Routes

```
/api/v1/videos
  GET    - List videos with pagination, filtering
  POST   - Create video record + get Mux upload URL

/api/v1/videos/[id]
  GET    - Get video details (with permission check)
  PATCH  - Update metadata (title, description, folder)
  DELETE - Soft delete

/api/v1/videos/[id]/permissions
  GET    - List permissions
  POST   - Create permission (user, email, public, team)
  DELETE - Revoke permission

/api/v1/videos/[id]/views
  POST   - Track view progress
  GET    - Get view analytics (owner only)

/api/v1/webhooks/mux
  POST   - Handle Mux webhooks (upload complete, asset ready, error)
```

### Admin UI Components

```
apps/admin/src/app/admin/videos/
├── page.tsx                    # Video library grid/list
├── [id]/
│   └── page.tsx                # Video detail/edit page
└── upload/
    └── page.tsx                # Upload modal

apps/admin/src/components/admin/videos/
├── video-library.tsx           # Grid/list with search and filters
├── video-card.tsx              # Thumbnail, title, status badge
├── video-player.tsx            # HLS.js player with controls
├── folder-sidebar.tsx          # Folder tree navigation
├── upload-modal.tsx            # Drag-drop upload with progress
├── permissions-panel.tsx       # Share and permission management
└── video-analytics.tsx         # View count, watch time charts
```

---

## Mux Integration Details

### Direct Upload Flow

```typescript
// 1. Create upload on server
const { uploadUrl, uploadId } = await mux.createDirectUpload({
  corsOrigin: '*',
  newAssetSettings: {
    playbackPolicy: ['public'],
    mp4Support: 'capped-1080p',  // Needed for transcription
    normalizeAudio: true,
    masterAccess: 'temporary',  // For storyboards
  },
  test: process.env.NODE_ENV === 'development',
})

// 2. Client uploads directly to Mux
await fetch(uploadUrl, {
  method: 'PUT',
  body: videoFile,
  headers: { 'Content-Type': videoFile.type }
})

// 3. Mux sends webhooks → update video status
```

### Webhook Events

| Event | Action |
|-------|--------|
| `video.upload.asset_created` | Link upload_id → asset_id, status = 'processing' |
| `video.asset.ready` | Set playback_id, duration, thumbnail, status = 'ready' |
| `video.asset.static_renditions.ready` | **Trigger transcription task** |
| `video.asset.errored` | status = 'error', save error message |

### Playback URLs

```typescript
// HLS stream
getPlaybackUrl(playbackId) → 'https://stream.mux.com/{id}.m3u8'

// Thumbnail
getThumbnailUrl(playbackId, { width: 400, time: 5 }) → 'https://image.mux.com/{id}/thumbnail.jpg'

// Storyboard (for scrubbing)
getStoryboardUrl(playbackId) → 'https://image.mux.com/{id}/storyboard.vtt'

// Animated GIF preview
getAnimatedThumbnailUrl(playbackId, { start: 0, end: 5 })
```

---

## Constraints

- All video queries MUST use `withTenant(tenantId, ...)`
- Mux webhook verification is REQUIRED (HMAC-SHA256)
- Direct uploads only - no server-side video handling
- MP4 support required for transcription (capped-1080p)
- Use soft deletes (deleted_at) for videos

---

## Tenant Isolation (MANDATORY)

```typescript
// ✅ CORRECT - All operations scoped to tenant
export async function getVideos(tenantId: string, options: ListOptions) {
  return withTenant(tenantId, async () => {
    return sql`
      SELECT * FROM videos
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${options.limit} OFFSET ${options.offset}
    `
  })
}

// ❌ WRONG - No tenant scope
const videos = await sql`SELECT * FROM videos`
```

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Video library grid, player controls, upload modal
- Context7 MCP: "hls.js react integration"
- Context7 MCP: "mux direct upload"

**RAWDOG code to reference:**
- `src/lib/video/services/mux/` - Mux client patterns
- `src/lib/video/db.ts` - Video database operations
- `src/app/api/v1/videos/` - API route patterns
- `src/app/admin/videos/` - Admin UI patterns
- `src/components/video/VideoPlayer.tsx` - HLS.js player implementation

---

## AI Discretion Areas

1. Video grid layout (cards vs list toggle)
2. Upload progress UI (inline vs modal)
3. HLS.js configuration options
4. View tracking granularity (every N seconds)
5. Folder vs tag-based organization

---

## Tasks

### [PARALLEL] Package Setup
- [ ] Create `packages/video/` structure
- [ ] Add dependencies: `@mux/mux-node`, types
- [ ] Configure package.json with proper exports

### [PARALLEL] Database Layer
- [ ] Create schema with migrations
- [ ] Implement `videos` CRUD with tenant isolation
- [ ] Implement `video_folders` CRUD
- [ ] Implement `video_permissions` CRUD
- [ ] Implement `video_views` tracking

### [PARALLEL] Mux Integration
- [ ] Create Mux client wrapper
- [ ] Implement direct upload creation
- [ ] Implement playback URL generation
- [ ] Implement webhook signature verification
- [ ] Create webhook handlers for all events

### [SEQUENTIAL after Database] API Routes
- [ ] Create `/api/v1/videos` routes
- [ ] Create `/api/v1/videos/[id]` routes
- [ ] Create `/api/v1/videos/[id]/permissions` routes
- [ ] Create `/api/v1/videos/[id]/views` routes
- [ ] Create `/api/v1/webhooks/mux` route

### [SEQUENTIAL after API] Admin UI
- [ ] Create video library page with grid/list views
- [ ] Create video player component (HLS.js)
- [ ] Create folder sidebar navigation
- [ ] Create upload modal with drag-drop and progress
- [ ] Create video detail/edit page
- [ ] Create permissions panel (sharing UI)
- [ ] Create analytics section (view counts, watch time)

---

## Definition of Done

- [ ] Videos can be uploaded via drag-drop (browser → Mux direct)
- [ ] Videos stream with adaptive bitrate (HLS.js)
- [ ] Thumbnails and storyboards display correctly
- [ ] Folders organize videos hierarchically
- [ ] Search finds videos by title/description
- [ ] Permissions control who can view/comment/edit
- [ ] View analytics tracked per video
- [ ] Mux webhooks update video status automatically
- [ ] All operations tenant-isolated
- [ ] `npx tsc --noEmit` passes
