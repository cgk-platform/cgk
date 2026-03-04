"""
analyze.py — Gemini Flash video analysis for clone mode.

Sends a competitor video to Gemini Flash for scene-by-scene breakdown.
Extracts: scenes, voiceover, hook strategy, music style, CTA, pacing.

Uses the LiteLLM proxy (localhost:4000) for Gemini access.
"""

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

GEMINI_MAX_RETRIES = 3
GEMINI_RETRY_BASE = 15.0  # seconds, doubles each retry


def _extract_frames(video_path: str, output_dir: str, fps: float = 1.0) -> list:
    """Extract frames from video at specified fps for analysis."""
    os.makedirs(output_dir, exist_ok=True)
    pattern = os.path.join(output_dir, "frame_%04d.jpg")

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"fps={fps}",
        "-q:v", "3",
        pattern,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            print(f"WARNING: Frame extraction issues: {result.stderr[:200]}")
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"WARNING: Frame extraction failed: {e}")
        return []

    frames = sorted(Path(output_dir).glob("frame_*.jpg"))
    return [str(f) for f in frames]


def _extract_audio(video_path: str, output_path: str) -> bool:
    """Extract audio track from video."""
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-c:a", "mp3",
        "-q:a", "4",
        output_path,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def _get_video_duration(path: str) -> float:
    """Get video duration via ffprobe."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet",
             "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1",
             path],
            capture_output=True, text=True, timeout=15,
        )
        return float(result.stdout.strip())
    except (ValueError, subprocess.TimeoutExpired, FileNotFoundError):
        return 0.0


def _call_gemini(prompt: str, video_path: str = None) -> str:
    """Call Gemini Flash via LiteLLM proxy for video analysis.

    If video_path is provided, uploads it as a file for multimodal analysis.
    Falls back to text-only if file upload fails.
    """
    import requests

    litellm_key = os.environ.get("LITELLM_API_KEY", "")
    litellm_base = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000")
    base_url = f"{litellm_base.rstrip('/')}/v1"

    headers = {
        "Content-Type": "application/json",
    }
    if litellm_key:
        headers["Authorization"] = f"Bearer {litellm_key}"

    # Try with video file if available (Gemini supports video natively)
    messages = [{"role": "user", "content": prompt}]

    # For video analysis, we describe what we need and include video path info
    # The LiteLLM proxy handles Gemini's native video support
    if video_path and os.path.exists(video_path):
        import base64
        # For large videos, use frame-based analysis instead
        file_size = os.path.getsize(video_path)
        if file_size > 20 * 1024 * 1024:  # > 20MB
            print("  Video >20MB — using frame-based analysis...")
            with tempfile.TemporaryDirectory() as tmpdir:
                frames = _extract_frames(video_path, tmpdir, fps=2.0)
                if frames:
                    content_parts = [{"type": "text", "text": prompt}]
                    for frame in frames[:30]:  # Max 30 frames
                        with open(frame, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode()
                        content_parts.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                        })
                    messages = [{"role": "user", "content": content_parts}]
        else:
            # Small enough for direct video upload
            with open(video_path, "rb") as f:
                video_b64 = base64.b64encode(f.read()).decode()
            messages = [{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {
                    "url": f"data:video/mp4;base64,{video_b64}"
                }},
            ]}]

    payload = {
        "model": "gemini-3-pro",
        "messages": messages,
        "temperature": 0.3,
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
            print("Ensure LiteLLM is running: launchctl list | grep litellm")
            sys.exit(1)
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else 0
            if status in (429, 500, 502, 503) and attempt < GEMINI_MAX_RETRIES:
                wait = GEMINI_RETRY_BASE * (2 ** attempt)
                print(f"  Rate limited ({status}), retrying in {wait:.0f}s... (attempt {attempt + 1}/{GEMINI_MAX_RETRIES})")
                time.sleep(wait)
                continue
            print(f"ERROR: Gemini API call failed after {attempt + 1} attempt(s): {e}")
            sys.exit(1)
        except Exception as e:
            if attempt < GEMINI_MAX_RETRIES:
                wait = GEMINI_RETRY_BASE * (2 ** attempt)
                print(f"  Error: {e}, retrying in {wait:.0f}s... (attempt {attempt + 1}/{GEMINI_MAX_RETRIES})")
                time.sleep(wait)
                continue
            print(f"ERROR: Gemini API call failed after {attempt + 1} attempt(s): {e}")
            sys.exit(1)
    return ""


def analyze_video(source_path: str, media_dir: str) -> dict:
    """Analyze a competitor video for clone mode.

    Returns structured analysis dict with scenes, voiceover, strategy.
    """
    # Handle URL sources (download first)
    if source_path.startswith("http://") or source_path.startswith("https://"):
        print("  Downloading source video...")
        dl_path = os.path.join(media_dir, "clone-source.mp4")
        try:
            result = subprocess.run(
                ["yt-dlp", "-f", "best[ext=mp4]/best",
                 "--merge-output-format", "mp4",
                 "-o", dl_path, source_path],
                capture_output=True, text=True, timeout=180,
            )
            if result.returncode == 0 and os.path.exists(dl_path):
                source_path = dl_path
            else:
                print(f"WARNING: yt-dlp download failed, trying direct download...")
                import requests
                resp = requests.get(source_path, stream=True, timeout=60)
                resp.raise_for_status()
                with open(dl_path, "wb") as f:
                    for chunk in resp.iter_content(8192):
                        f.write(chunk)
                source_path = dl_path
        except Exception as e:
            print(f"ERROR: Failed to download source video: {e}")
            sys.exit(1)

    if not os.path.exists(source_path):
        print(f"ERROR: Source video not found: {source_path}")
        sys.exit(1)

    duration = _get_video_duration(source_path)
    print(f"  Analyzing video: {source_path} ({duration:.1f}s)")

    prompt = f"""Analyze this advertisement video in detail. Provide a structured JSON response with:

