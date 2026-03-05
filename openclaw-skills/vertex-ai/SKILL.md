---
name: vertex-ai
description: Test and use Google Vertex AI for video/image generation as an alternative
  to AI Studio when rate limits are hit. Use to check connectivity, test quota availability,
  or explicitly route to Vertex AI backends.
complexity: moderate
allowed-tools:
  - exec
requires:
  env: ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS']
---

# Vertex AI Integration

Vertex AI provides higher rate limits than AI Studio for Veo video generation and Gemini image generation.

## Config

- **GCP Project**: `gen-lang-client-0013158607`
- **Location**: `us-central1`
- **Auth**: `GOOGLE_APPLICATION_CREDENTIALS` → `~/.config/gcloud/vertex-service-account.json`

## AI Studio vs Vertex AI

|                 | AI Studio                         | Vertex AI                             |
| --------------- | --------------------------------- | ------------------------------------- |
| Auth            | GEMINI_API_KEY                    | Service Account / ADC                 |
| Veo GA RPM      | Low (easily exhausted)            | 50 RPM                                |
| Veo Preview RPM | Low                               | 10 RPM                                |
| Imagen RPM      | ~10-20/day free tier              | 200 RPM fast                          |
| Endpoint        | generativelanguage.googleapis.com | us-central1-aiplatform.googleapis.com |

## Vertex Model IDs

| Use Case                    | Model ID                                        |
| --------------------------- | ----------------------------------------------- |
| Veo fast (GA, preferred)    | `veo-3.1-fast-generate-001`                     |
| Veo quality (GA, preferred) | `veo-3.1-generate-001`                          |
| Image gen (direct SDK)      | `gemini-3-pro-image-preview` (location: global) |

## Connectivity Tests

```bash
# Test Veo/text access (no video quota spent)
uv run ~/.openclaw/skills/vertex-ai/scripts/test_vertex_veo.py

# Test image gen via litellm proxy
uv run ~/.openclaw/skills/vertex-ai/scripts/test_vertex_imagen.py
```

## Explicit Vertex Backends

### Veo Video Generation

```bash
uv run ~/.openclaw/skills/veo-video-gen/scripts/generate_video.py \
  --prompt "A mountain lake at dawn, golden light on water" \
  --filename "/Users/novarussell/.openclaw/media/test-vertex.mp4" \
  --backend vertex-veo-fast \
  --no-upload
```

### Image Generation (direct Vertex model)

```bash
uv run ~/.openclaw/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "a golden sunset, minimalist" \
  --filename "/Users/novarussell/.openclaw/media/test-vertex-img.png" \
  --backend vertex-gemini
```

### Image via litellm proxy (curl)

```bash
curl -s -X POST http://localhost:4000/v1/images/generations \
  -H "Authorization: Bearer $LITELLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"nano-banana-vertex","prompt":"a golden sunset, minimalist","n":1,"size":"1024x1024"}'
```

## Auto-Fallback (Veo)

The `veo-video-gen` skill automatically falls back to Vertex AI when AI Studio returns 429/ResourceExhausted. No manual intervention needed. Logs: `AI Studio unavailable (...). Falling back to Vertex AI...`

## Auto-Fallback (Images)

The litellm router in `config.yaml` routes:

- `nano-banana` → fallback to `nano-banana-pro` → `nano-banana-vertex`
- `nano-banana-pro` → fallback to `nano-banana` → `nano-banana-pro-vertex`

## Known Limitations

- **Reference images NOT forwarded on Vertex image fallback**: LiteLLM's `vertex_ai/` image path does not expose reference image params. Vertex fallback generates fresh from prompt only.
- **Veo style images not supported**: Only Veo 2.0-generate-exp supported style reference; Veo 3.1 does not.

## REST API Reference

```bash
# Text (verify auth)
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}' \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/gen-lang-client-0013158607/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent"
```
