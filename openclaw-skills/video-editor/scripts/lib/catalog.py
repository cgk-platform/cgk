"""
catalog.py — Footage folder analysis via Gemini Flash.

Catalogs a folder of video clips with content segments and timestamps.
Key optimization: for Google Drive folders, tries Gemini analysis via URL
first (no download). Downloads happen only when clips are selected.

Reuses _extract_frames(), _call_gemini(), _get_video_duration() from analyze.py.
"""

import json
import os
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path


# Limits
MAX_CLIPS = 50
MIN_FILE_SIZE = 100_000         # 100 KB — lowered to include compressed social clips
MAX_FILE_SIZE = 500_000_000     # 500 MB
MAX_DURATION = 300              # 5 minutes
GEMINI_DELAY = 4.0              # seconds between API calls (Pro needs more headroom)
GEMINI_MAX_RETRIES = 3          # retries on rate limit / transient errors
GEMINI_RETRY_BASE = 15.0        # base backoff seconds (doubles each retry)

# Video extensions for local folder scanning
VIDEO_EXTENSIONS = frozenset({".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"})


def _list_local_videos(folder_path: str) -> list[dict]:
    """List video files in a local directory (non-recursive).

    Returns list of {path, name, size} dicts sorted by name.
    """
    folder = Path(folder_path)
    if not folder.is_dir():
        return []

    videos = []
    for f in sorted(folder.iterdir()):
        if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS:
            videos.append({
                "path": str(f),
                "name": f.name,
                "size": f.stat().st_size,
            })
    return videos


def _analyze_single_clip_local(video_path: str, filename: str, temp_dir: str) -> dict:
    """Analyze one local clip via Gemini Flash using frame extraction.

    Returns clip info dict with segments, or dict with error key.
    """
    from lib.analyze import _extract_frames, _call_gemini, _get_video_duration

    duration = _get_video_duration(video_path)
    if duration <= 0:
        return {"filename": filename, "error": "Could not determine duration"}
    if duration > MAX_DURATION:
        return {"filename": filename, "error": f"Too long ({duration:.0f}s > {MAX_DURATION}s limit)"}

    # Use frame extraction for analysis
    frames_dir = os.path.join(temp_dir, filename.replace(".", "_"))
    os.makedirs(frames_dir, exist_ok=True)

    # Adjust fps based on clip length: shorter clips get more frames per second
    fps = 2.0 if duration < 30 else 1.0 if duration < 120 else 0.5
    frames = _extract_frames(video_path, frames_dir, fps=fps)

    prompt = _build_catalog_prompt(filename, duration)

    if frames:
        # Build multimodal message with frames
        import base64
        content_parts = [{"type": "text", "text": prompt}]
        for frame in frames[:30]:
            with open(frame, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            })

        response = _call_gemini_content(content_parts)
    else:
        # Text-only fallback
        response = _call_gemini(prompt)

    return _parse_clip_analysis(response, filename, video_path, duration)


def _analyze_single_clip_url(video_url: str, filename: str, duration: float) -> dict | None:
    """Try Gemini analysis via video URL (for Drive files — no download needed).

    Returns clip info dict, or None if URL approach fails.
    """
    if duration <= 0 or duration > MAX_DURATION:
        return None

    prompt = _build_catalog_prompt(filename, duration)

    content_parts = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": video_url}},
    ]

    try:
        response = _call_gemini_content(content_parts)
        if not response:
            return None
        result = _parse_clip_analysis(response, filename, None, duration)
        if "error" not in result and result.get("segments"):
            return result
        return None
    except Exception:
        return None


