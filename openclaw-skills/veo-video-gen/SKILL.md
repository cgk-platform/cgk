---
name: veo-video-gen
description: Generate videos with Veo 3.1 (Google), Kling 3.0 (Kuaishou), or Sora 2 (OpenAI). Supports text-to-video AND image-to-video with customizable duration, aspect ratio, resolution, person generation, and multi-video batch output. Video extension/continuation up to ~3 minutes. Automatically uploads to Slack.
complexity: moderate
allowed-tools:
  - exec
---

# Veo/Kling/Sora Video Generation

Generate high-quality videos using:

- **Veo 3.1** (Google) — 1080p videos with native audio/dialogue/music
- **Kling** (Kuaishou) — 1080p videos with native audio in 5 languages, 5-10s, best for long-form via extension (default model: kling-v3-0)
- **Sora 2** (OpenAI) — Variable duration videos (fallback)

**Preferred backend order**: `veo-fast` (primary) → `kling-pro` (secondary) → `sora` (tertiary)

**Default backend: `vertex-veo-fast`** (Veo 3.1 Fast on Vertex AI, auto-falls back to AI Studio)

> **NEVER call `_generate_video_internal.py` or `_extend_video_internal.py` directly — they WILL reject the call. Use `generate_video_safe.sh` and `extend_video_safe.sh` instead.**

## Quick Start

```bash
SLACK_CHANNEL_ID="<channel_id>" \
SLACK_THREAD_TS="<thread_ts>" \
  ~/.openclaw-rawdog/skills/veo-video-gen/scripts/generate_video_safe.sh \
  --prompt "your video description" \
  --filename "/Users/novarussell/.openclaw-rawdog/media/$(date +%Y-%m-%d-%H-%M-%S)-video.mp4"
```

## All Parameters

| Parameter             | Short | Required | Values                                   | Default           | Description                                                             |
| --------------------- | ----- | -------- | ---------------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| `--prompt`            | `-p`  | YES      | text                                     | —                 | Full video description including dialogue/voiceover                     |
| `--filename`          | `-f`  | YES      | path                                     | —                 | Output path (absolute, to `~/.openclaw-rawdog/media/`)                  |
| `--backend`           | `-b`  | no       | see below                                | `vertex-veo-fast` | Generation backend                                                      |
| `--duration`          | `-d`  | no       | integer (seconds)                        | `8`               | Video length                                                            |
| `--aspect-ratio`      | `-a`  | no       | `9:16`, `16:9`, `1:1`                    | `9:16`            | Aspect ratio                                                            |
| `--resolution`        | `-r`  | no       | `720p`, `1080p`                          | `1080p`           | Output resolution                                                       |
| `--num-videos`        | `-n`  | no       | `1`, `2`, `3`, `4`                       | `1`               | Number of videos to generate in one call                                |
| `--person-generation` | —     | no       | `allow_all`, `allow_adult`, `dont_allow` | unset             | Person generation policy                                                |
| `--seed`              | —     | no       | integer                                  | unset             | Seed for reproducibility                                                |
| `--reference-image`   | `-I`  | no       | path                                     | —                 | Reference image for image-to-video                                      |
| `--negative-prompt`   | —     | no       | text                                     | —                 | Negative prompt (Kling V1 only, skipped on v2.5+)                       |
| `--kling-model`       | —     | no       | model name                               | `kling-v3-0`      | Kling model override (kling-v1, kling-v2-6, kling-video-o1, kling-v3-0) |
| `--cfg-scale`         | —     | no       | float 0-1                                | `0.5`             | CFG scale (Kling V1 only, ignored on v2+)                               |
| `--camera`            | —     | no       | preset or JSON                           | —                 | Camera control for Kling text2video (V1 only, see presets below)        |
| `--multi-shot`        | —     | no       | JSON array                               | —                 | Multi-shot scenes for Kling (see below)                                 |
| `--end-image`         | —     | no       | path                                     | —                 | End-frame image for Kling image-to-video (image_tail)                   |
| `--no-upload`         | —     | no       | flag                                     | —                 | Skip automatic Slack upload                                             |

## Backends

