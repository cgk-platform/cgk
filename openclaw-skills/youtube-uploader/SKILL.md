---
name: youtube-uploader
description: Upload videos to YouTube with full metadata, thumbnails, playlists, Shorts detection, and scheduled publishing.
complexity: medium
allowed-tools:
  - exec
  - slack
---

# YouTube Uploader

Upload videos to YouTube via the YouTube Data API v3 with OAuth 2.0.

> **ALWAYS use `youtube_upload_safe.sh`** — NEVER call `_youtube_upload_internal.py` directly. The internal script will reject execution without the env gate.

## Quick Start

```bash
SLACK_CHANNEL_ID="C0ADZGUJS4A" \
SLACK_THREAD_TS="1234567890.123456" \
  ~/.openclaw/skills/youtube-uploader/scripts/youtube_upload_safe.sh \
  --file "/Users/novarussell/.openclaw/media/my-video.mp4" \
  --title "My Video Title" \
  --description "Video description here" \
  --privacy private
```

## Parameters

| Parameter                  | Short | Required | Default   | Description                                        |
| -------------------------- | ----- | -------- | --------- | -------------------------------------------------- |
| `--file`                   | `-f`  | YES      | —         | Video file path (absolute)                         |
| `--title`                  | `-t`  | YES      | —         | Video title (max 100 chars)                        |
| `--description`            | `-d`  | no       | ""        | Description (max 5000 chars)                       |
| `--tags`                   | —     | no       | []        | Comma-separated tags                               |
| `--category`               | `-c`  | no       | "22"      | YouTube category ID (22 = People & Blogs)          |
| `--privacy`                | `-p`  | no       | "private" | private / unlisted / public                        |
| `--publish-at`             | —     | no       | —         | ISO 8601 scheduled publish time (requires private) |
| `--thumbnail`              | —     | no       | —         | Custom thumbnail image path                        |
| `--playlist-id`            | —     | no       | —         | Add to playlist after upload                       |
| `--notify` / `--no-notify` | —     | no       | true      | Notify subscribers                                 |
| `--no-synthetic-flag`      | —     | no       | —         | Skip AI content declaration                        |
| `--no-upload-msg`          | —     | no       | —         | Skip Slack success message                         |

## Shorts Auto-Detection

The script automatically detects YouTube Shorts:

- Video is vertical (height > width)
- Duration is 60 seconds or less

When detected, `#Shorts` is appended to the title if not already present.

## Examples

### Upload as private (default, safest)

```bash
SLACK_CHANNEL_ID="$CH" SLACK_THREAD_TS="$TS" \
  youtube_upload_safe.sh -f "/path/to/video.mp4" -t "My Video" -p private
```

### Upload with thumbnail and playlist

```bash
SLACK_CHANNEL_ID="$CH" SLACK_THREAD_TS="$TS" \
  youtube_upload_safe.sh \
  -f "/path/to/video.mp4" \
  -t "Product Showcase" \
  -d "Our latest collection" \
  --tags "brand,product,showcase" \
  --thumbnail "/path/to/thumb.jpg" \
  --playlist-id "PLxxxxxxxxxxxxxxxx" \
  -p unlisted
```

### Schedule for future publish

```bash
SLACK_CHANNEL_ID="$CH" SLACK_THREAD_TS="$TS" \
  youtube_upload_safe.sh \
  -f "/path/to/video.mp4" \
  -t "Scheduled Video" \
  -p private \
  --publish-at "2026-03-15T10:00:00-08:00"
```

### Upload without AI content flag

```bash
SLACK_CHANNEL_ID="$CH" SLACK_THREAD_TS="$TS" \
  youtube_upload_safe.sh -f "/path/to/video.mp4" -t "Non-AI Video" --no-synthetic-flag
```

## AI Content Declaration

By default, `containsSyntheticMedia: true` is set on all uploads (most openCLAW videos are AI-generated). Use `--no-synthetic-flag` to skip this for non-AI content.

## Credential Setup

1. Create a Google Cloud Project with YouTube Data API v3 enabled
2. Create OAuth 2.0 Desktop credentials -> get client ID + secret
3. Fill `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` in `.env`
4. Run the auth helper: `uv run ~/.openclaw/skills/youtube-uploader/scripts/youtube_auth_setup.py`
5. Complete the browser consent flow with the YouTube channel owner
6. The script will print the refresh token and channel ID

## Quota

YouTube Data API default quota: 10,000 units/day. Each `videos.insert` costs 100 units, `thumbnails.set` ~50 units, `playlistItems.insert` ~50 units. A full upload with thumbnail + playlist = ~200 units (~50 uploads/day). Request quota increase via Google Cloud Console if needed.

## Category IDs (Common)

| ID  | Category                 |
| --- | ------------------------ |
| 1   | Film & Animation         |
| 2   | Autos & Vehicles         |
| 10  | Music                    |
| 15  | Pets & Animals           |
| 17  | Sports                   |
| 20  | Gaming                   |
| 22  | People & Blogs (default) |
| 24  | Entertainment            |
| 25  | News & Politics          |
| 26  | Howto & Style            |
| 28  | Science & Technology     |

## Critical Rules

1. **ALWAYS** use `youtube_upload_safe.sh` — never the internal script
2. **ALWAYS** set `SLACK_CHANNEL_ID` and `SLACK_THREAD_TS`
3. **ALWAYS** upload as `private` first unless the user explicitly requests public/unlisted
4. **NEVER** hardcode credentials — they live in `.env`
5. Video file path MUST be absolute
6. On failure: STOP. No hacks, no workarounds.