def _build_catalog_prompt(filename: str, duration: float) -> str:
    """Build the Gemini prompt for footage cataloging."""
    return f"""Analyze this video clip "{filename}" ({duration:.1f}s) for a footage catalog.
Identify distinct content segments with timestamps. For each segment provide:

- "start": start time in seconds (float)
- "end": end time in seconds (float)
- "description": what's happening visually (1 sentence)
- "camera": camera angle/movement (e.g., close-up, wide, pan, tracking, static, rack focus, overhead)
- "mood": emotional tone (e.g., warm, energetic, calm, dramatic, premium, playful)
- "subjects": key visual subjects (comma-separated, e.g., "hands, product, jar")
- "motion": camera/subject motion description (e.g., "slow pan right", "static", "handheld shake")
- "text_overlay": any visible text, brand names, captions, or product labels (exact words, or "none")
- "text_overlay_severity": how much burned-in text covers the footage:
  - "none" = no visible text at all
  - "light" = small watermark, corner logo, or brief text flash (<20% of frame)
  - "heavy" = large captions, subtitles, or text covering significant area (>=20% of frame, or persistent throughout segment)
- "quality_score": integer 1-5 rating of visual production quality for this segment:
  - 5 = Professional production quality: excellent lighting, perfectly stable, sharp focus, clean composition
  - 4 = Good quality: minor issues (slight noise, minor shake, small exposure issue) but clearly usable
  - 3 = Acceptable: noticeable issues (shaky handheld, soft focus, poor lighting, heavy compression artifacts)
  - 2 = Below average: significant issues (very shaky, heavily overexposed/underexposed, motion blur, poor framing)
  - 1 = Poor quality: barely usable (extreme shake, out of focus, nearly black/white, severe artifacts)
- "quality_notes": brief explanation of the quality score (1 short sentence, e.g., "Stable close-up with professional lighting" or "Heavy handheld shake throughout")

Respond ONLY with valid JSON in this exact format:
{{
  "segments": [
    {{"start": 0.0, "end": 3.2, "description": "...", "camera": "...", "mood": "...", "subjects": "...", "motion": "...", "text_overlay": "...", "text_overlay_severity": "none|light|heavy", "quality_score": 4, "quality_notes": "..."}}
  ]
}}

CRITICAL RULES:
- Be SPECIFIC about products. Do NOT use generic terms. Identify the EXACT product type:
  e.g., "bed skirt" NOT "sheets", "fitted sheet" NOT "bedding", "duvet cover" NOT "blanket"
- If you see text on screen, transcribe it exactly in text_overlay
- For text_overlay_severity: TikTok/Instagram captions, large subtitles, and persistent text banners = "heavy". Small logos or brief price tags = "light".
- Be precise with timestamps. Identify meaningful segments (not every frame change).
- Focus purely on cataloging what's in the footage. No marketing analysis.
- quality_score MUST be an integer 1-5. quality_notes MUST be a non-empty string."""


def _call_gemini_content(content_parts: list) -> str:
    """Call Gemini Pro via LiteLLM with multimodal content parts.

    Retries on rate limits (429) and server errors (5xx) with exponential backoff.
    """
    import requests

    litellm_key = os.environ.get("LITELLM_API_KEY", "")
    litellm_base = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000")
    base_url = f"{litellm_base.rstrip('/')}/v1"

    headers = {"Content-Type": "application/json"}
    if litellm_key:
        headers["Authorization"] = f"Bearer {litellm_key}"

    payload = {
        "model": "gemini-3-pro",
        "messages": [{"role": "user", "content": content_parts}],
        "temperature": 0.2,
        "max_tokens": 4096,
    }

    for attempt in range(GEMINI_MAX_RETRIES + 1):
        try:
            resp = requests.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=120,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.ConnectionError:
            print(f"ERROR: Cannot connect to LiteLLM proxy at {base_url}.")
            return ""
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else 0
            if status in (429, 500, 502, 503) and attempt < GEMINI_MAX_RETRIES:
                wait = GEMINI_RETRY_BASE * (2 ** attempt)
                print(f"    Rate limited ({status}), retrying in {wait:.0f}s... (attempt {attempt + 1}/{GEMINI_MAX_RETRIES})")
                time.sleep(wait)
                continue
            print(f"WARNING: Gemini call failed after {attempt + 1} attempt(s): {e}")
            return ""
        except Exception as e:
            if attempt < GEMINI_MAX_RETRIES:
                wait = GEMINI_RETRY_BASE * (2 ** attempt)
                print(f"    Error: {e}, retrying in {wait:.0f}s... (attempt {attempt + 1}/{GEMINI_MAX_RETRIES})")
                time.sleep(wait)
                continue
            print(f"WARNING: Gemini call failed after {attempt + 1} attempt(s): {e}")
            return ""
    return ""


