# PHASE-3F: DAM Workflows & Collaboration

> **STATUS**: ✅ COMPLETE (2026-02-12)
> **Completed By**: Wave 3A Agents

**Duration**: 1.5 weeks (Week 16-17)
**Depends On**: PHASE-3F-DAM-CORE
**Parallel With**: PHASE-3E-VIDEO-CREATOR-TOOLS
**Blocks**: None (optional enhancement)

---

## Goal

Implement advanced DAM workflows including version control, ad review/approval processes, collaboration features (comments, annotations), rights management with expiry tracking, and export capabilities for TikTok and Meta platforms.

---

## Success Criteria

- [ ] Version control with snapshot and restore
- [ ] Ad review workflow with approval states
- [ ] Frame-accurate video annotations
- [ ] Threaded comments with @mentions
- [ ] Rights expiry tracking and alerts
- [ ] TikTok and Meta export integrations
- [ ] Notification system (email + Slack)

---

## Deliverables

### Package Extensions

```
packages/dam/
├── src/
│   ├── versions/
│   │   ├── types.ts           # Version, VersionSnapshot
│   │   ├── db.ts              # Version CRUD
│   │   └── restore.ts         # Restore logic
│   ├── ad-review/
│   │   ├── types.ts           # AdProject, AdVersion, ReviewDecision
│   │   ├── projects.ts        # Project management
│   │   ├── versions.ts        # Version management
│   │   ├── review.ts          # Review workflow
│   │   └── comments.ts        # Frame comments
│   ├── collaboration/
│   │   ├── comments.ts        # Asset comments
│   │   ├── annotations.ts     # Drawing annotations
│   │   ├── mentions.ts        # @mention parsing
│   │   └── notifications/
│   │       ├── index.ts       # Notification orchestration
│   │       ├── email.ts       # Email delivery
│   │       └── slack.ts       # Slack integration
│   ├── rights/
│   │   ├── types.ts           # RightsStatus, RightsExpiry
│   │   ├── db.ts              # Rights CRUD
│   │   └── expiry.ts          # Expiry monitoring
│   ├── exports/
│   │   ├── tiktok.ts          # TikTok Marketing API
│   │   ├── meta.ts            # Meta Marketing API
│   │   └── zip.ts             # Bulk ZIP download
│   └── ...existing
```

### Database Schema Extensions

```sql
-- Asset versions
CREATE TABLE dam_asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  mime_type TEXT,
  created_by TEXT NOT NULL,
  change_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, version_number)
);

-- Ad review projects
CREATE TABLE dam_ad_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'changes_requested', 'archived')),
  assigned_reviewers TEXT[],     -- User IDs
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  due_date TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ad versions (iterations within a project)
CREATE TABLE dam_ad_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES dam_ad_projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL,
  status TEXT DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'archived')),
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  uploaded_by TEXT NOT NULL,
  change_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, version_number)
);

-- Review decisions
CREATE TABLE dam_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES dam_ad_projects(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES dam_ad_versions(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(version_id, reviewer_id)
);

-- Frame-accurate comments (for video review)
CREATE TABLE dam_frame_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  ad_version_id UUID NOT NULL REFERENCES dam_ad_versions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  frame_number INTEGER,
  timecode_seconds DECIMAL(10,3),
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  annotation_data JSONB,        -- Drawing/markup data
  parent_id UUID REFERENCES dam_frame_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asset comments (general)
CREATE TABLE dam_asset_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER,    -- For video/audio
  is_resolved BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES dam_asset_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Annotations (drawing on video/image)
CREATE TABLE dam_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  ad_version_id UUID REFERENCES dam_ad_versions(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES dam_assets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('rectangle', 'circle', 'arrow', 'freehand', 'text')),
  timestamp_ms INTEGER,         -- For video
  data JSONB NOT NULL,          -- Coordinates, dimensions, color, etc.
  color TEXT DEFAULT '#ff0000',
  stroke_width INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User mentions
CREATE TABLE dam_user_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  mentioned_user_id TEXT NOT NULL,
  mentioned_by_user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('asset_comment', 'frame_comment', 'review')),
  entity_id UUID NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification settings
CREATE TABLE dam_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  notify_on_mention BOOLEAN DEFAULT true,
  notify_on_reply BOOLEAN DEFAULT true,
  notify_on_asset_update BOOLEAN DEFAULT false,
  notify_on_review_assigned BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  slack_channel TEXT,
  slack_dm BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  UNIQUE(tenant_id, user_id)
);

-- Notification queue
CREATE TABLE dam_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- mention, reply, review_assigned, asset_updated, rights_expiring
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  slack_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Export tracking
CREATE TABLE dam_ad_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  ad_version_id UUID REFERENCES dam_ad_versions(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'meta', 'youtube', 'manual')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  external_id TEXT,             -- Platform video/asset ID
  external_url TEXT,
  advertiser_id TEXT,
  error_message TEXT,
  exported_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- TikTok connected accounts
CREATE TABLE tiktok_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  advertiser_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  advertiser_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, advertiser_id)
);

-- Indexes
CREATE INDEX idx_dam_versions_asset ON dam_asset_versions(asset_id, version_number DESC);
CREATE INDEX idx_dam_ad_projects_tenant ON dam_ad_projects(tenant_id, status);
CREATE INDEX idx_dam_ad_versions_project ON dam_ad_versions(project_id);
CREATE INDEX idx_dam_review_decisions_project ON dam_review_decisions(project_id);
CREATE INDEX idx_dam_frame_comments_version ON dam_frame_comments(ad_version_id);
CREATE INDEX idx_dam_asset_comments_asset ON dam_asset_comments(asset_id);
CREATE INDEX idx_dam_mentions_user ON dam_user_mentions(mentioned_user_id, is_read);
CREATE INDEX idx_dam_notifications_user ON dam_notifications(user_id, is_read, created_at DESC);
```

