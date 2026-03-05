#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
# ]
# ///
"""
Analyze a video and extract a detailed prompt for video generation.
Uses Gemini's video understanding to extract scene details, camera movements, lighting, etc.

Supports local files, direct URLs, Dropbox share links, and Google Drive share links.
Dropbox/Drive links are auto-downloaded to a temp file before analysis.
"""
import argparse
import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from google import genai
from google.genai import types

# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
SCRIPT_DIR = Path(__file__).parent
PROFILE_ROOT = SCRIPT_DIR.parent.parent.parent
MEDIA_DIR = PROFILE_ROOT / "media"

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
DOWNLOAD_TIMEOUT = 300  # 5 minutes


def _is_dropbox_url(url: str) -> bool:
    host = urlparse(url).hostname or ""
    return host in ("www.dropbox.com", "dropbox.com", "dl.dropboxusercontent.com")


def _dropbox_direct_url(url: str) -> str:
    """Convert Dropbox share link to direct download by setting dl=1."""
    parsed = urlparse(url)
    if (parsed.hostname or "").endswith("dropboxusercontent.com"):
        return url
    params = parse_qs(parsed.query)
    params["dl"] = ["1"]
    return urlunparse(parsed._replace(query=urlencode(params, doseq=True)))


def _is_gdrive_url(url: str) -> bool:
    host = urlparse(url).hostname or ""
    return host in ("drive.google.com", "docs.google.com")


def _gdrive_direct_url(url: str) -> str:
    """Convert Google Drive /file/d/<id>/view to direct download URL."""
    parsed = urlparse(url)
    path = parsed.path
    # Extract file ID from /file/d/<id>/... pattern
    if "/file/d/" in path:
        parts = path.split("/file/d/")
        if len(parts) > 1:
            file_id = parts[1].split("/")[0]
            return f"https://drive.google.com/uc?export=download&id={file_id}"
    return url


def _download_url(url: str, dest: Path, timeout: int = DOWNLOAD_TIMEOUT) -> None:
    """Download a URL to a local file with content-type validation."""
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=timeout) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" in content_type:
                print(
                    "ERROR: Received HTML instead of video data. "
                    "The link may be private or require authentication.",
                    file=sys.stderr,
                )
                sys.exit(1)
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as f:
                while True:
                    chunk = resp.read(1024 * 1024)
                    if not chunk:
                        break
                    f.write(chunk)
    except HTTPError as e:
        if e.code in (403, 404):
            print(
                f"ERROR: HTTP {e.code} — the link may be private or deleted.",
                file=sys.stderr,
            )
        else:
            print(f"ERROR: HTTP {e.code} downloading {url}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"ERROR: Network error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except TimeoutError:
        print(f"ERROR: Download timed out after {timeout}s", file=sys.stderr)
        sys.exit(1)


def _resolve_video_input(video_arg: str) -> tuple[str, bool, str | None]:
    """Resolve a video argument to a usable path.

    Returns (resolved_path, is_local, cleanup_path).
    - resolved_path: local file path or original URL
    - is_local: True if resolved_path is a local file
    - cleanup_path: temp file to delete after use, or None
    """
    # Already a local file
    if Path(video_arg).exists():
        return video_arg, True, None

    # Dropbox URL — download locally
    if _is_dropbox_url(video_arg):
        direct = _dropbox_direct_url(video_arg)
        suffix = Path(urlparse(video_arg).path).suffix or ".mp4"
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False, dir=str(MEDIA_DIR / "inbound"))
        tmp.close()
        dest = Path(tmp.name)
        print(f"Downloading Dropbox video to: {dest}")
        _download_url(direct, dest)
        size_mb = dest.stat().st_size / (1024 * 1024)
        print(f"Downloaded {size_mb:.1f}MB")
        return str(dest), True, str(dest)

    # Google Drive URL — download locally, fall back to passthrough
    if _is_gdrive_url(video_arg):
        direct = _gdrive_direct_url(video_arg)
        suffix = Path(urlparse(video_arg).path).suffix or ".mp4"
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False, dir=str(MEDIA_DIR / "inbound"))
        tmp.close()
        dest = Path(tmp.name)
        try:
            print(f"Downloading Google Drive video to: {dest}")
            _download_url(direct, dest)
            size_mb = dest.stat().st_size / (1024 * 1024)
            print(f"Downloaded {size_mb:.1f}MB")
            return str(dest), True, str(dest)
        except SystemExit:
            # Download failed — fall back to passing URL to Gemini
            dest.unlink(missing_ok=True)
            print("Google Drive download failed, passing URL to Gemini directly.", file=sys.stderr)
            return video_arg, False, None

    # Other URL — pass through to Gemini as-is
    return video_arg, False, None


