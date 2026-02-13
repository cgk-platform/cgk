# @cgk-platform/video - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-11

---

## Purpose

Video hosting, streaming, and management using Mux. Provides multi-tenant video operations with direct uploads, HLS streaming, permissions, and analytics.

---

## Quick Reference

```typescript
import {
  createVideo,
  getVideos,
  createDirectUpload,
  getStreamUrl,
  getThumbnailUrl,
  checkVideoPermission,
  trackView,
  getVideoAnalytics,
} from '@cgk-platform/video'

// Create video and get upload URL
const { uploadUrl, uploadId } = await createDirectUpload({
  corsOrigin: '*',
  passthrough: JSON.stringify({ tenantId, videoId }),
})

// List videos with tenant isolation
const { rows, totalCount } = await getVideos(tenantId, userId, {
  limit: 20,
  search: 'tutorial',
})

// Get playback URLs
const streamUrl = getStreamUrl(video.muxPlaybackId)
const thumbnail = getThumbnailUrl(video.muxPlaybackId, { width: 400 })
```

---

## Key Patterns

### Pattern 1: Direct Upload Flow

**When to use**: User uploads a video from browser

```typescript
// 1. Server: Create video record and get upload URL
const video = await createVideo(tenantId, userId, {
  title: 'My Video',
  recordingType: 'upload',
})

const { uploadUrl, uploadId } = await createDirectUpload({
  corsOrigin: '*',
  passthrough: createPassthrough(tenantId, video.id),
})

// 2. Client: Upload directly to Mux
await fetch(uploadUrl, {
  method: 'PUT',
  body: videoFile,
  headers: { 'Content-Type': videoFile.type },
})

// 3. Mux sends webhooks -> video status updates automatically
```

### Pattern 2: Tenant-Isolated Queries (MANDATORY)

**When to use**: ALL video database operations

```typescript
import { getVideos, getVideo, withTenant } from '@cgk-platform/video'

// CORRECT - Functions handle tenant isolation internally
const videos = await getVideos(tenantId, userId, { limit: 20 })
const video = await getVideo(tenantId, videoId)

// WRONG - Direct SQL without tenant context
const videos = await sql`SELECT * FROM videos` // NO!
```

### Pattern 3: Permission Checking

**When to use**: Before granting access to a video

```typescript
import { checkVideoPermission } from '@cgk-platform/video'

const result = await checkVideoPermission(
  tenantId,
  videoId,
  { userId, email, isTeamMember: true },
  'viewer', // required permission level
  password, // optional password
)

if (!result.allowed) {
  if (result.passwordRequired) {
    // Prompt for password
  } else if (result.expired) {
    // Permission expired
  } else {
    // Access denied
  }
}
```

### Pattern 4: Webhook Handling

**When to use**: Processing Mux webhook events

```typescript
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookEvent,
} from '@cgk-platform/video'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('mux-signature')

  // Verify signature
  const { valid, error } = verifyWebhookSignature(body, signature)
  if (!valid) {
    return Response.json({ error }, { status: 401 })
  }

  const payload = parseWebhookPayload(body)

  await processWebhookEvent(payload, {
    onAssetReady: async (assetId, playbackId, duration) => {
      // Update video record
    },
    onAssetErrored: async (assetId, error) => {
      // Handle error
    },
  })

  return Response.json({ received: true })
}
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `types.ts` | Type definitions | Video, VideoFolder, VideoPermission, etc. |
| `schema.ts` | SQL schemas | VIDEO_MIGRATION_SQL |
| `db.ts` | Database CRUD | getVideo, createVideo, updateVideo |
| `mux/client.ts` | Mux API client | getMuxClient, isMuxConfigured |
| `mux/uploads.ts` | Direct uploads | createDirectUpload, getUploadStatus |
| `mux/assets.ts` | Asset management | getAsset, deleteAsset |
| `mux/playback.ts` | URL generation | getStreamUrl, getThumbnailUrl |
| `mux/webhooks.ts` | Webhook handling | verifyWebhookSignature, processWebhookEvent |
| `permissions/` | Access control | checkVideoPermission, createPermission |
| `analytics/` | View tracking | trackView, getVideoAnalytics |

---

## Environment Variables

```bash
# Required for Mux
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_webhook_signing_secret

# Optional
MUX_TEST_MODE=true  # Use Mux test mode
```

---

## Exports Reference

### Video CRUD

```typescript
getVideo(tenantId, videoId): Promise<Video | null>
getVideos(tenantId, userId, options): Promise<PaginatedResult<Video>>
createVideo(tenantId, userId, input, muxUploadId?): Promise<Video>
updateVideo(tenantId, videoId, input): Promise<Video | null>
deleteVideo(tenantId, videoId): Promise<boolean>
```

### Folder CRUD

```typescript
getFolder(tenantId, folderId): Promise<VideoFolder | null>
getFolders(tenantId, userId, parentId?): Promise<VideoFolder[]>
getAllFolders(tenantId, userId): Promise<VideoFolder[]>
createFolder(tenantId, userId, input): Promise<VideoFolder>
updateFolder(tenantId, folderId, input): Promise<VideoFolder | null>
deleteFolder(tenantId, folderId): Promise<boolean>
```

### Mux Integration

```typescript
// Client
getMuxClient(): Mux
isMuxConfigured(): boolean