def _compute_technical_quality(
    width: int,
    height: int,
    fps: float,
    codec: str,
    file_size: int,
    duration: float,
) -> float:
    """Compute a technical quality score 0.0-1.0 from ffprobe metadata.

    Factors:
      - Resolution: 1080p+ = 1.0, 720p = 0.8, 480p = 0.5, below = 0.3
      - Bitrate (estimated from file size / duration): higher = better, clamped 0.0-1.0
      - FPS: 60fps = 1.0, 30fps = 1.0, 24fps = 0.9, below 24 = 0.7
    """
    # Resolution factor
    long_edge = max(width, height)
    if long_edge >= 1080:
        res_factor = 1.0
    elif long_edge >= 720:
        res_factor = 0.8
    elif long_edge >= 480:
        res_factor = 0.5
    elif long_edge > 0:
        res_factor = 0.3
    else:
        res_factor = 0.5  # Unknown — assume mid

    # Bitrate factor: estimate from file size and duration
    bitrate_factor = 0.5  # Default for unknown
    if file_size > 0 and duration > 0:
        bitrate_bps = (file_size * 8) / duration
        # Normalize: 10 Mbps = 1.0, 1 Mbps = 0.3, scale linearly
        # Clamp to [0.1, 1.0]
        bitrate_factor = min(1.0, max(0.1, bitrate_bps / 10_000_000))

    # FPS factor
    if fps >= 29.9:
        fps_factor = 1.0
    elif fps >= 23.9:
        fps_factor = 0.9
    elif fps > 0:
        fps_factor = 0.7
    else:
        fps_factor = 0.8  # Unknown — assume adequate

    # Weighted composite (resolution matters most, bitrate second, fps least)
    return 0.5 * res_factor + 0.35 * bitrate_factor + 0.15 * fps_factor


def _parse_clip_analysis(
    response: str,
    filename: str,
    video_path: str | None,
    duration: float,
) -> dict:
    """Parse Gemini response into clip catalog entry."""
    result = {
        "filename": filename,
        "path": video_path,
        "duration": duration,
        "width": 0, "height": 0,
        "resolution": "unknown",
        "fps": 0, "codec": "unknown",
        "segments": [],
    }

    # Get video metadata if we have a local path
    file_size = 0
    if video_path and os.path.exists(video_path):
        file_size = os.path.getsize(video_path)
        try:
            import subprocess
            probe_result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json",
                 "-show_streams", video_path],
                capture_output=True, text=True, timeout=15,
            )
            if probe_result.returncode == 0:
                probe = json.loads(probe_result.stdout)
                for stream in probe.get("streams", []):
                    if stream.get("codec_type") == "video":
                        result["width"] = int(stream.get("width", 0))
                        result["height"] = int(stream.get("height", 0))
                        result["resolution"] = f"{result['width']}x{result['height']}"
                        result["codec"] = stream.get("codec_name", "unknown")
                        fps_str = stream.get("r_frame_rate", "0/1")
                        if "/" in fps_str:
                            n, d = fps_str.split("/")
                            result["fps"] = round(int(n) / max(int(d), 1), 2)
                        break
        except Exception:
            pass

    if not response:
        result["error"] = "No response from Gemini"
        return result

    # Parse JSON from response
    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        json_lines = []
        in_fence = False
        for line in lines:
            if line.strip().startswith("```"):
                in_fence = not in_fence
                continue
            json_lines.append(line)
        text = "\n".join(json_lines)

    try:
        parsed = json.loads(text)
        segments = parsed.get("segments", [])
        # Validate segment structure
        valid_segments = []
        has_heavy_text = False
        visual_scores = []
        for seg in segments:
            if isinstance(seg, dict) and "start" in seg and "end" in seg:
                severity = str(seg.get("text_overlay_severity", "")).lower().strip()
                if severity not in ("none", "light", "heavy"):
                    # Infer from text_overlay content
                    overlay = str(seg.get("text_overlay", "none")).strip().lower()
                    severity = "none" if overlay in ("none", "", "n/a") else "light"
                if severity == "heavy":
                    has_heavy_text = True

                # Parse quality_score — clamp to valid 1-5 range
                raw_qs = seg.get("quality_score")
                try:
                    quality_score = max(1, min(5, int(raw_qs)))
                except (TypeError, ValueError):
                    quality_score = 3  # Default to acceptable when missing

                quality_notes = str(seg.get("quality_notes", "")).strip()
                if not quality_notes:
                    quality_notes = "No quality notes provided"

                visual_scores.append(quality_score)
                valid_segments.append({
                    "start": float(seg.get("start", 0)),
                    "end": float(seg.get("end", 0)),
                    "description": str(seg.get("description", "")),
                    "camera": str(seg.get("camera", "")),
                    "mood": str(seg.get("mood", "")),
                    "subjects": str(seg.get("subjects", "")),
                    "motion": str(seg.get("motion", "")),
                    "text_overlay": str(seg.get("text_overlay", "none")),
                    "text_overlay_severity": severity,
                    "quality_score": quality_score,
                    "quality_notes": quality_notes,
                })
        result["segments"] = valid_segments
        result["has_burned_captions"] = has_heavy_text

        # Compute clip-level quality score
        avg_visual = sum(visual_scores) / len(visual_scores) if visual_scores else 3.0
        technical_score_01 = _compute_technical_quality(
            result["width"], result["height"],
            result["fps"], result["codec"],
            file_size, duration,
        )
        # Scale technical_score from 0-1 to 1-5
        technical_score_15 = 1.0 + technical_score_01 * 4.0
        clip_quality = 0.7 * avg_visual + 0.3 * technical_score_15
        # Round to 1 decimal, clamp to [1.0, 5.0]
        result["clip_quality_score"] = round(max(1.0, min(5.0, clip_quality)), 1)

    except json.JSONDecodeError:
        result["error"] = "Could not parse Gemini response as JSON"

    return result


