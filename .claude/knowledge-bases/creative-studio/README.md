# Creative Studio — Knowledge Base

This is the single source of truth for the Creative Studio feature. Reference this before implementing any video editor, scene management, caption, or render-related code.

---

## Architecture Overview

The Creative Studio is the CGK admin UI for the openCLAW video-editor agent (Reel). It provides real-time project editing with drag-and-drop scenes, per-word caption editing, and SSE-driven activity updates from the agent pipeline.

**Location in codebase:**

- UI: `apps/admin/src/app/admin/creative-studio/`
- Backend package: `packages/video-editor/`
- Shared lib: `apps/admin/src/lib/openclaw-gateway.ts`
- API key auth: `apps/admin/src/lib/api-key-auth.ts`

**Three main views:**

1. Project List — browse/create projects
2. Project Editor — scene timeline, captions, render preview
3. Clip Library — browse DAM assets for scene assignment

**Integration model:** openCLAW agent (Reel) drives the workflow. The agent syncs project state to the platform via REST API using a tenant API key. The UI is read/display + limited edit (captions, scene reorder, clip swap, render request).

---

## Database Tables (tenant schema)

All tables live in the `tenant_{slug}` schema. Access via `withTenant(slug)` — never query directly.

### `video_editor_projects`

| Column              | Type        | Notes                            |
| ------------------- | ----------- | -------------------------------- |
| id                  | TEXT (UUID) | Primary key                      |
| name                | TEXT        | Project display name             |
| status              | TEXT        | See status flow below            |
| mode                | TEXT        | e.g. `ugc`, `brand`              |
| aspect_ratio        | TEXT        | e.g. `9:16`, `16:9`              |
| voiceover           | TEXT        | Vercel Blob URL                  |
| render_url          | TEXT        | Vercel Blob URL for final render |
| openclaw_session_id | TEXT        | Reel agent session ID            |
| openclaw_profile    | TEXT        | `cgk`, `rawdog`, `vitahustle`    |
| created_at          | TIMESTAMPTZ |                                  |
| updated_at          | TIMESTAMPTZ |                                  |

### `video_editor_scenes`

| Column        | Type        | Notes                                       |
| ------------- | ----------- | ------------------------------------------- |
| id            | TEXT (UUID) | Primary key                                 |
| project_id    | TEXT        | FK to video_editor_projects                 |
| scene_number  | INTEGER     | Logical ordering                            |
| role          | TEXT        | e.g. `hook`, `problem`, `solution`, `cta`   |
| footage_hint  | TEXT        | Agent-provided clip description             |
| duration      | INTEGER     | Duration in milliseconds                    |
| clip_asset_id | TEXT        | FK to dam_assets                            |
| sort_order    | INTEGER     | Current display order (mutable via reorder) |

### `video_editor_captions`

| Column     | Type        | Notes                                        |
| ---------- | ----------- | -------------------------------------------- |
| id         | TEXT (UUID) | Primary key                                  |
| project_id | TEXT        | FK to video_editor_projects                  |
| word       | TEXT        | Single word                                  |
| start_time | NUMERIC     | Start time in seconds (float)                |
| end_time   | NUMERIC     | End time in seconds (float)                  |
| sort_order | INTEGER     | Word sequence                                |
| is_edited  | BOOLEAN     | TRUE = user has edited, preserved on re-sync |

### `video_editor_renders`

| Column          | Type        | Notes                       |
| --------------- | ----------- | --------------------------- |
| id              | TEXT (UUID) | Primary key                 |
| project_id      | TEXT        | FK to video_editor_projects |
| render_url      | TEXT        | Vercel Blob URL             |
| file_size_bytes | INTEGER     |                             |
| rendered_at     | TIMESTAMPTZ |                             |

### `video_editor_activity`

| Column     | Type        | Notes                                                       |
| ---------- | ----------- | ----------------------------------------------------------- |
| id         | TEXT (UUID) | Primary key                                                 |
| project_id | TEXT        | FK to video_editor_projects                                 |
| source     | TEXT        | `agent` or `user`                                           |
| action     | TEXT        | e.g. `project_synced`, `render_completed`, `caption_edited` |
| data       | JSONB       | Action-specific payload                                     |
| created_at | TIMESTAMPTZ | Used for SSE polling                                        |

### `dam_assets` (existing DAM table, read-only from video editor)

Used to look up clip metadata and Mux playback IDs for scene clips.

### `dam_clip_segments` (existing DAM table, read-only from video editor)

Contains `quality_score` for clip ranking in the Clip Library view.

---

## API Routes

All routes under `apps/admin/src/app/api/admin/video-editor/`.

### Agent-facing routes (API key auth via `validateTenantApiKey`)

#### `POST /api/admin/video-editor/projects/sync`