---

## Version Control

### Version Operations

```typescript
interface AssetVersion {
  id: string
  assetId: string
  versionNumber: number
  fileUrl: string
  fileSizeBytes: number
  width?: number
  height?: number
  durationSeconds?: number
  mimeType: string
  createdBy: string
  changeNotes?: string
  createdAt: Date
}

// Create version snapshot before changes
async function createVersion(
  tenantId: string,
  assetId: string,
  options: { createdBy: string; changeNotes?: string }
): Promise<AssetVersion>

// Get version history
async function getAssetVersions(
  tenantId: string,
  assetId: string
): Promise<AssetVersion[]>

// Restore to previous version (creates new version first)
async function restoreVersion(
  tenantId: string,
  assetId: string,
  versionId: string,
  options: { restoredBy: string }
): Promise<AssetVersion>

// Prune old versions (keep N most recent)
async function pruneOldVersions(
  tenantId: string,
  assetId: string,
  keepCount: number
): Promise<number>  // Number deleted
```

---

## Ad Review Workflow

### Project States

```
draft → in_review → approved
                  ↘ changes_requested → in_review
```

### Workflow Operations

```typescript
interface AdProject {
  id: string
  tenantId: string
  name: string
  description?: string
  status: 'draft' | 'in_review' | 'approved' | 'changes_requested' | 'archived'
  assignedReviewers: string[]
  approvedAt?: Date
  approvedBy?: string
  dueDate?: Date
  createdBy: string
  versions: AdVersion[]
}

interface ReviewDecision {
  id: string
  projectId: string
  versionId: string
  reviewerId: string
  decision: 'approved' | 'changes_requested' | 'rejected'
  notes?: string
  createdAt: Date
}

// Submit project for review
async function submitForReview(
  tenantId: string,
  projectId: string
): Promise<void>

// Submit reviewer decision
async function submitReviewDecision(
  tenantId: string,
  versionId: string,
  decision: ReviewDecision
): Promise<void>

// Check if all reviewers approved → auto-approve project
async function checkProjectApproval(
  tenantId: string,
  projectId: string
): Promise<boolean>

// Resubmit after changes (clears previous decisions)
async function resubmitForReview(
  tenantId: string,
  projectId: string
): Promise<void>
```

---

## Collaboration Features

### Comments

```typescript
interface AssetComment {
  id: string
  assetId: string
  userId: string
  userName: string
  content: string
  timestampSeconds?: number    // For video/audio
  isResolved: boolean
  parentId?: string            // For replies
  replies?: AssetComment[]
  createdAt: Date
}

// Parse @mentions from content
function parseMentions(content: string): string[] {
  const mentionPattern = /@(\w+)/g
  return [...content.matchAll(mentionPattern)].map(m => m[1])
}

// Create comment and trigger notifications
async function createComment(
  tenantId: string,
  comment: Omit<AssetComment, 'id' | 'createdAt'>
): Promise<AssetComment>
```

### Annotations

```typescript
interface Annotation {
  id: string
  type: 'rectangle' | 'circle' | 'arrow' | 'freehand' | 'text'
  timestampMs?: number         // For video frame
  data: {
    x: number
    y: number
    width?: number
    height?: number
    points?: Array<{ x: number; y: number }>  // For freehand
    text?: string              // For text annotation
  }
  color: string
  strokeWidth: number
}
```

### Notifications

