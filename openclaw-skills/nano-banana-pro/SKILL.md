---
name: nano-banana-pro
description: Generate 3 ad images (1 prompt x 3 aspect ratios: 1:1, 9:16, 16:9) and upload each to Slack thread. ALWAYS use for ad generation requests.
complexity: moderate
allowed-tools:
  - exec
---

# Nano Banana Pro - Ad Image Generator

Generates 3 images from a single prompt at 3 aspect ratios (1:1, 9:16, 16:9). Each image is uploaded individually to the requesting Slack thread.

## CRITICAL: NEVER Use Programmatic Image Editing

**NEVER use PIL, Pillow, ImageMagick, or any Python/shell image editing to swap text, repaint pixels, or modify images.** This produces low-quality results with artifacts.

**ALWAYS use `generate_ads_safe.sh`** — even for simple text changes like "35% OFF -> 25% OFF". Pass the original as `--input-image` and describe the change in the prompt. Do NOT write workaround scripts.
NEVER call `_generate_ads_internal.sh` or `generate_ads.sh` directly — they are blocked by an env var gate (`AD_GEN_SAFE=1`) that only the safe wrapper sets. Do not set this env var manually.

## Quick Start: Generate 3 Images in ONE Command

**CRITICAL: Always pass `SLACK_CHANNEL_ID`, `SLACK_THREAD_TS`, and `--name` explicitly.** Never rely on defaults.

```bash
SLACK_CHANNEL_ID="<channel_id_from_inbound_meta>" \
SLACK_THREAD_TS="<reply_to_id_from_inbound_meta>" \
generate_ads_safe.sh \
  --name "product-hero-ad" \
  "your ad prompt here"
```

**ALWAYS use `--name`** — it labels filenames and Slack titles so you (and the user) can tell which concept is which. Without it, files are just `TIMESTAMP-1x1.png` and impossible to match to concepts when generating multiple ads.

**Naming rules:**

- Use a short, descriptive slug: `--name "competitor-rank-7"`, `--name "bundle-promo-v2"`, `--name "product-hero"`
- Auto-sanitized: lowercased, special chars replaced with hyphens, max 60 chars
- Files become: `2026-02-20-14-30-15-product-hero-1x1.png`
- Slack titles become: `*product-hero — 1:1 (Square)*`

**Examples:**

- DM request: `SLACK_CHANNEL_ID="<dm_channel_id>" SLACK_THREAD_TS="1234567890.123456"`
- Channel request: `SLACK_CHANNEL_ID="<channel_id>" SLACK_THREAD_TS="1234567890.123456"`

**The script automatically:**

- Uses the brand logo from `workspace/brand/logo-primary.png`
- Generates 3 images using **Vertex AI `gemini-3-pro-image-preview`** (primary backend)
- Falls back to AI Studio Gemini if Vertex fails
- Uploads each image individually to the Slack thread (no zip)

**How to get the right values:**

- `SLACK_CHANNEL_ID` -> from inbound message metadata `chat_id` (DM channel IDs start with `D`, public channels with `C`)
- `SLACK_THREAD_TS` -> from inbound message metadata `message_id` or `reply_to_id`

## Reference Images from Slack Threads

When a user uploads images to a Slack thread (screenshots, inspiration, competitor ads), they are used as reference images for generation.

**Auto-detection:** The script automatically scans the thread's session history (`scan_thread_media.py`) and includes all inbound images as `--input-image` flags. This happens before generation starts — no agent action needed.

**Defense in depth:** You should ALSO pass images manually as `--input-image` flags when you can find them in `media/inbound/`. The script deduplicates automatically, so passing the same image twice is safe. Layers:

1. Auto-scan from session JSONL (best case — catches everything)
2. Agent manual `--input-image` flags (backup)
3. `--expect-references N` gate (optional safety net)

```bash
SLACK_CHANNEL_ID="<channel_id>" \
SLACK_THREAD_TS="<thread_ts>" \
generate_ads_safe.sh \
  --name "product-bundle-promo" \
  --input-image "/path/to/inspo1.png" \
  --input-image "/path/to/inspo2.png" \
  "Create an ad similar to these reference images. Use our brand colors and logo. Feature the product prominently."
```

**How reference images work internally:**

- Each `--input-image` is sent to Gemini as an `inline_data` image part alongside the text prompt
- The brand logo (from `workspace/brand/logo-primary.png`) is ALSO sent as a separate image part
- Gemini sees: [logo] + [ref1] + [ref2] + ... + [prompt text]
- More reference images = better style matching