Agent syncs the full project state. Calls `syncProject()` from `@cgk-platform/video-editor`. Returns `{ projectId, isNew }`.

Request body: full project JSON including scenes array and captions per scene.

#### `POST /api/admin/video-editor/projects/upload`

Multipart file upload for renders, voiceovers, and background music. Stores in Vercel Blob (500MB max). Updates the project record with the Blob URL. Returns `{ blobUrl, type, projectId }`.

Form data fields: `projectId`, `type` (`render` | `voiceover` | `music`), `file`

#### `GET /api/admin/video-editor/projects/pull-edits?sessionId=xxx`

Agent-facing endpoint: returns user-edited captions and scene reorder state for a given session. Called by the agent before rendering to incorporate Creative Studio edits. Returns `{ sessionId, projectId, editedCaptions, sceneOrder, hasEdits }`.

### User-facing routes (session auth via `requireAuth`)

#### `GET /api/admin/video-editor/projects/[id]`

Get full project details including scenes, captions, and recent activity.

#### `GET /api/admin/video-editor/projects/[id]/events`

SSE stream. Polls `video_editor_activity` for new rows since last event. Client reconnects with exponential backoff (1s to 30s cap).

SSE event format:

```
event: activity
data: {"action":"project_synced","source":"agent","data":{...},"created_at":"..."}
```

Field names are snake_case (`created_at`, not `createdAt`).

#### `POST /api/admin/video-editor/projects/[id]/scenes/reorder`

Batch reorder scenes. Accepts `[{ sceneId, sortOrder }]`. Uses PostgreSQL `unnest()` for a single-query batch update instead of N+1 loops.

All `sceneId` values are UUID-validated before the query (SQL injection prevention).

#### `PATCH /api/admin/video-editor/projects/[id]/captions`

Update edited caption words. Accepts `[{ captionId, word }]`. Sets `is_edited = TRUE` on updated rows. UUID-validated inputs.

#### `POST /api/admin/video-editor/projects/[id]/scenes/[sceneId]/clip`

Swap the clip on a scene. Body: `{ clipAssetId }`. Validates that the DAM asset belongs to the same tenant.

#### `POST /api/admin/video-editor/projects/[id]/render-request`

User requests re-render or final delivery. Body: `{ type: 'render' | 'deliver' }`. Pushes a task to the openCLAW gateway via `pushToGateway()`.

---

## Package: `@cgk-platform/video-editor`

Located at `packages/video-editor/`. Contains all DB logic for the video editor feature.

**Import path:** `@cgk-platform/video-editor/server` (server-only, never import in client components)

### Key exports

#### `syncProject(params, db)`

Upserts the full project including all scenes and captions.

- Scenes: upserted ON CONFLICT (project_id, scene_number)
- Captions: upserted ON CONFLICT (scene_id, sort_order), but rows with `is_edited = TRUE` have their `word` preserved
- Returns `SyncProjectResult: { project, isNew }` — uses PostgreSQL xmax trick to detect insert vs update

#### `createRenderRecord(params, db)`

Inserts a row in `video_editor_renders` and updates `projects.render_url`.

#### `streamActivity(projectId, sinceId, db)`

Returns new activity rows since a given activity ID. Used by the SSE route.

**Pattern note:** Package functions call `withTenant()` internally — route handlers pass the tenant slug, and the package function wraps its queries in `withTenant(tenantId, ...)`. The route handler does NOT need to wrap the call.

---

## Shared Modules

### `apps/admin/src/lib/openclaw-gateway.ts`

Provides `getGatewayConfig(tenantId)` and `pushToGateway(tenantId, payload)`.

`pushToGateway` sends a task to the openCLAW REST gateway (port 18789 for CGK). Used when the user triggers a re-render or delivery request from the UI. The gateway routes the task to the Reel agent session.

### `apps/admin/src/lib/api-key-auth.ts`

`validateTenantApiKey(request)` — validates the `x-api-key` header against the `tenant_api_keys` table. Returns `{ tenantId, tenantSlug }` or `null`. Used on all agent-facing sync, upload, and pull-edits routes.

---

## UI Components

### `project-editor-client.tsx`

The main client component for the Project Editor view.

**Scene timeline:**

