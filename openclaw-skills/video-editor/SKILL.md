---
name: video-editor
description: Interactive session-based video editor — storyboard, voiceover, footage sourcing, captions, rendering
---

# Video Editor — Session-Based Video Production

**CRITICAL: ALWAYS use `video_editor_safe.sh`. NEVER call `_video_editor.py` directly.**

Produces polished 10-120+ second videos through an interactive, multi-step, session-based workflow. FFmpeg + ElevenLabs + Pexels + yt-dlp.

## Two Workflows

### Original Mode

User provides a brief → agent builds storyboard interactively → sources footage → generates VO → assembles.

### Clone Mode

User provides a competitor video → Gemini Flash analyzes it → agent adapts to brand → same assembly pipeline.

## Quick Start

### Original Mode

```bash
SLACK_CHANNEL_ID="$SLACK_CHANNEL_ID" SLACK_THREAD_TS="$SLACK_THREAD_TS" \
  video_editor_safe.sh start --mode original
```

### Clone Mode

```bash
SLACK_CHANNEL_ID="$SLACK_CHANNEL_ID" SLACK_THREAD_TS="$SLACK_THREAD_TS" \
  video_editor_safe.sh start --mode clone --source-video /path/to/competitor.mp4
```

## Workflow Steps (run in order, ONE AT A TIME)

| Step | Command                                                                   | Purpose                                             |
| ---- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| 0    | `start --mode original\|clone`                                            | Initialize session                                  |
| 1    | `analyze --session <ID>`                                                  | Analyze competitor video (clone only)               |
| 1.5  | `analyze-footage --source <path>\|--gdrive <folder> [--session <ID>]`     | Catalog footage folder (REQUIRED for local footage) |
| 2    | `storyboard --session <ID>`                                               | Load brand context for storyboard                   |
| 3    | `set-storyboard --session <ID> --storyboard '<JSON>'`                     | Save finalized storyboard                           |
| 3.5  | `search-voices [--gender female] [--accent american]`                     | Browse & preview voices (optional, no session)      |
| 4    | `set-voice --session <ID> --voice "Rachel" [--public-owner-id <id>]`      | Choose voice + preview (auto-saves to library)      |
| 5    | `generate-voiceover --session <ID>`                                       | Generate full VO + timestamps                       |
| 6    | `source-footage --session <ID>`                                           | Download/validate all footage                       |
| 7    | `normalize --session <ID> --aspect-ratio 9:16`                            | Normalize all clips                                 |
| 8    | `set-captions --session <ID> --style tiktok`                              | Choose caption style                                |
| 8.5  | `suggest-music --session <ID>`                                            | AI music suggestions (optional)                     |
| 9    | `set-music --session <ID> --music <path\|freesound:<id>\|library:<file>>` | Set background music                                |
| 10   | `plan --session <ID> [--force]`                                           | Generate assembly plan                              |
| 11   | `render --session <ID>`                                                   | Execute video assembly                              |
| 12   | `deliver --session <ID>`                                                  | Upload to Slack + archive                           |

## Storyboard JSON Format

```json
{
  "title": "Ad title",
  "total_duration": 30,
  "mood": "warm",
  "scenes": [
    {
      "scene_num": 1,
      "start": 0,
      "end": 3,
      "text": "Hook text here",
      "description": "Visual description",
      "footage_source": "stock:woman applying skincare morning routine",
      "transition": "crossfade"
    }
  ],
  "voiceover_script": "Full voiceover script here..."
}
```

### Footage Source Types

| Prefix    | Description            | Example                                            |
| --------- | ---------------------- | -------------------------------------------------- |
| `file:`   | Local file path        | `file:/path/to/product-pour.mp4`                   |
| `stock:`  | Pexels search query    | `stock:woman skincare morning routine`             |
| `social:` | Download via yt-dlp    | `social:https://tiktok.com/@user/video/123`        |
| `veo:`    | AI generation prompt   | `veo:close-up of tallow moisturizer being applied` |
| `gdrive:` | Google Drive file      | `gdrive:https://drive.google.com/file/d/.../view`  |
| `clip:`   | Time range from a clip | `clip:product-pour.mp4@3.2-7.8`                    |