// Uploads
createDirectUpload(options): Promise<DirectUploadResult>
cancelDirectUpload(uploadId): Promise<void>
getUploadStatus(uploadId): Promise<UploadStatus>

// Assets
getAsset(assetId): Promise<MuxAssetInfo>
deleteAsset(assetId): Promise<void>

// Playback URLs
getStreamUrl(playbackId): string
getThumbnailUrl(playbackId, options?): string
getAnimatedThumbnailUrl(playbackId, options?): string
getStoryboardUrl(playbackId, options?): string
```

### Permissions

```typescript
checkVideoPermission(tenantId, videoId, user, level?, password?): Promise<PermissionCheckResult>
createPermission(tenantId, videoId, input): Promise<VideoPermission>
deletePermission(tenantId, permissionId): Promise<boolean>
```

### Analytics

```typescript
trackView(tenantId, videoId, userId, input): Promise<VideoView>
getVideoAnalytics(tenantId, videoId): Promise<VideoAnalytics>
getViewsOverTime(tenantId, videoId, options): Promise<ViewData[]>
```

---

## Common Gotchas

### 1. Always pass tenantId to database functions

```typescript
// WRONG
const video = await getVideo(videoId)

// CORRECT
const video = await getVideo(tenantId, videoId)
```

### 2. Use passthrough for webhook identification

```typescript
// Include tenant and video info in passthrough
const { uploadUrl } = await createDirectUpload({
  passthrough: createPassthrough(tenantId, videoId),
})
```

### 3. Verify webhook signatures

```typescript
// WRONG - No signature verification
const payload = JSON.parse(body)

// CORRECT - Always verify
const { valid } = verifyWebhookSignature(body, signature)
if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 401 })
```

### 4. Handle all video statuses

```typescript
// Video statuses: 'uploading' | 'processing' | 'ready' | 'error' | 'deleted'
if (video.status !== 'ready') {
  // Don't try to play the video
}
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@mux/mux-node` | Mux API SDK |
| `@cgk-platform/db` | Database and tenant isolation |
| `@cgk-platform/core` | Shared types |

---

## Integration Points

### Used by:
- `apps/admin` - Video library UI
- `apps/creator-portal` - Video recording
- Background jobs - Webhook processing

### Uses:
- `@cgk-platform/db` - Database operations
- `@cgk-platform/jobs` - Background processing
- Mux API - Video hosting
- AssemblyAI API - Transcription
- Anthropic Claude API - AI content

---

## Transcription Module

### Quick Reference

```typescript
import {
  getTranscriptionProvider,
  saveTranscriptionResult,
  generateCaptions,
} from '@cgk-platform/video/transcription'

import {
  generateAITitle,
  generateAISummary,
  extractTasks,
} from '@cgk-platform/video/ai'
```

### Transcription Pattern

```typescript
// 1. Start transcription
const provider = getTranscriptionProvider()
const job = await provider.transcribe(mp4Url, {
  speakerDiarization: true,
  autoChapters: true,
  detectFillers: true,
  webhookUrl: '/api/v1/webhooks/assemblyai',
})
await startTranscription(tenantId, videoId, job.id)

// 2. Handle webhook or poll for result
const result = await provider.getResult(job.id)
await saveTranscriptionResult(tenantId, videoId, result.text, result.words, result.chapters)

// 3. Generate AI content
const [title, summary, tasks] = await Promise.all([
  generateAITitle(result.text),
  generateAISummary(result.text),
  extractTasks(result.text),
])
await saveAIContent(tenantId, videoId, { title, summary, tasks })
```

### Export Captions

```typescript
import { generateCaptions, getCaptionContentType } from '@cgk-platform/video/transcription'

const vtt = generateCaptions(words, { format: 'vtt' })
const srt = generateCaptions(words, { format: 'srt' })
```

### Search Transcripts

```typescript
import { searchVideosByTranscript } from '@cgk-platform/video/transcription'

const results = await searchVideosByTranscript(tenantId, 'search term', 20, 0)
```

### Transcription Environment Variables

```bash
# Required
ASSEMBLYAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx

# Optional
ASSEMBLYAI_WEBHOOK_SECRET=xxx
TRANSCRIPTION_PROVIDER=assemblyai  # Default
```

### Transcription Types

```typescript
interface TranscriptionWord {
  text: string
  startMs: number
  endMs: number
  confidence: number
  speaker?: string
  isFiller?: boolean
}

interface TranscriptionChapter {
  headline: string
  summary: string
  startMs: number
  endMs: number
}

interface AITask {
  text: string
  timestampSeconds?: number
  completed: boolean
}
```
