"""
audio.py — Audio mixing: voiceover + background music with volume control.

Handles:
  - Voiceover-only output
  - VO + music mixing with configurable volume
  - Music loop/trim to match video duration
  - Output as AAC for final mux
"""

import os
import subprocess
import sys


def _run_cmd(cmd: list, timeout: int = 300) -> subprocess.CompletedProcess:
    """Run a subprocess command with timeout."""
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _get_duration(path: str) -> float:
    """Get audio duration in seconds via ffprobe."""
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


def build_audio_mix(
    voiceover_path: str,
    music_path: str = None,
    music_volume: float = 0.15,
    output_path: str = "",
    total_duration: float = 0,
):
    """Mix voiceover and optional background music into a single audio file.

    If music is provided:
      1. Loop/trim music to match total_duration (or VO duration if total_duration=0)
      2. Apply volume to music track
      3. Mix VO (full volume) + music (reduced volume)
      4. Fade out music in last 2 seconds

    Output: AAC file at output_path
    """
    if not voiceover_path or not os.path.exists(voiceover_path):
        print(f"ERROR: Voiceover file not found: {voiceover_path}")
        sys.exit(1)

    vo_duration = _get_duration(voiceover_path)
    if total_duration <= 0:
        total_duration = vo_duration

    if not music_path or music_path == "none" or not os.path.exists(str(music_path)):
        # Voiceover only — just re-encode to AAC
        cmd = [
            "ffmpeg", "-y",
            "-i", voiceover_path,
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-ac", "2",
            output_path,
        ]
        print("  Encoding voiceover (no music)...")
        try:
            result = _run_cmd(cmd, timeout=120)
            if result.returncode != 0:
                print(f"ERROR: Audio encode failed: {result.stderr[:200]}")
                sys.exit(1)
        except subprocess.TimeoutExpired:
            print("ERROR: Audio encode timed out")
            sys.exit(1)

        print(f"  Audio: {output_path} ({_get_duration(output_path):.1f}s)")
        return

    # Mix VO + Music
    music_duration = _get_duration(music_path)
    fade_duration = min(2.0, total_duration * 0.1)
    fade_start = max(0, total_duration - fade_duration)

    # Build filter graph for mixing
    # [0] = voiceover, [1] = music
    # Music: loop if shorter, trim to duration, apply volume, fade out
    # Then amerge + pan to stereo

    music_filter_parts = []

    # Loop music if shorter than total duration
    if music_duration > 0 and music_duration < total_duration:
        loops = int(total_duration / music_duration) + 1
        music_filter_parts.append(f"aloop=loop={loops}:size=2e+09")

    # Trim music to total duration
    music_filter_parts.append(f"atrim=0:{total_duration}")
    music_filter_parts.append("asetpts=PTS-STARTPTS")

    # Apply volume
    music_filter_parts.append(f"volume={music_volume}")

    # Fade out at end
    music_filter_parts.append(
        f"afade=t=out:st={fade_start}:d={fade_duration}"
    )

    music_filter = ",".join(music_filter_parts)

    # VO: pad with silence if shorter than total duration
    vo_filter = f"apad=whole_dur={total_duration}"

    filter_complex = (
        f"[0:a]{vo_filter}[vo];"
        f"[1:a]{music_filter}[music];"
        f"[vo][music]amix=inputs=2:duration=longest:dropout_transition=2[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", voiceover_path,
        "-i", music_path,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-ac", "2",
        output_path,
    ]

    print(f"  Mixing VO + music (volume={music_volume}, fade={fade_duration}s)...")
    try:
        result = _run_cmd(cmd, timeout=120)
        if result.returncode != 0:
            print(f"ERROR: Audio mix failed: {result.stderr[:300]}")
            # Fallback to VO-only
            print("  Falling back to voiceover only...")
            cmd_fallback = [
                "ffmpeg", "-y",
                "-i", voiceover_path,
                "-c:a", "aac", "-b:a", "192k",
                "-ar", "44100", "-ac", "2",
                output_path,
            ]
            _run_cmd(cmd_fallback, timeout=60)
    except subprocess.TimeoutExpired:
        print("ERROR: Audio mix timed out")
        sys.exit(1)

    dur = _get_duration(output_path)
    print(f"  Audio mixed: {output_path} ({dur:.1f}s)")