```typescript
interface Notification {
  id: string
  userId: string
  type: 'mention' | 'reply' | 'review_assigned' | 'asset_updated' | 'rights_expiring'
  title: string
  body: string
  entityType?: string
  entityId?: string
  isRead: boolean
  createdAt: Date
}

// Multi-channel delivery
async function sendNotification(
  tenantId: string,
  notification: Notification
): Promise<void> {
  const settings = await getNotificationSettings(tenantId, notification.userId)

  if (settings.emailEnabled) {
    await sendEmailNotification(notification)
  }

  if (settings.slackChannel) {
    await sendSlackNotification(notification, settings.slackChannel)
  }

  if (settings.slackDm) {
    await sendSlackDm(notification, notification.userId)
  }
}
```

---

## Rights Management

### Rights Tracking

```typescript
interface RightsInfo {
  status: 'active' | 'pending' | 'expired' | 'revoked'
  expiresAt?: Date
  holder?: string
  notes?: string
  restrictions?: string[]
}

// Get assets expiring within N days
async function getExpiringAssets(
  tenantId: string,
  withinDays: number
): Promise<Asset[]>

// Get already expired assets
async function getExpiredAssets(tenantId: string): Promise<Asset[]>

// Auto-update status when expired
async function markExpiredAssets(tenantId: string): Promise<number>

// Bulk update rights
async function bulkUpdateRightsStatus(
  tenantId: string,
  assetIds: string[],
  status: 'active' | 'expired' | 'revoked'
): Promise<void>

// Extend expiry
async function extendRightsExpiry(
  tenantId: string,
  assetId: string,
  newExpiryDate: Date
): Promise<void>
```

### Expiry Monitoring (Background Job)

```typescript
// Daily job to check expiring rights
export const rightsExpiryCheckTask = task({
  id: 'dam-rights-expiry-check',
  cron: '0 9 * * *',  // 9 AM daily
  run: async (payload: { tenantId: string }) => {
    // Assets expiring in 7 days
    const expiringSoon = await getExpiringAssets(payload.tenantId, 7)
    for (const asset of expiringSoon) {
      await sendNotification({
        type: 'rights_expiring',
        title: 'Rights Expiring Soon',
        body: `${asset.title} rights expire in ${daysUntil(asset.rightsExpiresAt)} days`,
        entityType: 'asset',
        entityId: asset.id,
      })
    }

    // Mark expired assets
    await markExpiredAssets(payload.tenantId)
  }
})
```

---

## Export Capabilities

### TikTok Export

```typescript
// TikTok Marketing API v1.3
const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3'

interface TikTokUploadResult {
  videoId: string
  status: 'processing' | 'ready' | 'error'
  materialId?: string
}

async function exportToTikTok(
  tenantId: string,
  assetId: string,
  advertiserId: string
): Promise<TikTokUploadResult> {
  const asset = await getAsset(tenantId, assetId)
  const account = await getTikTokAccount(tenantId, advertiserId)

  // Upload by URL
  const response = await fetch(`${TIKTOK_API_BASE}/file/video/ad/upload/`, {
    method: 'POST',
    headers: {
      'Access-Token': account.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      upload_type: 'UPLOAD_BY_URL',
      video_url: asset.fileUrl,
      file_name: asset.title,
    })
  })

  return parseResponse(response)
}
```

### Meta Export

```typescript
// Meta Marketing API
async function exportToMeta(
  tenantId: string,
  assetId: string,
  adAccountId: string
): Promise<MetaUploadResult> {
  const asset = await getAsset(tenantId, assetId)
  const account = await getMetaAccount(tenantId, adAccountId)

  // Upload video
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${adAccountId}/advideos`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.accessToken}` },
      body: JSON.stringify({
        file_url: asset.fileUrl,
        title: asset.title,
      })
    }
  )

  return parseResponse(response)
}
```

### Bulk ZIP Export

```typescript
async function createZipDownload(
  tenantId: string,
  assetIds: string[]
): Promise<string> {  // Returns download URL
  const assets = await getAssets(tenantId, assetIds)
  const zip = new JSZip()

  for (const asset of assets) {
    const file = await fetch(asset.fileUrl)
    zip.file(`${asset.title}.${asset.fileExtension}`, file.arrayBuffer())
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = await uploadToBlob(blob, `exports/${tenantId}/${Date.now()}.zip`)

  return url
}
```

---

## API Routes