def analyze_footage_folder(
    source: str,
    output_dir: str,
    media_dir: str,
    profile_root: str,
    session_id: str | None = None,
    max_clips: int = MAX_CLIPS,
    catalog_id: str | None = None,
    catalog_name: str | None = None,
    tags: list[str] | None = None,
    min_file_size: int | None = None,
) -> dict:
    """Analyze a folder of footage clips and build a catalog.

    Args:
        source: Local path or "gdrive:<folder_id_or_url>"
        output_dir: Where to save the catalog JSON (legacy, kept for compat)
        media_dir: Where to download files if needed
        profile_root: Profile root for credential resolution
        session_id: Optional session ID for filename prefixing
        max_clips: Maximum number of clips to analyze
        catalog_id: Optional existing catalog ID for incremental analysis
        catalog_name: Optional human-readable name
        tags: Optional tags for the catalog

    Returns catalog dict with clips and segments.
    """
    from lib.catalog_store import CatalogStore
    store = CatalogStore(profile_root)

    # Incremental mode: add to existing catalog
    skip_filenames = None
    if catalog_id:
        existing = store.get_catalog(catalog_id)
        if existing is None:
            print(f"ERROR: Catalog '{catalog_id}' not found.")
            sys.exit(1)
        catalog = existing
        skip_filenames = {c["filename"] for c in catalog.get("clips", [])}
        print(f"Incremental mode: adding to catalog '{catalog.get('name', catalog_id)}'")
        print(f"  {len(skip_filenames)} existing clip(s) will be skipped.")
    else:
        # Default to master catalog (persistent, accumulates all footage)
        catalog = store.get_or_create_master(
            name=catalog_name or "Master Catalog",
            tags=tags,
        )
        catalog_id = catalog["catalog_id"]
        skip_filenames = {c["filename"] for c in catalog.get("clips", [])}
        if skip_filenames:
            print(f"Using MASTER CATALOG ({len(skip_filenames)} existing clips, new ones will be added).")
        else:
            print("Using MASTER CATALOG (new).")

    effective_min_size = min_file_size if min_file_size is not None else MIN_FILE_SIZE

    if source.startswith("gdrive:"):
        _analyze_gdrive_folder(
            source[7:].strip(), catalog, media_dir, profile_root, max_clips,
            skip_filenames=skip_filenames,
            min_file_size=effective_min_size,
        )
    else:
        _analyze_local_folder(source, catalog, max_clips, min_file_size=effective_min_size)

    catalog["clip_count"] = len(catalog["clips"])
    catalog["total_duration"] = sum(c.get("duration", 0) for c in catalog["clips"])

    # Save through catalog store
    catalog_path = store.save_catalog(catalog)

    # Touch all clips and set source metadata for TTL tracking
    all_filenames = [c["filename"] for c in catalog.get("clips", []) if c.get("filename")]
    if all_filenames:
        store.touch_clips_batch(all_filenames)
    for clip in catalog.get("clips", []):
        fname = clip.get("filename", "")
        st = clip.get("source_type", "")
        if fname and st:
            store.set_clip_source(fname, {
                "source_type": st,
                "source_url": clip.get("source_url", clip.get("gdrive_url", "")),
                "source_id": clip.get("source_id", clip.get("gdrive_id", "")),
            })

    catalog["_catalog_path"] = catalog_path
    print(f"\nCatalog saved: {catalog_path}")
    print(f"  {catalog['clip_count']} clips, {catalog['total_duration']:.1f}s total")

    # Dual-write: push newly-cataloged clips to remote DAM (non-fatal, deferred)
    _push_clips_to_dam(catalog.get("clips", []), media_dir)

    return catalog