1. **scenes**: Array of scene objects, each with:
   - "scene_num": integer
   - "start": start time in seconds
   - "end": end time in seconds
   - "description": detailed visual description (what's shown, camera angle, movement)
   - "text_overlay": any on-screen text (exact words)
   - "camera": camera type/movement (close-up, wide, pan, tracking, static)
   - "mood": emotional tone of the scene

2. **voiceover_transcript**: Full transcription of any voiceover/narration (empty string if none)

3. **hook_strategy**: How the first 3 seconds grab attention (describe the technique)

4. **music_style**: Description of background music (genre, tempo, energy level, instruments)

5. **cta**: Call-to-action text and placement (e.g., "Shop now - bottom of screen, last 3 seconds")

6. **pacing**: Overall pacing analysis (fast cuts, slow builds, timing pattern)

7. **total_duration**: Video duration in seconds ({duration:.1f})

8. **creative_structure**: High-level structure label (e.g., "Hook → Problem → Solution → Proof → CTA")

9. **target_audience**: Who this ad appears to target

10. **production_notes**: Any notable production techniques (transitions, effects, color grading)

Respond ONLY with valid JSON. No markdown, no commentary."""

    print("  Calling Gemini Flash for analysis...")
    response = _call_gemini(prompt, video_path=source_path)

    # Parse JSON response
    try:
        # Try to extract JSON from response (Gemini sometimes wraps in markdown)
        text = response.strip()
        if text.startswith("```"):
            # Remove markdown code fence
            lines = text.split("\n")
            json_lines = []
            in_fence = False
            for line in lines:
                if line.strip().startswith("```"):
                    in_fence = not in_fence
                    continue
                if in_fence or not line.strip().startswith("```"):
                    json_lines.append(line)
            text = "\n".join(json_lines)

        result = json.loads(text)
    except json.JSONDecodeError:
        # If JSON parse fails, return as unstructured
        print("WARNING: Could not parse Gemini response as JSON. Returning raw text.")
        result = {
            "scenes": [],
            "voiceover_transcript": "",
            "hook_strategy": "",
            "music_style": "",
            "cta": "",
            "pacing": "",
            "total_duration": duration,
            "creative_structure": "",
            "raw_analysis": response,
        }

    result["total_duration"] = duration
    result["source_path"] = source_path

    print(f"  Analysis complete: {len(result.get('scenes', []))} scenes identified")
    return result