```
-- Versions
/api/admin/dam/assets/[id]/versions
  GET    - List versions
  POST   - Create version snapshot

/api/admin/dam/assets/[id]/versions/[versionId]/restore
  POST   - Restore to version

-- Ad Review Projects
/api/admin/dam/ad-projects
  GET    - List projects
  POST   - Create project

/api/admin/dam/ad-projects/[id]
  GET    - Get project with versions
  PATCH  - Update project
  DELETE - Archive project

/api/admin/dam/ad-projects/[id]/submit
  POST   - Submit for review

/api/admin/dam/ad-projects/[id]/versions
  POST   - Upload new version

/api/admin/dam/ad-projects/[id]/decisions
  POST   - Submit review decision

-- Frame Comments
/api/admin/dam/ad-versions/[id]/comments
  GET    - List frame comments
  POST   - Create comment

-- Asset Comments
/api/admin/dam/assets/[id]/comments
  GET    - List comments
  POST   - Create comment

/api/admin/dam/comments/[id]
  PATCH  - Update/resolve comment
  DELETE - Delete comment

-- Notifications
/api/admin/dam/notifications
  GET    - List notifications

/api/admin/dam/notifications/settings
  GET    - Get settings
  PUT    - Update settings

/api/admin/dam/notifications/[id]/read
  POST   - Mark as read

-- Exports
/api/admin/dam/export/tiktok
  POST   - Export to TikTok

/api/admin/dam/export/meta
  POST   - Export to Meta

/api/admin/dam/export/zip
  POST   - Create ZIP download
```

---

## Admin UI Components

```
apps/admin/src/app/admin/dam/
├── ad-review/
│   ├── page.tsx                # Projects list
│   ├── [id]/
│   │   └── page.tsx            # Project detail with versions
│   └── new/
│       └── page.tsx            # Create project
└── assets/
    └── [id]/
        └── versions/
            └── page.tsx        # Version history

apps/admin/src/components/admin/dam/
├── version-history.tsx         # Version list with restore
├── ad-review-board.tsx         # Kanban-style project board
├── review-panel.tsx            # Reviewer decision UI
├── frame-comment-overlay.tsx   # Comments on video timeline
├── annotation-tools.tsx        # Drawing tools
├── notification-feed.tsx       # Notification list
├── rights-status-badge.tsx     # Rights status indicator
├── expiry-calendar.tsx         # Rights expiry calendar
├── export-modal.tsx            # Export to platform UI
└── tiktok-account-manager.tsx  # TikTok account connections
```

---

## Constraints

- Version snapshots must preserve original file
- Review decisions are per-version, not per-project
- All reviewers must approve for project approval
- Notifications must not block main operations
- TikTok tokens expire frequently - handle refresh

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Review board, annotation tools, notification feed
- Context7 MCP: "tiktok marketing api"
- Context7 MCP: "meta graph api video upload"

**RAWDOG code to reference:**
- `src/lib/dam/versions.ts` - Version control
- `src/lib/dam/ad-review/` - Review workflow
- `src/lib/dam/comments.ts` - Comments
- `src/lib/dam/annotations.ts` - Annotations
- `src/lib/dam/notifications/` - Notification delivery
- `src/lib/dam/rights.ts` - Rights management
- `src/lib/dam/export-tiktok.ts` - TikTok export

---

## Tasks

### [PARALLEL] Database Layer
- [ ] Create version tables and CRUD
- [ ] Create ad review tables and CRUD
- [ ] Create comment/annotation tables
- [ ] Create notification tables

### [PARALLEL] Version Control
- [ ] Implement version snapshot creation
- [ ] Implement version restore
- [ ] Implement version pruning

### [PARALLEL] Ad Review Workflow
- [ ] Implement project management
- [ ] Implement version upload
- [ ] Implement review decision logic
- [ ] Implement consensus check

### [PARALLEL] Collaboration
- [ ] Implement asset comments
- [ ] Implement frame comments
- [ ] Implement annotations
- [ ] Implement @mention parsing

### [SEQUENTIAL after collaboration] Notifications
- [ ] Implement notification creation
- [ ] Implement email delivery
- [ ] Implement Slack integration
- [ ] Create notification preferences

### [PARALLEL] Rights Management
- [ ] Implement rights CRUD
- [ ] Implement expiry queries
- [ ] Create rights expiry job
- [ ] Implement bulk rights updates

### [PARALLEL] Exports
- [ ] Implement TikTok export
- [ ] Implement Meta export
- [ ] Implement ZIP download
- [ ] Track export history

### [SEQUENTIAL after all] API Routes
- [ ] Create version routes
- [ ] Create ad review routes
- [ ] Create comment routes
- [ ] Create notification routes
- [ ] Create export routes

### [SEQUENTIAL after API] Admin UI
- [ ] Create version history UI
- [ ] Create ad review board
- [ ] Create annotation tools
- [ ] Create notification feed
- [ ] Create export modal

---

## Definition of Done

- [ ] Versions can be created and restored
- [ ] Ad projects flow through review states
- [ ] Reviewers can approve/request changes
- [ ] Comments support @mentions with notifications
- [ ] Annotations display on video frames
- [ ] Rights expiry triggers alerts
- [ ] Assets export to TikTok successfully
- [ ] Assets export to Meta successfully
- [ ] Bulk ZIP download works
- [ ] All operations tenant-isolated
- [ ] `npx tsc --noEmit` passes