- Drag-and-drop reorder using `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- Reorder triggers `POST .../scenes/reorder` — optimistic UI update, rollback on error

**Captions panel:**

- Per-word editing — click a word to edit inline
- Save/cancel buttons per word
- Edited words shown with visual indicator
- Saves via `PATCH .../captions`

**Video preview:**

- Mux Player for DAM clip previews (Mux playback IDs)
- Vercel Blob URLs for render previews (standard `<video>` tag)

**Voiceover player:**

- HTTP URL audio player (Vercel Blob URL from `voiceover` field)
- Only renders when `project.voiceover` is populated

**SSE activity feed:**

- Connects to `GET .../events`
- Exponential backoff on disconnect: 1s, 2s, 4s, 8s, 16s, 30s (capped)
- Auto-refreshes project data on `project_synced` and `render_completed` events
- Shows live activity log (source badge: agent/user, action label, timestamp)

**Re-render and Deliver buttons:**

- POST to `render-request` with type `render` or `deliver`
- Loading spinner state during request
- Disabled when project status does not allow the action

---

## Project Status Flow

```
draft -> storyboarding -> producing -> rendering -> rendered -> delivered -> archived
```

Status is set by the agent via the sync endpoint. The UI displays the current status and enables/disables actions based on it:

- Re-render button: enabled when status is `rendered` or `delivered`
- Deliver button: enabled when status is `rendered`

---

## openCLAW Integration (Agent Side)

### Python script location

`~/.openclaw/skills/video-editor/scripts/_video_editor.py`

The script is installed independently per profile. All 3 profiles (CGK, RAWDOG, VitaHustle) must have identical copies verified with MD5 parity.

### Key commands

#### `cmd_sync()`

1. Calls `POST /api/admin/video-editor/projects/sync` with full project JSON
2. If render file exists locally, calls `_upload_file()` to upload to Vercel Blob
3. If voiceover file exists locally, calls `_upload_file()` to upload
4. If music file exists locally, calls `_upload_file()` to upload
5. Prints "View in Creative Studio: {platform_url}/admin/creative-studio/{project_id}"

#### `_upload_file(api_url, api_key, project_id, file_type, file_path)`

- Multipart POST to `POST /api/admin/video-editor/projects/upload`
- Form data fields: `projectId`, `type` (`render` | `voiceover` | `music`), `file`
- Returns the Vercel Blob URL from the response `blobUrl` field
- Vercel Blob handles storage; the URL is saved back to the project record

#### `cmd_deliver()`

Triggers final delivery from agent side — sets project status to `delivered` and notifies Slack with the render URL.

### Authentication

All agent API calls use the `x-api-key: {TENANT_API_KEY}` header. The key is stored in the profile's `.env` file as `CGK_PLATFORM_API_KEY` (or equivalent per profile).

### Creative Studio URL format

`{PLATFORM_URL}/admin/creative-studio/{project_id}`

where `PLATFORM_URL` is the admin app URL (e.g., `https://cgk-admin-cgk-linens-88e79683.vercel.app`).

---

## Key Design Decisions

| Decision                   | Choice                   | Rationale                                                  |
| -------------------------- | ------------------------ | ---------------------------------------------------------- |
| File storage               | Vercel Blob              | Platform-native, no S3 setup, 500MB max per file           |
| Batch updates              | PostgreSQL `unnest()`    | Single query vs N+1, atomic                                |
| Scene sync                 | ON CONFLICT upsert       | Idempotent — agent can re-sync without duplicates          |
| Caption sync               | Preserve `is_edited`     | User edits survive agent re-syncs                          |
| SSE field names            | snake_case               | Consistent with DB column names                            |
| UUID validation            | All scene/caption IDs    | SQL injection prevention at route boundary                 |
| Package DB access          | Receive scoped db handle | Package never calls `withTenant` — caller's responsibility |
| Insert vs update detection | PostgreSQL xmax trick    | `xmax = 0` means inserted, `xmax != 0` means updated       |

---

## Dependencies

### `apps/admin` (UI)

- `@dnd-kit/core` — drag-and-drop core
- `@dnd-kit/sortable` — sortable list primitives
- `@dnd-kit/utilities` — CSS transform utilities
- `@vercel/blob` — file upload client
- `@cgk-platform/video-editor` — internal package

### `packages/video-editor`

- `@vercel/postgres` — `sql` tag for all queries (standard CGK pattern)
- No external dependencies beyond platform-internal packages

---

## Cross-Profile Deployment

The video-editor skill script must be deployed to all 3 profiles with identical logic. After any change:

1. Verify MD5 parity: `md5 ~/.openclaw/skills/video-editor/scripts/_video_editor.py ~/.openclaw-rawdog/skills/video-editor/scripts/_video_editor.py ~/.openclaw-vitahustle/skills/video-editor/scripts/_video_editor.py`
2. Run import check: `python3 -c "import importlib.util; spec = importlib.util.spec_from_file_location('ve', '~/.openclaw/skills/video-editor/scripts/_video_editor.py'); m = importlib.util.module_from_spec(spec)"`
3. Contamination grep: ZERO hardcoded profile paths in script files

Each profile's sync/upload calls point to the same platform API — no per-profile API URL differences for the CGK platform.