def extract_frame(video_path: str, output_path: str, timestamp: str = "00:00:02") -> str | None:
    """Extract a frame from a video using ffmpeg.

    Tries to grab a frame at the given timestamp (default 2 seconds in).
    Falls back to the very first frame if the timestamp is beyond video length.
    Returns the output path on success, None on failure.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    # Try at the requested timestamp first
    cmd = [
        "ffmpeg", "-y", "-ss", timestamp, "-i", video_path,
        "-frames:v", "1", "-q:v", "2", str(out)
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=30)
    if result.returncode == 0 and out.exists() and out.stat().st_size > 0:
        print(f"Extracted frame at {timestamp}: {out}")
        return str(out)

    # Fallback: grab the very first frame
    cmd_fallback = [
        "ffmpeg", "-y", "-i", video_path,
        "-frames:v", "1", "-q:v", "2", str(out)
    ]
    result = subprocess.run(cmd_fallback, capture_output=True, timeout=30)
    if result.returncode == 0 and out.exists() and out.stat().st_size > 0:
        print(f"Extracted first frame: {out}")
        return str(out)

    print(f"Warning: Could not extract frame from {video_path}", file=sys.stderr)
    return None


def main():
    parser = argparse.ArgumentParser(description="Analyze video and extract prompt")
    parser.add_argument("--video", "-v", required=True, help="Path to video file or URL")
    parser.add_argument("--modifications", "-m", help="Modifications to apply (e.g., 'make it winter, add snow')")
    parser.add_argument("--output", "-o", help="Output JSON file for prompt")
    parser.add_argument("--extract-frame", "-F", help="Extract a keyframe to this path (requires ffmpeg)")
    parser.add_argument("--frame-time", default="00:00:02", help="Timestamp for frame extraction (default: 00:00:02)")
    args = parser.parse_args()

    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    client = genai.Client(vertexai=True, project=project, location="global")

    print(f"Analyzing video: {args.video}")

    # Resolve video input (download Dropbox/Drive URLs if needed)
    resolved_path, is_local, cleanup_path = _resolve_video_input(args.video)

    try:
        # Extract frame if requested (local files only)
        extracted_frame = None
        if args.extract_frame and is_local:
            print(f"Extracting keyframe at {args.frame_time}...")
            extracted_frame = extract_frame(resolved_path, args.extract_frame, args.frame_time)

        # Load video as inline bytes for Vertex AI
        if is_local:
            print("Loading video as inline bytes...")
            video_data = Path(resolved_path).read_bytes()
            suffix = Path(resolved_path).suffix.lower()
            mime_map = {".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".avi": "video/x-msvideo", ".mkv": "video/x-matroska"}
            mime = mime_map.get(suffix, "video/mp4")
            video_input = types.Part.from_bytes(data=video_data, mime_type=mime)
            print(f"Loaded {len(video_data) / (1024*1024):.1f}MB as {mime}")
        else:
            # Pass URL string directly to Gemini
            video_input = resolved_path

        # Analyze video with Gemini
        print("Analyzing video content...")

        analysis_prompt = """Analyze this video in extreme detail for video generation purposes.