def _push_clips_to_dam(clips: list, media_dir: str):
    """Push cataloged clips to remote DAM. Non-fatal, best-effort.

    For each clip with a local file:
      1. Upload file to Vercel Blob via DAM upload API
      2. Ingest metadata with real Blob URL
    Skips clips that are already in the DAM (dedup by file hash).
    """
    try:
        from lib.dam_client import DAMClient, compute_file_hash
        client = DAMClient()
        if not client.configured:
            return
    except Exception:
        return

    pushed = 0
    skipped = 0
    errors = 0

    for clip in clips:
        filename = clip.get("filename", "")
        local_path = clip.get("path", "")

        if not local_path or not os.path.exists(local_path):
            # Try media_dir fallback
            candidate = os.path.join(media_dir, filename) if filename else ""
            if candidate and os.path.exists(candidate):
                local_path = candidate
            else:
                continue

        try:
            # Check if already in DAM
            existing = client.lookup_clip(filename)
            if existing and existing.get("file_url", "").startswith("https://"):
                skipped += 1
                continue

            # Upload file
            upload_result = client.upload_clip(local_path)
            if not upload_result or not upload_result.get("url"):
                errors += 1
                continue

            blob_url = upload_result["url"]
            file_hash = compute_file_hash(local_path)

            # Build ingest payload
            from lib.dam_client import build_clip_payload
            payload = build_clip_payload(
                clip, Path(media_dir), file_url=blob_url, file_hash=file_hash,
            )
            result = client.ingest_clip(payload)
            if result:
                pushed += 1
            else:
                errors += 1
        except Exception as e:
            errors += 1
            print(f"    DAM push failed for {filename}: {e}")

    if pushed > 0 or errors > 0:
        print(f"\n  DAM sync: {pushed} pushed, {skipped} already synced, {errors} errors")