**`gdrive:` notes:** Requires Google Workspace OAuth credentials (run `setup_oauth.py` from the google-workspace skill first). Falls back to yt-dlp for public Drive links if OAuth is unavailable.

**`clip:` notes:** Reference any clip by filename (resolved from media dir or footage catalog). The `@start-end` range is in seconds. Use `analyze-footage` to build a catalog with timestamp references.

### Transition Types

`crossfade`, `fade`, `fade-to-black`, `wipe`, `dissolve`, `slide`

## Caption Styles

| Style     | Description                                                                  |
| --------- | ---------------------------------------------------------------------------- |
| `tiktok`  | Bottom, large bold white (72pt), word-by-word highlight, 500px from bottom   |
| `minimal` | Bottom, small white, no box, subtle                                          |
| `bold`    | Bottom, extra large (80pt), thick outline, word pop scale, 500px from bottom |
| `karaoke` | Fill animation left-to-right per word                                        |
| `none`    | No captions                                                                  |

## Music Workflow

### AI Music Suggestions (optional step 8.5)

After setting captions, run `suggest-music` to get AI-powered music recommendations based on storyboard mood:

```bash
video_editor_safe.sh suggest-music --session vid-20260223-142355-12345
```

The system analyzes scene descriptions, VO script tone, and the optional `mood` field in the storyboard JSON to suggest matching tracks from:

- **Freesound API** — Free music library with CC0/CC-BY tracks (requires `FREESOUND_API_KEY`)
- **Local library** — Audio files in `workspace/music/`

### Music Source Types

| Prefix           | Description                         | Example                     |
| ---------------- | ----------------------------------- | --------------------------- |
| `freesound:<id>` | Download from Freesound by sound ID | `freesound:482931`          |
| `library:<file>` | From local music library            | `library:soft-acoustic.mp3` |
| `<path>`         | Local file path (existing)          | `/path/to/track.mp3`        |
| `--none`         | No music                            |                             |

```bash
# Use a Freesound suggestion
video_editor_safe.sh set-music --session <ID> --music freesound:482931

# Use a local library track
video_editor_safe.sh set-music --session <ID> --music library:ambient-loop.mp3

# Use a custom file
video_editor_safe.sh set-music --session <ID> --music /path/to/track.mp3

# No music
video_editor_safe.sh set-music --session <ID> --none
```

### Freesound Setup

Register for a free API key at https://freesound.org/apiv2/apply and add to your profile .env:

```
FREESOUND_API_KEY=your_key_here
```

### Local Music Library

Place audio files (MP3, WAV, AAC, OGG, M4A, FLAC) in `workspace/music/`. They will appear in `suggest-music` results.

### Attribution

When using CC-licensed Freesound tracks, attribution is tracked automatically and displayed at the `deliver` step. CC0 tracks require no attribution.

## Voice Options

Commonly used ElevenLabs voices: Rachel, Josh, Emily, Adam, Bella, Antoni, Sarah, Charlie, Matilda, Freya, Daniel, Lily

Or use `--voice-id <custom_id>` for cloned voices.

### Voice Discovery (search-voices)

Browse and preview voices from the ElevenLabs shared library or your own library. No session required — use this anytime to find the right voice.

```bash
# Female American narrator
video_editor_safe.sh search-voices --gender female --accent american --use-case narration

# Male British voice
video_editor_safe.sh search-voices --gender male --accent british

# Free-text search
video_editor_safe.sh search-voices --query "warm deep confident"

# Browse your own library (cloned, saved, premade)
video_editor_safe.sh search-voices --my-voices

# Professional tier only
video_editor_safe.sh search-voices --category professional --gender female
```

| Option              | Values                                     | Description                               |
| ------------------- | ------------------------------------------ | ----------------------------------------- |
| `--query <text>`    | Free text                                  | Search by name or description             |
| `--gender`          | `male`, `female`                           | Filter by gender                          |
| `--age`             | `young`, `middle_aged`, `old`              | Filter by age range                       |
| `--accent <text>`   | e.g. `american`, `british`, `australian`   | Filter by accent                          |
| `--use-case <text>` | e.g. `narration`, `conversational`, `news` | Filter by intended use                    |
| `--category`        | `professional`, `famous`, `high_quality`   | Filter by tier                            |
| `--my-voices`       | (flag)                                     | Search your own library instead of shared |
| `--limit N`         | Default: 10                                | Max results to return                     |
| `--max-previews N`  | Default: 5                                 | Max preview MP3s to download              |