Extract and describe in JSON format:

{
  "scene_description": "Detailed description of what's happening",
  "camera_work": {
    "movement": "static/pan/tilt/dolly/tracking/handheld/crane/etc",
    "shot_type": "wide/medium/close-up/extreme close-up",
    "angle": "eye-level/low-angle/high-angle/bird's eye/dutch angle"
  },
  "lighting": {
    "type": "natural/studio/golden hour/blue hour/etc",
    "direction": "front/back/side/rim/etc",
    "mood": "bright/dark/moody/warm/cool/etc"
  },
  "style": {
    "visual_style": "cinematic/documentary/commercial/artistic/etc",
    "color_grading": "warm/cool/desaturated/vibrant/etc",
    "motion": "slow/normal/fast/time-lapse/slow-motion"
  },
  "subjects": ["list of main subjects/actors/objects"],
  "setting": "location and environment description",
  "duration": "approximate duration",
  "key_moments": ["moment 1", "moment 2", "..."],
  "technical_specs": {
    "estimated_focal_length": "wide/normal/telephoto",
    "depth_of_field": "shallow/deep",
    "frame_rate_feel": "cinematic 24fps/smooth 60fps/etc"
  }
}

Be extremely detailed and technical. This will be used to recreate a similar video."""

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[video_input, analysis_prompt]
        )

        analysis_text = response.text
        print("\n" + "="*60)
        print("VIDEO ANALYSIS:")
        print("="*60)
        print(analysis_text)
        print("="*60 + "\n")

        # Try to parse JSON from response
        try:
            # Extract JSON from markdown code blocks if present
            if "```json" in analysis_text:
                json_start = analysis_text.find("```json") + 7
                json_end = analysis_text.find("```", json_start)
                json_str = analysis_text[json_start:json_end].strip()
            elif "```" in analysis_text:
                json_start = analysis_text.find("```") + 3
                json_end = analysis_text.find("```", json_start)
                json_str = analysis_text[json_start:json_end].strip()
            else:
                json_str = analysis_text.strip()

            analysis = json.loads(json_str)
        except json.JSONDecodeError:
            print("Warning: Could not parse JSON, using raw text analysis", file=sys.stderr)
            analysis = {"raw_analysis": analysis_text}

        # Generate Veo/Sora prompt
        print("Generating video recreation prompt...")

        prompt_generation = f"""Based on this video analysis, create a detailed prompt for Veo/Sora video generation:

Analysis:
{json.dumps(analysis, indent=2)}

{f'Apply these modifications: {args.modifications}' if args.modifications else ''}

Create a prompt that:
1. Describes the scene and action in detail
2. Specifies camera movement and shot type
3. Describes lighting and mood
4. Mentions style and color grading
5. Is optimized for Veo 3.1 or Sora 2

Format as a single paragraph prompt suitable for video generation."""

        prompt_response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt_generation
        )

        generated_prompt = prompt_response.text.strip()

        # Prepare output
        result = {
            "original_video": args.video,
            "analysis": analysis,
            "modifications": args.modifications,
            "veo_sora_prompt": generated_prompt,
            "extracted_frame": extracted_frame,
            "metadata": {
                "analyzed_with": "gemini-3-flash",
                "timestamp": __import__('datetime').datetime.now().isoformat()
            }
        }

        # Save to file if specified
        if args.output:
            output_path = Path(args.output).expanduser()
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(result, indent=2))
            print(f"\nSaved analysis to: {output_path}")

        # Print prompt
        print("\n" + "="*60)
        print("GENERATED PROMPT FOR VEO/SORA:")
        print("="*60)
        print(generated_prompt)
        print("="*60 + "\n")

        # Print JSON for easy parsing
        print(f"JSON:{json.dumps(result)}")
    finally:
        # Clean up temp files from Dropbox/Drive downloads
        if cleanup_path:
            Path(cleanup_path).unlink(missing_ok=True)


if __name__ == "__main__":
    main()