def _analyze_gdrive_folder(
    folder_ref: str,
    catalog: dict,
    media_dir: str,
    profile_root: str,
    max_clips: int,
    skip_filenames: set | None = None,
    min_file_size: int = MIN_FILE_SIZE,
):
    """Analyze clips from a Google Drive folder. Downloads each clip for frame-based analysis."""
    from lib.gdrive import list_gdrive_folder, download_gdrive_file

    print(f"Listing Google Drive folder...")
    files = list_gdrive_folder(folder_ref, profile_root, max_files=max_clips)

    if not files:
        print("ERROR: No video files found in Drive folder (or auth failed).")
        return

    # Filter out already-analyzed clips (for incremental mode)
    # Check both raw Drive name and sanitized name against existing catalog
    if skip_filenames:
        from lib.catalog_store import sanitize_filename as _sf
        before = len(files)
        files = [f for f in files if f["name"] not in skip_filenames and _sf(f["name"]) not in skip_filenames]
        skipped = before - len(files)
        if skipped:
            print(f"Skipping {skipped} already-cataloged clip(s).")

    if not files:
        print("All clips already in catalog. Nothing new to analyze.")
        return

    print(f"Found {len(files)} video file(s) to analyze...")

    for i, f in enumerate(files, 1):
        name = f["name"]
        file_id = f["id"]
        size = f.get("size", 0)

        if size < min_file_size:
            print(f"  [{i}/{len(files)}] Skipping {name} (too small: {size / 1000:.0f} KB < {min_file_size / 1000:.0f} KB)")
            continue
        if size > MAX_FILE_SIZE:
            print(f"  [{i}/{len(files)}] Skipping {name} (too large: {size / 1e6:.0f} MB)")
            continue

        # Sanitize filename for safe catalog storage and shell usage
        from lib.catalog_store import sanitize_filename
        clean_name = sanitize_filename(name)
        if clean_name != name:
            print(f"  [{i}/{len(files)}] Downloading + analyzing {name} (→ {clean_name})...")
        else:
            print(f"  [{i}/{len(files)}] Downloading + analyzing {name}...")

        dl_path = os.path.join(media_dir, clean_name)
        dl_info = download_gdrive_file(file_id, dl_path, media_dir, profile_root)

        if "error" in dl_info:
            print(f"    ERROR: {dl_info['error']}")
            continue

        duration = dl_info.get("duration", 0)
        if duration > MAX_DURATION:
            print(f"    Skipping (too long: {duration:.0f}s)")
            continue

        with tempfile.TemporaryDirectory() as tmpdir:
            clip_entry = _analyze_single_clip_local(dl_path, clean_name, tmpdir)

        clip_entry["gdrive_id"] = file_id
        clip_entry["original_name"] = name  # Preserve raw Drive name for reference
        clip_entry["gdrive_url"] = f.get("webViewLink", "")
        clip_entry["downloaded"] = True
        clip_entry["path"] = dl_path
        clip_entry["width"] = dl_info.get("width", 0)
        clip_entry["height"] = dl_info.get("height", 0)
        clip_entry["resolution"] = dl_info.get("resolution", "unknown")
        clip_entry["fps"] = dl_info.get("fps", 0)
        clip_entry["codec"] = dl_info.get("codec", "unknown")
        clip_entry["duration"] = duration
        clip_entry["source_type"] = "gdrive"
        clip_entry["source_url"] = f.get("webViewLink", "")
        clip_entry["source_id"] = file_id
        segs = len(clip_entry.get("segments", []))
        print(f"    OK: {segs} segments, {duration:.1f}s")

        catalog["clips"].append(clip_entry)

        # Rate limit between Gemini calls
        if i < len(files):
            time.sleep(GEMINI_DELAY)


def _analyze_local_folder(folder_path: str, catalog: dict, max_clips: int, min_file_size: int = MIN_FILE_SIZE):
    """Analyze clips from a local folder."""
    from lib.analyze import _get_video_duration

    videos = _list_local_videos(folder_path)
    if not videos:
        print(f"ERROR: No video files found in {folder_path}")
        return

    # Filter by size
    eligible = [
        v for v in videos
        if min_file_size <= v["size"] <= MAX_FILE_SIZE
    ][:max_clips]

    print(f"Found {len(videos)} video(s), {len(eligible)} eligible for analysis.")

    from lib.catalog_store import sanitize_filename

    for i, v in enumerate(eligible, 1):
        raw_name = v["name"]
        path = v["path"]
        name = sanitize_filename(raw_name)

        # Rename file on disk if needed
        if name != raw_name:
            new_path = str(Path(path).parent / name)
            if not os.path.exists(new_path):
                os.rename(path, new_path)
            path = new_path

        duration = _get_video_duration(path)
        if duration > MAX_DURATION:
            print(f"  [{i}/{len(eligible)}] Skipping {name} (too long: {duration:.0f}s)")
            continue

        print(f"  [{i}/{len(eligible)}] Analyzing {name} ({duration:.1f}s)...")

        with tempfile.TemporaryDirectory() as tmpdir:
            clip_entry = _analyze_single_clip_local(path, name, tmpdir)

        if raw_name != name:
            clip_entry["original_filename"] = raw_name
        clip_entry["downloaded"] = True  # It's already local
        clip_entry["source_type"] = "local"
        clip_entry["source_url"] = path
        clip_entry["source_id"] = ""
        segs = len(clip_entry.get("segments", []))
        if "error" in clip_entry:
            print(f"    WARNING: {clip_entry['error']}")
        else:
            print(f"    OK: {segs} segments")

        catalog["clips"].append(clip_entry)

        # Rate limit
        if i < len(eligible):
            time.sleep(GEMINI_DELAY)