**Workflow:** Run `search-voices` → upload preview MP3s to Slack → user picks → use `set-voice --voice-id <id> --public-owner-id <owner_id>` with the chosen voice.

### Auto-Save to Library

When `--public-owner-id` is passed to `set-voice`, the voice is automatically added to your ElevenLabs library ("My Voices") so you can find it again easily. The `public_owner_id` is shown in `search-voices` output for each shared voice. This is non-fatal — if the voice is already in your library or the add fails, it silently continues.

Premade voices from the hardcoded list (Rachel, Josh, etc.) are always available and don't need this flag.

## Master Catalog

Every profile has a **master catalog** that accumulates all footage persistently. When you run `analyze-footage` without `--catalog`, clips are added to the master catalog instead of creating a new one. The master catalog is searched by default for all storyboard `clip:` references.

### Clip Lifecycle

- **Catalog entries** persist forever (subjects, segments, metadata)
- **Local files** follow TTL policy by source type — expired files are auto-deleted but re-downloaded on demand

### TTL Policy

| Source Type | TTL                        | Pinned | Re-downloadable       | Examples                        |
| ----------- | -------------------------- | ------ | --------------------- | ------------------------------- |
| `gdrive`    | 30 days (refreshed on use) | No     | Yes (GDrive API)      | GDrive catalog folders          |
| `stock`     | 30 days (refreshed on use) | No     | Yes (Pexels API)      | Pexels downloads                |
| `local`     | 30 days (refreshed on use) | No     | Best-effort           | Manually placed files           |
| `social`    | Permanent                  | Yes    | No (URLs expire)      | TikTok, IG, YouTube via yt-dlp  |
| `inbound`   | Permanent                  | Yes    | No (user-provided)    | Slack uploads, manual drops     |
| `veo`       | Permanent                  | Yes    | No (can't regenerate) | AI-generated (Veo, Kling, Sora) |

### Source Tracking

Every clip stores `source_type`, `source_url`, `source_id`. When a local file is missing but the catalog entry exists, the system auto-downloads from the stored source. **Search the FULL master catalog for the BEST clips regardless of local availability.** The system auto-downloads missing files. Do NOT limit choices to locally-cached clips.

### Deferred Cataloging

Stock, social, inbound, and veo clips downloaded during `source-footage` are queued for deferred Gemini analysis (avoids blocking the user). Queued clips are auto-processed after `deliver` or manually via `catalog-pending`.

## Direct Catalog Operations

These work WITHOUT a video editing session:

```bash
# Bulk catalog a GDrive folder into master
video_editor_safe.sh analyze-footage --gdrive <folder>

# Bulk catalog a local folder into master
video_editor_safe.sh analyze-footage --source <local_path>

# Add individual clips to master with Gemini analysis
video_editor_safe.sh catalog-add /path/to/tiktok-clip.mp4
video_editor_safe.sh catalog-add clip1.mp4 clip2.mp4

# Override auto-detection (e.g., for a TikTok clip already downloaded)
video_editor_safe.sh catalog-add /path/to/clip.mp4 --source-type social

# Browse all catalogs
video_editor_safe.sh list-catalogs

# Search across all catalogs
video_editor_safe.sh search-clips --query "product close-up"

# Process queued clips from source-footage
video_editor_safe.sh catalog-pending

# Check disk usage
video_editor_safe.sh cleanup-media --report

# Preview what would be cleaned
video_editor_safe.sh cleanup-media --dry-run

# Clean expired files (respects pinning)
video_editor_safe.sh cleanup-media

# Force-clean including pinned files (manual disk reclaim)
video_editor_safe.sh cleanup-media --force --ttl-days 0
```

When the user provides a clip file (from TikTok, Slack, etc.) and asks to catalog it, use `catalog-add` directly — no video session needed.

## Footage Catalog Workflow

Use `analyze-footage` to catalog a folder of clips before building a storyboard. Gemini Pro downloads each clip and uses frame extraction to identify content segments with timestamps, text overlays, and specific product identification. All clips go to the master catalog by default. Minimum file size is 100 KB (override with `--min-size <bytes>`).

### From Google Drive

```bash
video_editor_safe.sh analyze-footage --gdrive "https://drive.google.com/drive/folders/1A2B3C" --session vid-20260223-142355-12345
```

### From Local Folder

```bash
video_editor_safe.sh analyze-footage --source /path/to/footage/ --session vid-20260223-142355-12345
```

### Standalone (no session, with name and tags)

```bash
video_editor_safe.sh analyze-footage --gdrive 1A2B3C --name "February Shoots" --tag "product,tallow"
```

### Incremental (add new clips to existing catalog)

```bash
video_editor_safe.sh analyze-footage --gdrive 1A2B3C --catalog cat-20260223-142355-a3f9
```

The catalog output shows `clip:` references for each segment:

```
  product-pour.mp4 (12.4s)
    [0.0-3.2]  Hand pouring tallow into jar -- close-up, warm
             -> clip:product-pour.mp4@0.0-3.2
    [3.2-7.8]  Label reveal -- rack focus, premium
             -> clip:product-pour.mp4@3.2-7.8
```

Use these references in your storyboard's `footage_source` field. Clips from Drive are downloaded during cataloging for accurate frame-based analysis.

## Catalog Management

Catalogs are stored persistently at `workspace/.video-catalogs/` and survive session expiration. Up to 50 clips per catalog by default.

### List all catalogs

```bash
video_editor_safe.sh list-catalogs
video_editor_safe.sh list-catalogs --sort name --tag product
video_editor_safe.sh list-catalogs --sort clips --limit 10
```

### Search across all catalogs

```bash
video_editor_safe.sh search-clips --query "bed skirt"
video_editor_safe.sh search-clips --query "close-up" --catalog cat-20260223-142355-a3f9
video_editor_safe.sh search-clips --query "warm" --limit 50
```

Search checks subjects, mood, and camera fields first (fast index lookup), then falls back to description text scan.

### Attach existing catalog to a new session

```bash
video_editor_safe.sh attach-catalog --session vid-20260223-160000-9999 --catalog cat-20260223-142355-a3f9
```

### Rename a catalog

```bash
video_editor_safe.sh rename-catalog --catalog cat-20260223-142355-a3f9 --name "February Product Shoots"
```

### analyze-footage options

| Option                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `--source <path>`      | Local folder path                                    |
| `--gdrive <id_or_url>` | Google Drive folder                                  |
| `--session <ID>`       | Attach catalog to session                            |
| `--max-clips N`        | Max clips to analyze (default 50)                    |
| `--min-size <bytes>`   | Minimum file size in bytes (default 100000 = 100 KB) |
| `--name <name>`        | Human-readable catalog name                          |
| `--catalog <id>`       | Add to existing catalog (incremental)                |
| `--tag <tags>`         | Comma-separated tags                                 |

## Utility Commands

```bash
video_editor_safe.sh list-sessions         # List active sessions
video_editor_safe.sh session-status --session <ID>  # Show step completion
video_editor_safe.sh search-voices --gender female --accent american  # Browse voices
video_editor_safe.sh sync --session <ID>   # Manual push to Creative Studio
video_editor_safe.sh cleanup               # Archive expired sessions
video_editor_safe.sh catalog-add <file>... [--source-type social|inbound|veo|local]  # Add clips to master
video_editor_safe.sh catalog-pending       # Process queued clips
video_editor_safe.sh cleanup-media [--ttl-days N] [--dry-run] [--force] [--report]  # TTL cleanup
```

## Timing

- Voice preview: ~5 seconds
- Full voiceover: ~10-20 seconds
- Stock footage download: ~10-30 seconds per clip
- Social media download: ~15-45 seconds per clip
- Normalization: ~5-15 seconds per clip
- Final render: ~30-90 seconds for a 60-second 1080p video

## Requirements

- FFmpeg + ffprobe (in system PATH or sandbox image)
- Python 3.10+
- `elevenlabs` package
- `yt-dlp` package
- `requests` package
- `google-api-python-client`, `google-auth`, `google-auth-oauthlib` (for `gdrive:` source)
- ElevenLabs API key (ELEVEN_API_KEY in profile .env)
- Pexels API key (PEXELS_API_KEY in skill .env — free at pexels.com/api)
- LiteLLM proxy running (for clone mode Gemini analysis + footage cataloging)
- Google Workspace OAuth credentials (for `gdrive:` source — run google-workspace `setup_oauth.py`)
- Freesound API key (FREESOUND_API_KEY in profile .env — optional, free at freesound.org/apiv2/apply)

## Session Rules

- Session TTL: 120 minutes
- Plan TTL: 30 minutes
- Thread affinity: session bound to originating Slack thread
- Cannot skip steps — script refuses to advance without prerequisites
- Env gate: `VIDEO_EDITOR_SAFE=1` required (set by wrapper)

## Catalog Requirement (CRITICAL)

**`set-storyboard` BLOCKS `file:` paths and raw paths when no footage catalog is attached.** This prevents using wrong footage (e.g., Christmas bedding instead of bed skirts) by ensuring clip contents are identified before building the storyboard.

### What's blocked

- `file:/path/to/video.mp4` — blocked without catalog
- `/path/to/video.mp4` (raw path, no prefix) — blocked without catalog

### What's always allowed (no catalog needed)

- `stock:<query>` — Pexels search
- `veo:<prompt>` — AI generation
- `gdrive:<id>` — Google Drive download
- `social:<url>` — yt-dlp download
- `clip:<file>@<start>-<end>` — validated against catalog (must exist)

### Workflow for local footage

1. Run `analyze-footage` to catalog clips (identifies subjects, mood, timestamps)
2. Use `clip:` references from the catalog output in your storyboard
3. `set-storyboard` validates that clip references exist in the catalog

### Emergency override

If you must bypass the catalog requirement (e.g., single known file):

```bash
video_editor_safe.sh set-storyboard --session <ID> --storyboard '<JSON>' --force-uncataloged
```

This logs a warning and sets `uncataloged_override` in the session. Use sparingly.

## Focus & Chaining Rules (CRITICAL)

Chain non-approval steps in a single turn. Only stop when the workflow requires user confirmation.

**Must stop and wait for approval:**

- After `set-voice` → upload preview, WAIT
- After `generate-voiceover` → upload VO, WAIT
- After `plan` → show plan, WAIT for "go"
- After `render` → deliver (auto-uploads to Slack), WAIT
- After `analyze` → show analysis, get approval. Do NOT proceed without it.
- After `storyboard` → run `search-clips` for EACH scene's visual needs. Prefer `clip:` from master catalog over `stock:` (Pexels). Discuss footage choices with user.

**Chain these (do NOT stop between):**

- `generate-voiceover` → `source-footage` → `normalize` (after VO approved)
- `set-captions` → `set-music` → `plan` (after captions chosen)
- `render` immediately after `plan` (if user said "go")
- `deliver` immediately after `render` (auto-uploads to Slack)

**Focus rules:**

- FINISH one video pipeline before starting another
- Plans have 30-min TTL — if ready, RENDER IMMEDIATELY
- If `plan` blocks for clip shortfall: try ONE fix, then use `plan --force` if it blocks again
- `--force` lets short clips hold on last frame and VO may be trimmed — imperfect but ships
- Cataloging is LOWER PRIORITY than in-progress renders
- Exception: if blocked (Veo gen, user approval), MAY work on another session

**Still enforced:**

- NEVER render without plan approval.
- NEVER skip voice preview.
- After `start` → storyboard or analyze (clone). Do NOT discuss voice/music yet.

## Progress Communication

- IMMEDIATELY acknowledge video editor requests before running commands
- Long ops (yt-dlp, Gemini analysis, FFmpeg) post progress messages directly to Slack thread
- Typing indicator drops after 2 min — progress messages are the user's only feedback during long ops

## Deliver Behavior

`deliver` performs Slack upload BEFORE archiving the session:

1. Reads channel/thread from session JSON (fallback to env vars)
2. Uploads video via Slack v2 file upload API (retries 5x with backoff)
3. If upload **fails**: prints error, exits 1, session stays active for retry
4. If upload **succeeds**: marks `delivered=True`, archives session to `completed/`

This means a failed `deliver` can always be retried without losing the session.

## CGK Platform Integration (Creative Studio)

The video editor automatically syncs project state to the CGK Platform's Creative Studio, enabling a web UI for viewing projects, editing captions, reordering scenes, and previewing renders.

### Environment Variables

| Variable                   | Required | Description                                                    |
| -------------------------- | -------- | -------------------------------------------------------------- |
| `CGK_PLATFORM_API_URL`     | Yes      | Platform URL (e.g., `https://cgk-admin.vercel.app`)            |
| `CGK_PLATFORM_API_KEY`     | Yes      | API key for authentication (per-profile, x-api-key header)     |
| `CGK_PLATFORM_TENANT_SLUG` | Yes      | Tenant identifier (e.g., `cgk_linens`, `rawdog`, `vitahustle`) |

Set these in the profile `.env` file. If any are missing, sync is **silently skipped** (non-fatal).

### Automatic Sync (Background)

`_auto_sync()` pushes the full session state to the platform after each major step:

| Pipeline Step        | Synced? | Status Sent     |
| -------------------- | ------- | --------------- |
| `storyboard`         | Yes     | `storyboarding` |
| `set-storyboard`     | Yes     | `storyboarding` |
| `set-voice`          | Yes     | `producing`     |
| `generate-voiceover` | Yes     | `producing`     |
| `source-footage`     | Yes     | `producing`     |
| `set-music`          | Yes     | `producing`     |
| `plan`               | Yes     | `producing`     |
| `render`             | Yes     | `rendered`      |
| `deliver`            | Yes     | `delivered`     |

#### What Gets Synced

- **Project metadata**: title, mode, aspect ratio, template ID
- **Storyboard JSON**: scenes with duration, footage hints, transitions
- **Voice config**: voice ID, name, voiceover script
- **Caption config**: style, word-level timestamps (start/end per word)
- **Music config**: attribution, volume
- **File uploads**: render video, voiceover audio, and music track are uploaded as blobs to Vercel Blob storage via the platform's upload endpoint

After a successful sync at `render` or `deliver`, the script prints a direct link:

```
View in Creative Studio: https://cgk-admin.vercel.app/admin/creative-studio/<project_id>
```

### Manual Sync

Force a sync at any point mid-pipeline:

```bash
video_editor_safe.sh sync --session <ID>
```

### Interactive Caption Editing (Bidirectional)

Before `render`, the script calls `_pull_platform_edits()` to check if anyone edited captions in the Creative Studio web UI. If edits exist, they are applied to the local timestamps file before FFmpeg assembles the video.

**Workflow:**

1. `generate-voiceover` syncs word-level caption timestamps to the platform
2. User (or team member) edits captions in the Creative Studio caption editor
3. `render` automatically pulls those edits and bakes them into the video

Edited captions are marked `is_edited = TRUE` in the platform DB and are preserved across subsequent auto-syncs (never overwritten by the agent).

### Platform API Endpoints Used

| Method | Endpoint                                                  | Purpose                      |
| ------ | --------------------------------------------------------- | ---------------------------- |
| `POST` | `/api/admin/video-editor/projects/sync`                   | Push full session state      |
| `POST` | `/api/admin/video-editor/projects/upload`                 | Upload render/VO/music files |
| `GET`  | `/api/admin/video-editor/projects/pull-edits?sessionId=X` | Fetch user-edited captions   |

### Multi-Tenant Mapping

All 3 profiles sync to the same CGK Platform instance but with different tenant slugs:

| Profile    | Tenant Slug  | Effect                                  |
| ---------- | ------------ | --------------------------------------- |
| CGK        | `cgk_linens` | Projects appear under CGK Linens tenant |
| RAWDOG     | `rawdog`     | Projects appear under Rawdog tenant     |
| VitaHustle | `vitahustle` | Projects appear under VitaHustle tenant |

Projects are isolated per tenant in the Creative Studio UI.
