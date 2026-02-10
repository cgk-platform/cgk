# PHASE-3E: Video Creator Tools

**Duration**: 1 week (Week 16)
**Depends On**: PHASE-3E-VIDEO-CORE, PHASE-4A (Creator Portal)
**Parallel With**: PHASE-3F (DAM)
**Blocks**: None (optional enhancement)

---

## Goal

Implement creator-facing video tools including teleprompter for scripted recording, video trimming/editing, CTA button overlays, comments with timestamps, reactions, and real-time video status updates via Server-Sent Events.

---

## Success Criteria

- [ ] Teleprompter tool for scripted recording
- [ ] Video trimming (create clips from existing video)
- [ ] CTA button overlays (configurable position, style, link)
- [ ] Timestamped comments with reply threading
- [ ] Emoji reactions at specific timestamps
- [ ] Real-time status updates via SSE
- [ ] Creator-friendly recording interface

---

## Deliverables

### Package Extension (`packages/video/creator-tools`)

```
packages/video/
├── src/
│   ├── creator-tools/
│   │   ├── teleprompter/
│   │   │   ├── types.ts       # Script, TeleprompterSettings
│   │   │   └── db.ts          # Script storage
│   │   ├── trim/
│   │   │   ├── types.ts       # TrimRequest, TrimResult
│   │   │   └── mux.ts         # Mux clip creation
│   │   ├── cta/
│   │   │   ├── types.ts       # CTAButton, Position, Style
│   │   │   ├── db.ts          # CTA CRUD
│   │   │   └── validation.ts  # Button validation
│   │   └── sse/
│   │       └── events.ts      # SSE event stream handler
│   ├── interactions/
│   │   ├── comments/
│   │   │   ├── types.ts       # Comment, Reply
│   │   │   └── db.ts          # Comments CRUD
│   │   └── reactions/
│   │       ├── types.ts       # Reaction, EmojiCount
│   │       └── db.ts          # Reactions CRUD
│   └── ...existing
```

### Database Schema Extensions

```sql
-- Teleprompter scripts
CREATE TABLE video_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,        -- Script content
  scroll_speed INTEGER DEFAULT 3,
  font_size INTEGER DEFAULT 32,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CTA Buttons on videos
CREATE TABLE video_cta_buttons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  style TEXT DEFAULT 'primary' CHECK (style IN ('primary', 'secondary', 'outline')),
  position TEXT DEFAULT 'end' CHECK (position IN ('start', 'end', 'overlay')),
  show_at_seconds INTEGER,      -- For overlay position
  hide_at_seconds INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Timestamped comments
CREATE TABLE video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar_url TEXT,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER,    -- Video timestamp for comment
  parent_id UUID REFERENCES video_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Emoji reactions
CREATE TABLE video_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,          -- e.g., "👍", "🎉", "❤️"
  timestamp_seconds INTEGER,    -- Video timestamp for reaction
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, video_id, user_id, emoji, timestamp_seconds)
);

-- Indexes
CREATE INDEX idx_video_scripts_user ON video_scripts(tenant_id, user_id);
CREATE INDEX idx_video_cta_video ON video_cta_buttons(video_id);
CREATE INDEX idx_video_comments_video ON video_comments(video_id, created_at);
CREATE INDEX idx_video_comments_parent ON video_comments(parent_id);
CREATE INDEX idx_video_reactions_video ON video_reactions(video_id);
```

### API Routes

```
-- Teleprompter
/api/v1/scripts
  GET    - List user's scripts
  POST   - Create script

/api/v1/scripts/[id]
  GET    - Get script
  PATCH  - Update script
  DELETE - Delete script

-- CTA Buttons
/api/v1/videos/[id]/cta
  GET    - Get CTA buttons for video
  PUT    - Replace all CTA buttons

-- Comments
/api/v1/videos/[id]/comments
  GET    - List comments (with replies)
  POST   - Create comment

/api/v1/videos/[id]/comments/[cid]
  PATCH  - Update comment
  DELETE - Delete comment

-- Reactions
/api/v1/videos/[id]/reactions
  GET    - Get reactions with counts
  POST   - Add reaction
  DELETE - Remove reaction

-- Trimming
/api/v1/videos/[id]/trim
  POST   - Create trimmed clip

-- Real-time status
/api/v1/videos/[id]/events
  GET    - SSE stream for status updates
```

