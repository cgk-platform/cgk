"""
timeline.py — FFmpeg filter graph builder, clip normalization, and rendering.

Handles:
  - Clip normalization (scale, crop, fps, codec to target aspect ratio)
  - Filter graph construction (concat with xfade transitions)
  - FFmpeg command execution
"""

import json
import os
import subprocess
import sys
from pathlib import Path


# Resolution map for aspect ratios
RESOLUTIONS = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
}

TARGET_FPS = 30
TARGET_PIX_FMT = "yuv420p"
TARGET_CODEC = "libx264"


def _has_ass_filter() -> bool:
    """Check if FFmpeg has the 'ass' subtitle filter (requires libass)."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-filters"],
            capture_output=True, text=True, timeout=10,
        )
        return "ass" in result.stdout and "subtitles" in result.stdout.lower()
    except Exception:
        return False


def _run_cmd(cmd: list, timeout: int = 300) -> subprocess.CompletedProcess:
    """Run a subprocess command with timeout."""
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _get_duration(path: str) -> float:
    """Get video duration in seconds via ffprobe."""
    try:
        result = _run_cmd([
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            path,
        ])
        return float(result.stdout.strip())
    except (ValueError, subprocess.TimeoutExpired):
        return 0.0


def normalize_clips(
    clips: list,
    scenes: list,
    aspect_ratio: str,
    session_id: str,
    media_dir: str,
) -> list:
    """Normalize all source clips to target aspect ratio, fps, codec.

    For each clip:
      1. Scale + crop (or pad) to target resolution
      2. Set fps to 30
      3. Re-encode to h264 yuv420p
      4. Trim to scene-specified in/out points

    Returns list of normalized clip info dicts.
    """
    if aspect_ratio not in RESOLUTIONS:
        print(f"ERROR: Unknown aspect ratio: {aspect_ratio}")
        sys.exit(1)

    target_w, target_h = RESOLUTIONS[aspect_ratio]
    normalized = []

    for i, clip in enumerate(clips):
        if clip.get("status") != "ready":
            print(f"WARNING: Scene {clip.get('scene_num', i+1)} not ready, skipping normalize.")
            normalized.append({"scene_num": clip.get("scene_num", i+1), "status": "skipped"})
            continue

        scene = scenes[i] if i < len(scenes) else {}
        scene_num = clip.get("scene_num", i + 1)
        src_path = clip["path"]
        out_path = os.path.join(media_dir, f"{session_id}-norm-{scene_num}.mp4")

        # Determine trim points
        scene_start = scene.get("start", 0)
        scene_end = scene.get("end", 0)
        scene_duration = scene_end - scene_start if scene_end > scene_start else 0

        # Extract clip-level trim points (from clip: source type)
        clip_seek_start = clip.get("clip_start", 0)
        clip_seek_end = clip.get("clip_end", 0)
        has_clip_range = clip_seek_end > clip_seek_start

        # Build FFmpeg command
        cmd = ["ffmpeg", "-y"]

        # Fast seek BEFORE -i for clip: ranges (demuxer-level, keyframe-accurate)
        if has_clip_range and clip_seek_start > 0:
            cmd.extend(["-ss", str(clip_seek_start)])

        # Input
        cmd.extend(["-i", src_path])

        # Filter: scale + crop to target, set fps
        # Use scale2ref approach: scale to fill, then crop center
        filter_parts = []

        # Scale to cover target (maintain aspect, scale up to fill)
        filter_parts.append(
            f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase"
        )
        # Crop center to exact target
        filter_parts.append(
            f"crop={target_w}:{target_h}"
        )
        # Set fps
        filter_parts.append(f"fps={TARGET_FPS}")
        # Set pixel format
        filter_parts.append(f"format={TARGET_PIX_FMT}")

        vf = ",".join(filter_parts)
        cmd.extend(["-vf", vf])

        # Trim: clip: range takes priority, then scene duration
        if has_clip_range:
            clip_range_duration = clip_seek_end - clip_seek_start
            cmd.extend(["-t", str(clip_range_duration)])
        elif scene_duration > 0:
            # Trim from beginning of source clip
            src_duration = clip.get("duration", 0)
            trim_duration = min(scene_duration, src_duration) if src_duration > 0 else scene_duration
            cmd.extend(["-t", str(trim_duration)])

        # Video codec
        cmd.extend(["-c:v", TARGET_CODEC, "-preset", "fast", "-crf", "23"])

        # Audio: re-encode to aac or drop (we'll mix separately)
        cmd.extend(["-an"])  # No audio in normalized clips

        # Output
        cmd.append(out_path)

        print(f"  Normalizing scene {scene_num}...")
        try:
            result = _run_cmd(cmd, timeout=120)
            if result.returncode != 0:
                print(f"    ERROR: ffmpeg normalize failed: {result.stderr[:200]}")
                normalized.append({
                    "scene_num": scene_num,
                    "status": "error",
                    "error": result.stderr[:200],
                })
                continue
        except subprocess.TimeoutExpired:
            print(f"    ERROR: ffmpeg normalize timed out")
            normalized.append({
                "scene_num": scene_num,
                "status": "error",
                "error": "Normalize timed out",
            })
            continue

        # Get duration of normalized clip
        dur = _get_duration(out_path)

        # Report shortfall (plan command will validate)
        if scene_duration > 0 and dur > 0 and dur < scene_duration - 0.1:
            gap = scene_duration - dur
            print(f"    Note: clip is {dur:.1f}s, scene needs {scene_duration:.1f}s (short by {gap:.1f}s)")

        normalized.append({
            "scene_num": scene_num,
            "path": out_path,
            "duration": dur,
            "resolution": f"{target_w}x{target_h}",
            "fps": TARGET_FPS,
            "codec": "h264",
            "status": "ready",
        })
        print(f"    Done: {out_path} ({dur:.1f}s)")

    return normalized


def build_filter_graph(
    scenes: list,
    resolution: str,
    captions_path: str = None,
    transition_duration: float = 0.5,
) -> dict:
    """Build an FFmpeg filter graph for video assembly.

    Creates a concat with xfade transitions between clips.

    Returns dict with:
      - filter_complex: the filter graph string
      - output_label: the final output stream label
    """
    n = len(scenes)
    if n == 0:
        return {"filter_complex": "", "output_label": ""}

    w, h = resolution.split("x")

    if n == 1:
        # Single clip — no transitions needed
        fc = f"[0:v]null[outv]"
        return {"filter_complex": fc, "output_label": "[outv]"}

    # Build xfade chain
    # [0:v][1:v]xfade=transition=fade:duration=0.5:offset=X[v01];
    # [v01][2:v]xfade=transition=fade:duration=0.5:offset=Y[v012]; ...
    parts = []
    prev_label = "[0:v]"
    cumulative_offset = 0

    for i in range(1, n):
        scene = scenes[i - 1]
        clip_dur = scene.get("clip_duration", scene.get("end", 0) - scene.get("start", 0))
        cumulative_offset += clip_dur - transition_duration

        transition = scene.get("transition", "fade")
        # Map transition names to FFmpeg xfade types
        xfade_type = {
            "crossfade": "fade",
            "fade": "fade",
            "wipe": "wipeleft",
            "dissolve": "dissolve",
            "fade-to-black": "fadeblack",
            "slide": "slideleft",
        }.get(transition, "fade")

        if i == n - 1:
            out_label = "[outv]"
        else:
            out_label = f"[v{i}]"

        parts.append(
            f"{prev_label}[{i}:v]xfade=transition={xfade_type}"
            f":duration={transition_duration}:offset={cumulative_offset:.2f}{out_label}"
        )
        prev_label = out_label

    fc = ";".join(parts)

    # Add subtitle filter if captions provided
    if captions_path and os.path.exists(captions_path):
        # Check if FFmpeg has subtitle support (libass)
        if _has_ass_filter():
            escaped = captions_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
            fc += f";[outv]ass={escaped}[outv_sub]"
            output_label = "[outv_sub]"
        else:
            print("WARNING: FFmpeg built without libass — captions skipped.")
            print("  To fix: brew reinstall ffmpeg --with-libass (or install ffmpeg with libass support)")
            output_label = "[outv]"
    else:
        output_label = "[outv]"

    return {"filter_complex": fc, "output_label": output_label}


def run_ffmpeg(
    scenes: list,
    audio_path: str,
    filter_graph: dict,
    output_path: str,
    resolution: str,
):
    """Execute the final FFmpeg render command.

    Combines normalized video clips + audio mix + optional captions → final MP4.
    """
    cmd = ["ffmpeg", "-y"]

    # Add all video inputs
    for scene in scenes:
        clip_path = scene.get("clip_path", "")
        if not clip_path or not os.path.exists(clip_path):
            print(f"ERROR: Missing clip for scene {scene.get('scene_num', '?')}: {clip_path}")
            sys.exit(1)
        cmd.extend(["-i", clip_path])

    # Add audio input
    if audio_path and os.path.exists(audio_path):
        cmd.extend(["-i", audio_path])
        audio_index = len(scenes)
    else:
        audio_index = None

    # Filter complex
    fc = filter_graph.get("filter_complex", "")
    output_label = filter_graph.get("output_label", "")

    if fc:
        cmd.extend(["-filter_complex", fc])
        cmd.extend(["-map", output_label])
    else:
        cmd.extend(["-map", "0:v"])

    # Map audio
    if audio_index is not None:
        cmd.extend(["-map", f"{audio_index}:a"])
        cmd.extend(["-c:a", "aac", "-b:a", "192k"])
        cmd.extend(["-shortest"])
    else:
        cmd.extend(["-an"])

    # Video encoding
    cmd.extend([
        "-c:v", TARGET_CODEC,
        "-preset", "medium",
        "-crf", "20",
        "-pix_fmt", TARGET_PIX_FMT,
        "-movflags", "+faststart",
        "-r", str(TARGET_FPS),
    ])

    # Output
    cmd.append(output_path)

    print(f"Rendering final video...")
    print(f"  Output: {output_path}")
    print(f"  Clips: {len(scenes)}")

    try:
        result = _run_cmd(cmd, timeout=600)
        if result.returncode != 0:
            print(f"ERROR: FFmpeg render failed:")
            print(result.stderr[-500:])
            sys.exit(1)
    except subprocess.TimeoutExpired:
        print("ERROR: FFmpeg render timed out (10 min limit)")
        sys.exit(1)

    if not os.path.exists(output_path):
        print(f"ERROR: Output file not created: {output_path}")
        sys.exit(1)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    duration = _get_duration(output_path)
    print(f"  Render complete: {size_mb:.1f} MB, {duration:.1f}s")
