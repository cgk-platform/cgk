# PHASE-3E: Video Transcription & AI Content

**Duration**: 1 week (Week 15-16)
**Depends On**: PHASE-3E-VIDEO-CORE, PHASE-5A (Jobs Setup)
**Parallel With**: PHASE-3F (DAM)
**Blocks**: None (optional enhancement)

---

## Goal

Add automatic transcription to videos using AssemblyAI, with word-level timestamps, speaker diarization, and AI-generated content (titles, summaries, chapters, action items). Enable transcript search and interactive transcript viewing.

---

## Success Criteria

- [ ] Videos automatically transcribed after MP4 ready
- [ ] Word-level timestamps with speaker identification
- [ ] Auto-generated chapters from AssemblyAI
- [ ] AI-generated titles and summaries (Claude)
- [ ] Action item extraction from transcripts
- [ ] Transcript search across videos
- [ ] Interactive transcript viewer (click to seek)
- [ ] Retry handling for failed transcriptions

---

## Deliverables

### Package Extension (`packages/video/transcription`)

```
packages/video/
├── src/
│   ├── transcription/
│   │   ├── types.ts           # TranscriptionWord, TranscriptionChapter
│   │   ├── providers/
│   │   │   ├── interface.ts   # ITranscriptionProvider
│   │   │   ├── assemblyai.ts  # Primary provider
│   │   │   ├── deepgram.ts    # Alternative (optional)
│   │   │   └── factory.ts     # Provider selection
│   │   ├── db.ts              # Transcription storage
│   │   └── webhooks.ts        # AssemblyAI webhook handling
│   ├── ai/
│   │   ├── client.ts          # Claude API client
│   │   ├── title.ts           # Title generation
│   │   ├── summary.ts         # Summary generation
│   │   ├── tasks.ts           # Action item extraction
│   │   └── chapters.ts        # Chapter enhancement
│   └── ...existing
```

### Database Schema Extensions

```sql
-- Add to videos table
ALTER TABLE videos ADD COLUMN
  transcription_status TEXT DEFAULT 'pending'
    CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_job_id TEXT,
  transcription_text TEXT,
  transcription_words JSONB,        -- Array of TranscriptionWord
  ai_title TEXT,
  ai_summary TEXT,
  ai_chapters JSONB,                -- Array of chapter objects
  ai_tasks JSONB;                   -- Array of action items

-- Update search vector to include transcript
ALTER TABLE videos DROP COLUMN search_vector;
ALTER TABLE videos ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(transcription_text, '')
  )
) STORED;

-- Index for transcription status queries
CREATE INDEX idx_videos_transcription_status
  ON videos(tenant_id, transcription_status);
```

### Background Jobs (Trigger.dev v4 Tasks)

```typescript
// video-transcription task
export const videoTranscriptionTask = task({
  id: 'video-transcription',
  maxDuration: 900,  // 15 minutes
  retry: { maxAttempts: 3 },
  run: async (payload: { tenantId: string; videoId: string; playbackId: string }) => {
    // 1. Download MP4 from Mux
    // 2. Upload to AssemblyAI
    // 3. Start transcription job
    // 4. Save job ID
    // Return: { videoId, transcriptionJobId }
  }
})

// ai-content-generation task
export const aiContentTask = task({
  id: 'ai-content-generation',
  maxDuration: 120,  // 2 minutes
  retry: { maxAttempts: 2 },
  run: async (payload: { tenantId: string; videoId: string; transcript: string }) => {
    // Parallel:
    // - generateAITitle()
    // - generateAISummary()
    // - extractTasks()
    // Save all to video record
  }
})

// video-sync-schedule (fallback polling)
export const videoSyncSchedule = schedules.task({
  id: 'video-sync-schedule',
  cron: '*/2 * * * *',  // Every 2 minutes
  run: async () => {
    // Find "stuck" videos and sync status
    // Handles webhook failures gracefully
  }
})
```

### API Routes

```
/api/v1/videos/[id]/transcribe
  POST   - Manually trigger transcription (retry)

/api/v1/videos/[id]/transcript
  GET    - Get transcript with words and timestamps

/api/v1/webhooks/assemblyai
  POST   - Handle transcription completion/failure
```

### UI Components

```
apps/admin/src/components/admin/videos/
├── transcript-viewer.tsx       # Interactive transcript with seek
├── transcript-search.tsx       # Search within transcript
├── ai-summary-card.tsx         # Display generated summary
├── ai-tasks-list.tsx           # Action items with checkboxes
├── chapters-timeline.tsx       # Visual chapter navigation
└── transcription-status.tsx    # Status badge with retry button
```

---

## Transcription Pipeline

### Trigger Flow

```
Mux: video.asset.static_renditions.ready
  ↓
Trigger: video-transcription task
  ↓
1. Download MP4 from Mux CDN
2. Upload to AssemblyAI
3. Start job with options:
   - speaker_diarization: true
   - auto_chapters: true
   - filter_profanity: false
   - webhook_url: /api/v1/webhooks/assemblyai
4. Save job_id, set status='processing'
  ↓
AssemblyAI: webhook callback (completed/error)
  ↓
1. Fetch full result
2. Parse words, chapters, speakers
3. Save to video record
4. Trigger: ai-content-generation task
  ↓
AI Generation (Claude):
  - generateAITitle() → ai_title
  - generateAISummary() → ai_summary
  - extractTasks() → ai_tasks
```