### UI Components

```
apps/admin/src/components/admin/videos/
├── teleprompter/
│   ├── teleprompter.tsx        # Full teleprompter interface
│   ├── script-editor.tsx       # Script editing
│   ├── script-display.tsx      # Auto-scrolling display
│   └── teleprompter-settings.tsx  # Speed, font size
├── cta-editor.tsx              # CTA button management
├── trim-modal.tsx              # Video trimming interface
├── comments-section.tsx        # Comments list with replies
├── comment-input.tsx           # Add comment at timestamp
├── reactions-bar.tsx           # Emoji reactions overlay
└── status-indicator.tsx        # Real-time status from SSE

apps/creator/src/components/
├── recording-interface.tsx     # Camera/screen recording
├── teleprompter-overlay.tsx    # Teleprompter during recording
└── video-preview.tsx           # Preview before upload
```

---

## Teleprompter Implementation

### Script Structure

```typescript
interface TeleprompterScript {
  id: string
  tenantId: string
  userId: string
  title: string
  content: string           // Full script text
  scrollSpeed: number       // 1-10 scale
  fontSize: number          // pixels
  createdAt: Date
  updatedAt: Date
}

interface TeleprompterSettings {
  scrollSpeed: number
  fontSize: number
  backgroundColor: string
  textColor: string
  mirrorMode: boolean       // Flip for reflection teleprompters
  showProgress: boolean     // Progress indicator
}
```

### Recording Flow

```
1. Creator selects/creates script
2. Opens recording interface with teleprompter overlay
3. Teleprompter scrolls script at configured speed
4. User records video (camera, screen, or both)
5. Recording uploaded to Mux
6. Video associated with script for reference
```

---

## Video Trimming (Mux Clip Creation)

### Trim Request

```typescript
interface TrimRequest {
  startTime: number    // Start in seconds
  endTime: number      // End in seconds
  saveAsNew: boolean   // Create new video vs replace
  newTitle?: string    // Title for new clip
}

interface TrimResult {
  success: boolean
  newVideoId?: string      // If saveAsNew
  newMuxAssetId: string
  duration: number
}
```

### Implementation

```typescript
// Uses Mux input with clip specification
const newAsset = await mux.assets.create({
  input: `mux://assets/${originalAssetId}`,
  inputSettings: {
    startTime: request.startTime,
    endTime: request.endTime,
  },
  playbackPolicy: ['public'],
  mp4Support: 'capped-1080p',
})
```

---

## CTA Buttons

### Button Configuration

```typescript
interface CTAButton {
  id: string
  label: string
  url: string
  style: 'primary' | 'secondary' | 'outline'
  position: 'start' | 'end' | 'overlay'
  showAtSeconds?: number     // For overlay
  hideAtSeconds?: number
  sortOrder: number
}

// Validation
const CTA_VALIDATION = {
  maxButtons: 3,
  maxLabelLength: 50,
  urlPattern: /^https?:\/\//,
  allowedStyles: ['primary', 'secondary', 'outline'],
  allowedPositions: ['start', 'end', 'overlay'],
}
```

### Display Logic

- **start**: Show before video plays
- **end**: Show after video completes
- **overlay**: Show during playback at specified time range

---

## Comments & Reactions

### Comment Threading

```typescript
interface VideoComment {
  id: string
  videoId: string
  userId: string
  userName: string
  userAvatarUrl?: string
  content: string
  timestampSeconds?: number   // Click to seek to this time
  parentId?: string           // For replies
  replies?: VideoComment[]    // Nested when fetching
  createdAt: Date
  updatedAt: Date
}
```

### Reaction Aggregation

```typescript
interface ReactionSummary {
  emoji: string
  count: number
  users: Array<{ userId: string; userName: string }>
  hasReacted: boolean        // Current user's reaction
}

