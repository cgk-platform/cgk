---
name: video-remix
description: Analyze a video and generate a new video with Veo/Kling/Sora. Two modes - TEXT mode (prompt-to-video) and IMAGE mode (extract frame → remix with Nano Banana → image-to-video). Use when user uploads video, shares video URL, or wants to clone/remix a video with a new look.
complexity: moderate
allowed-tools:
  - exec
---

# Video Remix - Analyze & Recreate Videos

Analyzes source videos using Gemini and generates new videos with Veo/Kling/Sora, optionally with modifications. Supports two modes:

- **Text Mode** (default): analyze → text prompt → text-to-video
- **Image Mode** (`--image-remix`): analyze → extract frame → remix image with Nano Banana → image-to-video

## Quick Start: Text Mode (Original Behavior)

```bash
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  "/path/to/video.mp4" \
  "modifications to apply" \
  [veo-fast|veo-quality|kling-pro|kling-std|sora]
```

## Quick Start: Image Remix Mode (Clone & Remix)

Auto-extract a frame from the video, remix it with Nano Banana, then generate a new video from the remixed image:

```bash
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  --image-remix \
  "/path/to/video.mp4" \
  "generate a new variation with different lighting, keep the same composition" \
  veo-fast
```

Or provide your own screenshot/image instead of extracting a frame:

```bash
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  --image-remix --input-image "/path/to/screenshot.png" \
  "/path/to/video.mp4" \
  "remix this image with a winter theme, add snow" \
  veo-fast
```

## Examples

### Text Mode: Exact Recreation

```bash
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  "/Users/novarussell/.openclaw/media/inbound/source.mp4" \
  "keep same style and content"
```

### Text Mode: With Modifications

```bash
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  "https://example.com/video.mp4" \
  "make it winter scene with snow, colder color grading" \
  veo-fast
```

### Image Mode: Clone & Remix from Slack Upload

```bash
VIDEO=$(ls -t /Users/novarussell/.openclaw/media/inbound/*.mp4 | head -1)

~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  --image-remix \
  "$VIDEO" \
  "generate a new variation of this scene with warmer tones and golden hour lighting"
```

### Image Mode: User Provides Screenshot

```bash
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  --image-remix --input-image "/Users/novarussell/.openclaw/media/inbound/screenshot.png" \
  "/Users/novarussell/.openclaw/media/inbound/source.mp4" \
  "remix this with a different color palette, more vibrant"
```

## What It Does

### Text Mode (default)

**STEP 1: Video Analysis** → Gemini 3 Flash analyzes the video in detail
**STEP 2: Generate Video** → Text prompt → Veo/Sora text-to-video

### Image Remix Mode (`--image-remix`)

**STEP 1: Video Analysis** → Gemini 3 Flash analyzes the video + extracts keyframe
**STEP 2: Source Image** → Uses extracted frame or user-provided screenshot
**STEP 3: Remix Image** → Nano Banana generates a new variation of the image
**STEP 4: Image-to-Video** → Veo/Sora generates video from the remixed image using the analysis prompt

## Output Files

### Text Mode

```
/Users/novarussell/.openclaw/media/
  YYYY-MM-DD-HH-MM-SS-analysis.json  # Detailed analysis
  YYYY-MM-DD-HH-MM-SS-remix.mp4      # Generated video
```

### Image Remix Mode

```
/Users/novarussell/.openclaw/media/
  YYYY-MM-DD-HH-MM-SS-analysis.json  # Detailed analysis
  YYYY-MM-DD-HH-MM-SS-frame.png      # Extracted keyframe (if auto-extracted)
  YYYY-MM-DD-HH-MM-SS-remixed.png    # Nano Banana remixed image
  YYYY-MM-DD-HH-MM-SS-remix.mp4      # Generated video from remixed image
```

## Standalone Analysis (No Video Generation)

To just analyze without generating:

```bash
uv run ~/.openclaw/skills/video-remix/scripts/analyze_video.py \
  --video "/path/to/video.mp4" \
  --modifications "make it darker, moodier" \
  --extract-frame "/Users/novarussell/.openclaw/media/frame.png" \
  --output "/Users/novarussell/.openclaw/media/analysis.json"
```

This outputs JSON with:

- `analysis` - Detailed scene breakdown
- `veo_sora_prompt` - Generated prompt
- `modifications` - Applied changes
- `extracted_frame` - Path to extracted keyframe (if `--extract-frame` used)

## Common Modifications

**Lighting:**

- "golden hour lighting"
- "darker, moodier atmosphere"
- "bright and airy"
- "blue hour cold tones"

**Setting:**

- "make it winter with snow"
- "change to urban city environment"
- "beach sunset instead of forest"

**Style:**

- "more cinematic with color grading"
- "documentary style instead of commercial"
- "black and white"
- "vibrant saturated colors"

**Camera:**

- "add camera movement, slow dolly forward"
- "make it handheld shaky cam"
- "static shot instead of moving"

## Supported URL Types

The video-remix skill automatically handles these URL types in addition to local files:

### Dropbox Links (auto-download)

```bash
# Single file — share link converted to direct download automatically
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  "https://www.dropbox.com/scl/fi/abc123/product-video.mp4?dl=0" \
  "make it more cinematic" veo-fast

# With --image-remix (frame extraction works on downloaded file)
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  --image-remix \
  "https://www.dropbox.com/scl/fi/abc123/product-video.mp4?dl=0" \
  "remix with golden hour lighting"
```

### Dropbox Folder Download (bulk)

```bash
# List folder contents first
uv run ~/.openclaw/skills/video-remix/scripts/dropbox_helper.py \
  list-folder "https://www.dropbox.com/scl/fo/xyz789/VideoLibrary?dl=0"

# Download all videos from folder
uv run ~/.openclaw/skills/video-remix/scripts/dropbox_helper.py \
  download-folder "https://www.dropbox.com/scl/fo/xyz789/VideoLibrary?dl=0" \
  --filter video

# Then remix each downloaded video individually with remix_video.sh
```

### Google Drive Links (auto-download)

```bash
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  "https://drive.google.com/file/d/1ABC123/view?usp=sharing" \
  "add winter theme" veo-fast
```

### Direct URLs (passthrough to Gemini)

```bash
~/.openclaw/skills/video-remix/scripts/remix_video.sh \
  "https://example.com/video.mp4" \
  "make it moodier"
```

**Note:** Private Dropbox links will fail with a clear error. Ensure sharing is set to "Anyone with the link". Full OAuth support for private links is planned for Phase 2.

## Requirements

- **GEMINI_API_KEY** - For video analysis
- **ffmpeg** - For frame extraction in image mode (install: `brew install ffmpeg`)
- **Quota** - Veo requires quota (or use Sora with OPENAI_API_KEY)
- **Supported formats** - MP4, MOV, AVI, WebM, MKV

## Workflow in Agent Instructions

When user uploads video to Slack:

1. **Detect video upload** - Check `/inbound/` for .mp4, .mov, etc.
2. **Ask for mode** - "Do you want a text remix or image remix (clone & remix)?"
3. **If image remix** - Ask if they want to provide their own screenshot or auto-extract
4. **Run remix script** - Pass video path, modifications, and mode flags
5. **Display results** - Show analysis, remixed image (if applicable), and generated video

## Quota Note

If you hit Gemini quota for Veo:

- Use Kling instead: `--backend kling-pro` (uses KLING_ACCESS_KEY + KLING_SECRET_KEY)
- Use Sora instead: `--backend sora` (uses OPENAI_API_KEY)
- Or wait for quota reset
- Check quota: https://ai.dev/rate-limit