## Image Editing / Remix Mode

When the user provides a reference image to edit or remix, pass `--input-image` BEFORE the prompt:

```bash
SLACK_CHANNEL_ID="<channel_id>" \
SLACK_THREAD_TS="<thread_ts>" \
generate_ads_safe.sh \
  --input-image "/path/to/reference.png" \
  "edit: change the background to cream/off-white"
```

The reference image(s) are used for all 3 aspect ratios.

## Brand Logo (IMPORTANT — Read Before Generating)

Every ad should include the brand logo unless explicitly told otherwise. The script looks for it at:

```
workspace/brand/logo-primary.png
```

(Relative to profile root — each profile has its own copy.)

**Before generating ads, ALWAYS check if the brand logo exists.** If it's missing:

1. **ASK the user** to upload their brand logo before proceeding
2. Explain that ads without a logo look generic and won't represent the brand
3. Once uploaded, copy it to `workspace/brand/logo-primary.png` so it persists

**When cloning an ad that didn't have a logo**, pass `--no-logo` to suppress logo injection:

```bash
generate_ads_safe.sh \
  --no-logo \
  --input-image "/path/to/original.png" \
  "clone this ad exactly"
```

**Logo color:** The saved logo may be white-on-transparent or black-on-transparent. In your prompt, tell the model to adjust the logo color to match the ad (e.g. "use the logo but make it white" for dark backgrounds, or "make the logo dark/black" for light backgrounds). The AI will adapt it.

**Logo priority:**

1. `workspace/brand/logo-primary.{png,jpg,jpeg,webp,gif}` — persistent brand logo (preferred)
2. No logo — if not found (script logs where to place one)

**Note:** The script no longer falls back to random files in `media/inbound/`. Only the explicit brand logo is used.

## What Happens Behind the Scenes

1. **Derives profile root** from script location (no hardcoded paths — works for any profile)
2. **Checks for brand logo**: Looks in `workspace/brand/logo-primary.png`
3. **Generates 3 images** via Vertex AI `gemini-3-pro-image-preview`:
   - 1:1 (square) — feeds, thumbnails
   - 9:16 (vertical) — Stories, Reels (safe-zone padding auto-added)
   - 16:9 (landscape) — YouTube, banners
4. **Uploads each to Slack**: 3 separate messages in the requesting thread

## Displaying Images After Generation

After the script completes, display all 3 images using Read tool:

```
Read: <profile_media_dir>/YYYY-MM-DD-HH-MM-SS-1x1.png
Read: <profile_media_dir>/YYYY-MM-DD-HH-MM-SS-9x16.png
Read: <profile_media_dir>/YYYY-MM-DD-HH-MM-SS-16x9.png
```

## Backend Details

- **Primary**: Vertex AI `gemini-3-pro-image-preview` at `locations/global` (high quota, no rate limits)
- **Fallback**: AI Studio `gemini-3-pro-image-preview` (if Vertex fails)
- Resolution: **2K** for all images
- The script handles backend selection automatically — do not pass `--backend` manually

## Single Image Generation (NON-AD use only)

For a truly single image (NOT ads), use generate_image.py directly:

```bash
uv run <profile_root>/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "your prompt" \
  --filename "<profile_media_dir>/output.png" \
  --resolution 2K \
  --input-image "/path/to/input.png"  # for editing
```

**WARNING**: For ad images, ALWAYS use generate_ads_safe.sh. It generates all 3 aspect ratios and handles Slack upload automatically.

## Timing

- Generates 3 images sequentially (~10-25 seconds each on Vertex)
- **Total time: ~1 minute**
- Use a yield/timeout of at least **300000ms (5 minutes)** when calling via exec

## Meta Safe Zones for 9:16

The script automatically adds "vertical center composition, clean empty space at top and bottom edges" to 9:16 prompts to ensure safe zones for Instagram/Facebook overlays.

## Flags Reference

| Flag                       | Description                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--name <slug>`            | **ALWAYS USE.** Concept name for filenames and Slack titles (e.g., `--name "product-hero"`).                                                        |
| `--input-image <path>`     | Reference/inspiration image. Can be used MULTIPLE times.                                                                                            |
| `--reference-image <path>` | Alias for `--input-image`.                                                                                                                          |
| `--expect-references N`    | **REQUIRED when user uploaded images.** Hard-fails if fewer than N `--input-image` flags are passed. Set to the number of images the user uploaded. |
| `--no-logo`                | Suppress automatic brand logo injection.                                                                                                            |