// Aggregate reactions by emoji
SELECT emoji, COUNT(*) as count, array_agg(user_id) as user_ids
FROM video_reactions
WHERE video_id = $1
GROUP BY emoji
ORDER BY count DESC
```

---

## Server-Sent Events (Real-time Status)

### SSE Implementation

```typescript
// GET /api/v1/videos/[id]/events
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

      let lastStatus = null
      const interval = setInterval(async () => {
        const video = await getVideo(params.id)

        if (video.status !== lastStatus) {
          lastStatus = video.status
          controller.enqueue(`data: ${JSON.stringify({
            type: 'status',
            status: video.status,
            transcriptionStatus: video.transcriptionStatus,
            video,
          })}\n\n`)
        }

        if (video.status === 'ready' && video.transcriptionStatus === 'completed') {
          controller.enqueue(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
          clearInterval(interval)
          controller.close()
        }
      }, 2000)

      // Timeout after 10 minutes
      setTimeout(() => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'timeout' })}\n\n`)
        clearInterval(interval)
        controller.close()
      }, 600000)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

---

## Constraints

- Teleprompter must work with recording interface
- Trim creates NEW Mux asset (preserves original)
- Max 3 CTA buttons per video
- Comments require permission (commenter or higher)
- SSE stream has 10-minute timeout
- All operations tenant-isolated

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Teleprompter, comments section, reactions bar
- Context7 MCP: "web mediarecorder api"
- Context7 MCP: "server sent events nextjs"

**RAWDOG code to reference:**
- `src/lib/video/services/mux/trim.ts` - Trimming implementation
- `src/app/api/v1/videos/[id]/cta/route.ts` - CTA API
- `src/app/api/v1/videos/[id]/comments/route.ts` - Comments API
- `src/app/api/v1/videos/[id]/events/route.ts` - SSE implementation
- `src/components/video/Teleprompter/` - Teleprompter UI

---

## AI Discretion Areas

1. Teleprompter scroll algorithm (linear vs adaptive)
2. Recording interface design (pip, side-by-side, overlay)
3. Comment display (inline vs sidebar)
4. Reaction emoji set (fixed vs custom)
5. SSE polling interval (2s default)

---

## Tasks

### [PARALLEL] Database Layer
- [ ] Create `video_scripts` table and CRUD
- [ ] Create `video_cta_buttons` table and CRUD
- [ ] Create `video_comments` table and CRUD
- [ ] Create `video_reactions` table and CRUD

### [PARALLEL] Teleprompter
- [ ] Create script types and validation
- [ ] Create teleprompter component with auto-scroll
- [ ] Create script editor with settings
- [ ] Implement recording interface integration

### [PARALLEL] Trimming
- [ ] Create trim request types
- [ ] Implement Mux clip creation
- [ ] Create trim modal UI

### [PARALLEL] CTA Buttons
- [ ] Create CTA types and validation
- [ ] Implement CTA API routes
- [ ] Create CTA editor component
- [ ] Create CTA overlay component

### [SEQUENTIAL after database] Comments & Reactions
- [ ] Create comment API routes
- [ ] Create reaction API routes
- [ ] Create comments section with threading
- [ ] Create reactions bar with emoji picker

### [SEQUENTIAL after database] SSE
- [ ] Create SSE endpoint
- [ ] Create status indicator component
- [ ] Integrate with upload modal

---

## Definition of Done

- [ ] Teleprompter scrolls script during recording
- [ ] Scripts can be created, saved, and reused
- [ ] Videos can be trimmed to create clips
- [ ] CTA buttons display at configured positions
- [ ] Comments support timestamps and replies
- [ ] Reactions aggregate by emoji
- [ ] SSE streams real-time status updates
- [ ] All operations tenant-isolated
- [ ] `npx tsc --noEmit` passes