| Backend              | Model                           | Route                          | Notes                                                        |
| -------------------- | ------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| `vertex-veo-fast`    | `veo-3.1-fast-generate-001`     | Vertex AI → AI Studio fallback | **Default.** GA model, 50 RPM                                |
| `vertex-veo-quality` | `veo-3.1-generate-001`          | Vertex AI → AI Studio fallback | Higher quality, slower                                       |
| `veo-fast`           | `veo-3.1-fast-generate-preview` | AI Studio → Vertex fallback    | AI Studio first                                              |
| `veo-quality`        | `veo-3.1-generate-preview`      | AI Studio → Vertex fallback    | AI Studio first                                              |
| `kling-pro`          | `kling-v3-0` (pro mode)         | Kling REST API                 | 1080p, ~60s gen, best quality. Override with `--kling-model` |
| `kling-std`          | `kling-v3-0` (std mode)         | Kling REST API                 | 720p, ~30s gen, faster. Override with `--kling-model`        |
| `sora`               | Sora 2                          | OpenAI via litellm             | Fallback option                                              |

**Auto-fallback**: vertex backends fall back to AI Studio on failure; AI Studio backends fall back to Vertex on rate limit.

## Video Extension

Extend/continue a previously generated video using `extend_video_safe.sh`. Reads the `.meta.json` sidecar (auto-created by `generate_video_safe.sh`) to detect the backend and call the appropriate extension API.

### Extension Command

```bash
SLACK_CHANNEL_ID="<channel_id>" \
SLACK_THREAD_TS="<thread_ts>" \
  ~/.openclaw-rawdog/skills/veo-video-gen/scripts/extend_video_safe.sh \
  --video "/Users/novarussell/.openclaw-rawdog/media/original-video.mp4" \
  --prompt "continuation description" \
  --extensions 3
```

### Extension Parameters

| Parameter           | Short | Required | Default                   | Description                                    |
| ------------------- | ----- | -------- | ------------------------- | ---------------------------------------------- |
| `--video`           | `-v`  | YES      | —                         | Path to video (must have `.meta.json` sidecar) |
| `--prompt`          | `-p`  | no       | original prompt           | Continuation prompt                            |
| `--negative-prompt` | —     | no       | —                         | Negative prompt (Kling only)                   |
| `--extensions`      | `-n`  | no       | `1`                       | Number of extensions to chain                  |
| `--filename`        | `-f`  | no       | `{original}_extended.mp4` | Output path                                    |
| `--no-upload`       | —     | no       | —                         | Skip Slack upload                              |

### Extension Behavior Per Backend

| Backend | Method                                  | Per Extension | Max Total       | Notes                                                   |
| ------- | --------------------------------------- | ------------- | --------------- | ------------------------------------------------------- |
| Kling   | Dedicated `/video-extend` endpoint      | +5s           | ~3 min          | Best for long-form, chains via video_id                 |
| Veo 3.1 | SDK re-call with video ref              | +7s           | ~148s (2.5 min) | 720p only, requires AI Studio backend, 2-day URI expiry |
| Sora 2  | Frame extract + image-to-video + concat | configurable  | ~60s practical  | Coherence degrades, no audio continuity                 |

### Extension Notes

- **Prerequisite**: The video must have a `.meta.json` sidecar (auto-created by `generate_video_safe.sh`)
- **Veo**: Only AI Studio backends (`veo-fast`, `veo-quality`) save the video URI needed for extension. Vertex-generated videos cannot be extended — regenerate with an AI Studio backend first. URIs expire after **2 days**.
- **Sora**: Uses frame extraction + image-to-video + ffmpeg concat. Requires `ffmpeg` installed. Calls OpenAI directly (not litellm).
- **Kling**: Best for long-form — dedicated `/video-extend` endpoint, chains via `video_id` (saved in `.meta.json`).

## Multi-Video Output (`--num-videos`)

Generate 1–4 variations in one call:

```bash
SLACK_CHANNEL_ID="<channel>" SLACK_THREAD_TS="<thread>" \
  ~/.openclaw-rawdog/skills/veo-video-gen/scripts/generate_video_safe.sh \
  --prompt "A serene beach at sunset with gentle waves" \
  --filename "/Users/novarussell/.openclaw-rawdog/media/$(date +%Y-%m-%d-%H-%M-%S)-beach.mp4" \
  --num-videos 4 \
  --duration 8
```

When `--num-videos > 1`, files are saved as `{stem}_1.mp4`, `{stem}_2.mp4`, etc. All are uploaded to Slack individually.

## Person Generation

Controls whether and what age of people can appear:

```bash
--person-generation allow_all    # All ages allowed (good for family/lifestyle content)
--person-generation allow_adult  # Adults only
--person-generation dont_allow   # No people (product shots, landscapes)
```

Default is unset (model decides). For ad content featuring people, use `allow_adult` or `allow_all`.

## Resolution

```bash
--resolution 1080p   # Default — full HD
--resolution 720p    # Faster generation, smaller files
```

## Seed (Reproducibility)

```bash
--seed 42   # Reproduce a specific generation
--seed 0    # Fixed seed from the docs example
```

Useful for iterating on a prompt while keeping similar composition.

## Image-to-Video

```bash
SLACK_CHANNEL_ID="<channel>" SLACK_THREAD_TS="<thread>" \
  ~/.openclaw-rawdog/skills/veo-video-gen/scripts/generate_video_safe.sh \
  --prompt "A woman relaxing in white bedding, camera slowly dollies forward, morning sunlight streaming through windows" \
  --reference-image "/Users/novarussell/.openclaw-rawdog/media/remixed-frame.png" \
  --filename "/Users/novarussell/.openclaw-rawdog/media/$(date +%Y-%m-%d-%H-%M-%S)-from-image.mp4" \
  --duration 8 \
  --aspect-ratio 9:16 \
  --person-generation allow_adult
```

## Kling Camera Control (`--camera`)

Control camera movement in Kling text-to-video generation. **V1 models only** (`--kling-model kling-v1`) — camera_control is not supported on v2+ models and will be ignored with a warning.

### Named Presets (type-based, no config)

| Preset       | API type             | Effect                            |
| ------------ | -------------------- | --------------------------------- |
| `down-back`  | `down_back`          | Camera moves down and back        |
| `forward-up` | `forward_up`         | Camera moves forward and up       |
| `right-turn` | `right_turn_forward` | Camera turns right moving forward |
| `left-turn`  | `left_turn_forward`  | Camera turns left moving forward  |

### Simple Movement Presets (type="simple" with config)

| Preset      | Effect                           |
| ----------- | -------------------------------- |
| `dolly-in`  | Zoom into scene (zoom=10)        |
| `dolly-out` | Zoom out of scene (zoom=-10)     |
| `pan-left`  | Camera pans left (pan=-10)       |
| `pan-right` | Camera pans right (pan=10)       |
| `tilt-up`   | Camera tilts upward (tilt=10)    |
| `tilt-down` | Camera tilts downward (tilt=-10) |
| `zoom-in`   | Zoom into scene (zoom=10)        |
| `zoom-out`  | Zoom out of scene (zoom=-10)     |

```bash
SLACK_CHANNEL_ID="<channel>" SLACK_THREAD_TS="<thread>" \
  ~/.openclaw-rawdog/skills/veo-video-gen/scripts/generate_video_safe.sh \
  --prompt "A cat sitting on a windowsill" \
  --filename "/Users/novarussell/.openclaw-rawdog/media/cat-dolly.mp4" \
  --backend kling-pro --kling-model kling-v1 --camera dolly-in
```

For custom camera values, pass raw JSON matching the official API structure: `--camera '{"type": "simple", "config": {"horizontal": 0, "vertical": 0, "pan": -5, "tilt": 0, "roll": 0, "zoom": 3}}'`

## Kling Multi-Shot (`--multi-shot`)

Generate multi-scene videos (3-15s total) in a single Kling call. Pass a JSON array of scenes:

```bash
SLACK_CHANNEL_ID="<channel>" SLACK_THREAD_TS="<thread>" \
  ~/.openclaw-rawdog/skills/veo-video-gen/scripts/generate_video_safe.sh \
  --filename "/Users/novarussell/.openclaw-rawdog/media/multi-shot.mp4" \
  --backend kling-pro \
  --multi-shot '[{"prompt":"Wide shot of a beach at sunrise","duration":5},{"prompt":"Close-up of waves crashing on rocks","duration":5}]'
```

When `--multi-shot` is provided, `--prompt` is ignored. Each shot needs `prompt` and `duration` (seconds).

## Kling End-Frame (`--end-image`)

For Kling image-to-video, specify an end-frame image to create smooth start-to-end transitions:

```bash
SLACK_CHANNEL_ID="<channel>" SLACK_THREAD_TS="<thread>" \
  ~/.openclaw-rawdog/skills/veo-video-gen/scripts/generate_video_safe.sh \
  --prompt "Smooth zoom transition" \
  --reference-image start.png --end-image end.png \
  --filename "/Users/novarussell/.openclaw-rawdog/media/transition.mp4" \
  --backend kling-pro
```

## Kling Model Override (`--kling-model`)

Default model is `kling-v2-6`. Override for newer/different models:

```bash
--kling-model kling-video-o1   # Reasoning model
--kling-model kling-v2-5-turbo # Turbo variant
--kling-model kling-v3-0       # V3 (if available on your account)
```

## Audio / Voiceover

Veo 3.1 generates audio natively (dialogue, sound effects, ambient, music). Audio is always enabled on Vertex backends. Kling v2-6+ also generates native audio via `enable_audio: true` (sent automatically for v2+ models).

- Include spoken dialogue directly in the prompt in quotes
- Example: `A woman says, "Your bedroom really says a lot about you."`
- Keep spoken lines under ~7 words each for best lip-sync
- **Kling**: Audio is auto-enabled on v2-6+ models. Not available when using `--end-image` (image_tail is incompatible with enable_audio). V1 models do not support audio.

## Full-Featured Example

```bash
SLACK_CHANNEL_ID="<CHANNEL_ID>" \
SLACK_THREAD_TS="<THREAD_TS>" \
  ~/.openclaw-rawdog/skills/veo-video-gen/scripts/generate_video_safe.sh \
  --prompt "The camera dollies to show a close up of a desperate man in a green trench coat making a call on a rotary wall phone with green neon light, cinematic movie scene" \
  --filename "/Users/novarussell/.openclaw-rawdog/media/$(date +%Y-%m-%d-%H-%M-%S)-trenchcoat.mp4" \
  --backend vertex-veo-quality \
  --duration 8 \
  --aspect-ratio 9:16 \
  --resolution 1080p \
  --num-videos 4 \
  --person-generation allow_all \
  --seed 0
```

## Output

- Saves MP4(s) to specified path (or `{stem}_1.mp4`, `{stem}_2.mp4` for multi-video)
- Saves `.meta.json` sidecar alongside each video (for extension support)
- Uploads each video to Slack automatically (unless `--no-upload`)
- Prints `MEDIA:<full_path>` for each video
- Prints `SLACK_UPLOADED:true` on successful upload

## Timing

- **Veo**: 60–120 seconds per generation
- **Kling**: ~30s (std) to ~60s (pro) per generation
- **Sora**: 60–90 seconds
- For `--num-videos 4`: allow up to **10 minutes** (videos generate in parallel on Vertex)
- Use a yield/timeout of at least **600000ms (10 minutes)** for multi-video or extension calls

## CRITICAL RULES

- **NEVER modify, shorten, or simplify the user's prompt.** Pass it exactly as provided.
- **NEVER remove dialogue, voiceover, or narration** from the prompt.
- **NEVER edit this script.** If it fails, try a different backend or report the error.
- If one backend fails, try another (`vertex-veo-fast` → `vertex-veo-quality` → `kling-pro` → `sora`).

## API Keys / Auth

- **Vertex**: `GOOGLE_APPLICATION_CREDENTIALS` → `~/.config/gcloud/vertex-service-account.json`
- **AI Studio**: `GEMINI_API_KEY`
- **Kling**: `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` (JWT auth)
- **Sora**: `OPENAI_API_KEY` (via litellm proxy)