### AssemblyAI Integration

```typescript
interface ITranscriptionProvider {
  name: string
  transcribe(audioUrl: string, options?: TranscribeOptions): Promise<TranscriptionJob>
  getStatus(jobId: string): Promise<TranscriptionJobStatus>
  getResult(jobId: string): Promise<TranscriptionResult>
  uploadFile?(buffer: Buffer): Promise<string>  // For providers needing upload
}

// AssemblyAI-specific options
interface AssemblyAIOptions {
  speakerDiarization?: boolean     // Identify different speakers
  autoChapters?: boolean           // Auto-generate chapter markers
  filterProfanity?: boolean        // Mask profanity
  webhookUrl?: string              // Callback URL
}
```

### TranscriptionWord Structure

```typescript
interface TranscriptionWord {
  text: string
  startMs: number      // Milliseconds from video start
  endMs: number
  confidence: number   // 0-1
  speaker?: string     // "Speaker 1", "Speaker 2"
  isFiller?: boolean   // true for "um", "uh", "like"
}

interface TranscriptionChapter {
  headline: string
  summary: string
  startMs: number
  endMs: number
}

interface TranscriptionResult {
  text: string                       // Full transcript
  words: TranscriptionWord[]
  chapters?: TranscriptionChapter[]
  speakers?: string[]                // Unique speaker labels
  durationMs: number
  confidence: number
}
```

---

## AI Content Generation (Claude)

### Title Generation
- Input: First 3000 chars of transcript
- Output: 5-10 word descriptive title
- Settings: `maxTokens=64, temperature=0.6`

### Summary Generation
- Input: First 10000 chars of transcript
- Output: 2-3 sentence executive summary
- Settings: `maxTokens=256, temperature=0.5`

### Task Extraction
- Input: Full transcript
- Output: Array of action items with optional timestamps
- Settings: `maxTokens=512, temperature=0.3`

```typescript
interface AITask {
  text: string
  timestampSeconds?: number
  completed: boolean
}
```

---

## Constraints

- AssemblyAI requires MP4 URL (hence `capped-1080p` Mux setting)
- Transcription is async - use webhooks + fallback polling
- AI generation uses Claude Haiku for cost efficiency
- Must handle webhook failures gracefully (sync schedule)
- Tenant isolation for all transcription queries

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Transcript viewer with seek, AI summary cards
- Context7 MCP: "assemblyai transcription nodejs"

**RAWDOG code to reference:**
- `src/lib/video/services/transcription/` - Provider patterns
- `src/lib/video/services/ai/` - Claude integration
- `src/trigger/video-transcription.ts` - Background task
- `src/app/api/v1/webhooks/assemblyai/route.ts` - Webhook handler

---

## AI Discretion Areas

1. Transcription provider selection (AssemblyAI vs Deepgram vs Gladia)
2. AI model for content generation (Claude Haiku vs Sonnet)
3. Retry policies for failed transcriptions
4. Sync schedule frequency (every 2 min default)
5. Transcript viewer interaction design

---

## Tasks

### [PARALLEL] Provider Implementation
- [ ] Create `ITranscriptionProvider` interface
- [ ] Implement AssemblyAI provider
- [ ] Implement provider factory with env-based selection
- [ ] Add webhook signature verification

### [PARALLEL] Database Layer
- [ ] Add transcription columns to videos table
- [ ] Update search vector to include transcript
- [ ] Create transcription query functions

### [PARALLEL] AI Generation
- [ ] Create Claude client wrapper
- [ ] Implement `generateAITitle()`
- [ ] Implement `generateAISummary()`
- [ ] Implement `extractTasks()`

### [SEQUENTIAL after providers] Background Tasks
- [ ] Create `video-transcription` task
- [ ] Create `ai-content-generation` task
- [ ] Create `video-sync-schedule` task
- [ ] Ensure all tasks include tenantId

### [SEQUENTIAL after tasks] API Routes
- [ ] Create `/api/v1/videos/[id]/transcribe` route
- [ ] Create `/api/v1/videos/[id]/transcript` route
- [ ] Create `/api/v1/webhooks/assemblyai` route

### [SEQUENTIAL after API] UI Components
- [ ] Create transcript viewer with clickable words
- [ ] Create AI summary display card
- [ ] Create AI tasks list with completion toggles
- [ ] Create chapters timeline navigation
- [ ] Create transcription status badge with retry

---

## Definition of Done

- [ ] Videos auto-transcribed after MP4 ready
- [ ] Word timestamps allow click-to-seek
- [ ] Speaker diarization identifies different speakers
- [ ] AI title suggestions generated
- [ ] AI summary generated automatically
- [ ] Action items extracted and displayed
- [ ] Chapters displayed as timeline markers
- [ ] Failed transcriptions can be retried
- [ ] Sync schedule recovers stuck jobs
- [ ] Transcript searchable via video search
- [ ] `npx tsc --noEmit` passes
