"""
qc.py -- Automated quality control checks for rendered videos.

Called between render and deliver to catch common issues:
  - Duration accuracy (ffprobe vs storyboard)
  - Audio levels (mean/max dB via volumedetect)
  - Black/frozen frames (blackdetect)
  - Caption coverage (ASS vs VO duration)
  - File integrity (streams, size, duration)

Each check returns PASS, WARN, or FAIL with a message.
FAIL blocks delivery. WARN delivers with flag.
"""

import json
import os
import subprocess
from pathlib import Path


class QCResult:
    PASS = "PASS"
    WARN = "WARN"
    FAIL = "FAIL"

    def __init__(self, name: str, status: str, message: str, fix_hint: str = ""):
        self.name = name
        self.status = status
        self.message = message
        self.fix_hint = fix_hint

    def to_dict(self) -> dict:
        d = {"name": self.name, "status": self.status, "message": self.message}
        if self.fix_hint:
            d["fix_hint"] = self.fix_hint
        return d

    def __repr__(self):
        return f"[{self.status}] {self.name}: {self.message}"


def run_qc(
    video_path: str,
    session: dict,
    plan: dict | None = None,
) -> list[QCResult]:
    """Run all QC checks on a rendered video.

    Args:
        video_path: Path to the rendered MP4 file.
        session: Session dict with storyboard, voiceover, caption info.
        plan: Optional plan dict with expected duration/resolution.

    Returns list of QCResult objects.
    """
    results = []
    results.append(_check_file_integrity(video_path))
    results.append(_check_duration_accuracy(video_path, session, plan))
    results.append(_check_audio_levels(video_path))
    results.append(_check_black_frames(video_path))
    results.append(_check_caption_coverage(video_path, session))
    return results


def has_failures(results: list[QCResult]) -> bool:
    """Check if any QC result is a FAIL."""
    return any(r.status == QCResult.FAIL for r in results)


def has_warnings(results: list[QCResult]) -> bool:
    """Check if any QC result is a WARN."""
    return any(r.status == QCResult.WARN for r in results)


def format_report(results: list[QCResult]) -> str:
    """Format QC results as a readable report."""
    lines = ["=" * 50, "QC REPORT", "=" * 50, ""]

    for r in results:
        icon = {"PASS": "+", "WARN": "!", "FAIL": "X"}.get(r.status, "?")
        lines.append(f"  [{icon}] {r.name}: {r.message}")
        if r.fix_hint:
            lines.append(f"      FIX: {r.fix_hint}")

    lines.append("")
    fails = sum(1 for r in results if r.status == QCResult.FAIL)
    warns = sum(1 for r in results if r.status == QCResult.WARN)
    passes = sum(1 for r in results if r.status == QCResult.PASS)

    if fails:
        lines.append(f"RESULT: BLOCKED ({fails} FAIL, {warns} WARN, {passes} PASS)")
        lines.append("Fix the FAIL issues above before delivering.")
    elif warns:
        lines.append(f"RESULT: PASSED WITH WARNINGS ({warns} WARN, {passes} PASS)")
        lines.append("Video can be delivered but review warnings above.")
    else:
        lines.append(f"RESULT: ALL PASSED ({passes} checks)")

    return "\n".join(lines)


def _ffprobe_json(video_path: str) -> dict | None:
    """Run ffprobe and return parsed JSON output."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format", "-show_streams",
                video_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        pass
    return None


def _check_file_integrity(video_path: str) -> QCResult:
    """Check file exists, has reasonable size, and has valid streams."""
    name = "File Integrity"

    if not os.path.exists(video_path):
        return QCResult(name, QCResult.FAIL, "File does not exist",
                        "Re-run the render command")

    size = os.path.getsize(video_path)
    if size == 0:
        return QCResult(name, QCResult.FAIL, "File is 0 bytes",
                        "Re-run the render command -- FFmpeg may have failed silently")

    if size < 50_000:  # 50KB
        return QCResult(name, QCResult.WARN,
                        f"File is suspiciously small ({size / 1024:.1f} KB)",
                        "Check if FFmpeg errored during assembly")

    probe = _ffprobe_json(video_path)
    if probe is None:
        return QCResult(name, QCResult.FAIL, "ffprobe could not read file",
                        "File may be corrupt. Re-run render.")

    streams = probe.get("streams", [])
    has_video = any(s.get("codec_type") == "video" for s in streams)
    has_audio = any(s.get("codec_type") == "audio" for s in streams)

    if not has_video:
        return QCResult(name, QCResult.FAIL, "No video stream found",
                        "FFmpeg filter graph may have failed. Check render logs.")
    if not has_audio:
        return QCResult(name, QCResult.WARN, "No audio stream found",
                        "Check if audio mix was generated correctly")

    size_mb = size / (1024 * 1024)
    return QCResult(name, QCResult.PASS,
                    f"OK ({size_mb:.1f} MB, video={'yes' if has_video else 'no'}, audio={'yes' if has_audio else 'no'})")


def _check_duration_accuracy(video_path: str, session: dict, plan: dict | None) -> QCResult:
    """Check actual duration vs expected duration."""
    name = "Duration Accuracy"

    probe = _ffprobe_json(video_path)
    if not probe:
        return QCResult(name, QCResult.WARN, "Could not probe duration")

    fmt = probe.get("format", {})
    actual_dur = float(fmt.get("duration", 0))
    if actual_dur <= 0:
        return QCResult(name, QCResult.FAIL, "Could not determine video duration",
                        "File may be corrupt. Re-run render.")

    # Expected duration from plan or storyboard
    expected = 0
    if plan:
        expected = plan.get("total_duration", 0)
    if not expected:
        sb = session.get("storyboard", {})
        expected = sb.get("total_duration", 0)

    if not expected:
        return QCResult(name, QCResult.PASS, f"Duration: {actual_dur:.1f}s (no expected value to compare)")

    diff = abs(actual_dur - expected)
    if diff > 5.0:
        return QCResult(name, QCResult.FAIL,
                        f"Duration off by {diff:.1f}s (actual: {actual_dur:.1f}s, expected: {expected:.1f}s)",
                        "Check clip durations. Some clips may have been shorter than expected.")
    elif diff > 2.0:
        return QCResult(name, QCResult.WARN,
                        f"Duration off by {diff:.1f}s (actual: {actual_dur:.1f}s, expected: {expected:.1f}s)")
    else:
        return QCResult(name, QCResult.PASS,
                        f"Duration: {actual_dur:.1f}s (expected: {expected:.1f}s, diff: {diff:.1f}s)")


def _check_audio_levels(video_path: str) -> QCResult:
    """Check audio levels via ffmpeg volumedetect filter."""
    name = "Audio Levels"

    try:
        result = subprocess.run(
            [
                "ffmpeg", "-i", video_path,
                "-af", "volumedetect",
                "-f", "null", "-",
            ],
            capture_output=True, text=True, timeout=120,
        )
        stderr = result.stderr

        # Parse volumedetect output
        mean_db = None
        max_db = None
        for line in stderr.split("\n"):
            if "mean_volume:" in line:
                try:
                    mean_db = float(line.split("mean_volume:")[1].strip().split()[0])
                except (ValueError, IndexError):
                    pass
            if "max_volume:" in line:
                try:
                    max_db = float(line.split("max_volume:")[1].strip().split()[0])
                except (ValueError, IndexError):
                    pass

        if mean_db is None:
            return QCResult(name, QCResult.WARN, "Could not detect audio levels")

        if mean_db < -35:
            return QCResult(name, QCResult.FAIL,
                            f"Audio too quiet (mean: {mean_db:.1f} dB)",
                            "Check voiceover volume. VO may not have been included in the audio mix.")
        if max_db is not None and max_db > -0.5:
            return QCResult(name, QCResult.FAIL,
                            f"Audio clipping (max: {max_db:.1f} dB)",
                            "Reduce music or voiceover volume to prevent clipping.")
        if mean_db < -30:
            return QCResult(name, QCResult.WARN,
                            f"Audio is quiet (mean: {mean_db:.1f} dB). Consider increasing VO volume.")

        max_str = f", max: {max_db:.1f} dB" if max_db is not None else ""
        return QCResult(name, QCResult.PASS, f"Audio OK (mean: {mean_db:.1f} dB{max_str})")

    except (subprocess.TimeoutExpired, FileNotFoundError):
        return QCResult(name, QCResult.WARN, "Could not run audio level check (ffmpeg timeout or missing)")


def _check_black_frames(video_path: str) -> QCResult:
    """Check for black or frozen frames using blackdetect."""
    name = "Black/Frozen Frames"

    try:
        result = subprocess.run(
            [
                "ffmpeg", "-i", video_path,
                "-vf", "blackdetect=d=0.5:pix_th=0.10",
                "-an", "-f", "null", "-",
            ],
            capture_output=True, text=True, timeout=120,
        )
        stderr = result.stderr

        # Count black frame detections
        black_segments = []
        for line in stderr.split("\n"):
            if "black_start:" in line:
                try:
                    parts = line.split("black_start:")[1]
                    start = float(parts.split()[0])
                    dur_part = parts.split("black_duration:")[1] if "black_duration:" in parts else ""
                    dur = float(dur_part.split()[0]) if dur_part else 0
                    black_segments.append({"start": start, "duration": dur})
                except (ValueError, IndexError):
                    pass

        if not black_segments:
            return QCResult(name, QCResult.PASS, "No black frames detected")

        total_black = sum(s["duration"] for s in black_segments)
        if total_black > 1.0:
            return QCResult(name, QCResult.FAIL,
                            f"{len(black_segments)} black segment(s), total {total_black:.1f}s",
                            "Check clip transitions. A clip may be missing or too short.")
        else:
            return QCResult(name, QCResult.WARN,
                            f"{len(black_segments)} brief black segment(s), total {total_black:.1f}s")

    except (subprocess.TimeoutExpired, FileNotFoundError):
        return QCResult(name, QCResult.WARN, "Could not run black frame check")


def _check_caption_coverage(video_path: str, session: dict) -> QCResult:
    """Check caption timing coverage vs voiceover duration."""
    name = "Caption Coverage"

    caption_style = session.get("caption_style", "none")
    if not caption_style or caption_style == "none":
        return QCResult(name, QCResult.PASS, "No captions configured (skipped)")

    timestamps_path = session.get("timestamps_path", "")
    if not timestamps_path or not os.path.exists(timestamps_path):
        return QCResult(name, QCResult.WARN,
                        "No timestamp data available for caption coverage check")

    try:
        with open(timestamps_path) as f:
            ts_data = json.load(f)

        # Get VO duration from word timestamps
        words = ts_data if isinstance(ts_data, list) else ts_data.get("words", [])
        if not words:
            return QCResult(name, QCResult.WARN, "No word timestamps in data")

        vo_duration = max(w.get("end", 0) for w in words) if words else 0

        # Get video duration
        probe = _ffprobe_json(video_path)
        video_duration = float(probe.get("format", {}).get("duration", 0)) if probe else 0

        if video_duration <= 0:
            return QCResult(name, QCResult.WARN, "Could not determine video duration for coverage check")

        coverage = vo_duration / video_duration if video_duration > 0 else 0

        if coverage < 0.6:
            return QCResult(name, QCResult.FAIL,
                            f"Caption coverage too low ({coverage:.0%} of video)",
                            "Voiceover is much shorter than video. Extend VO script or reduce video length.")
        elif coverage < 0.8:
            return QCResult(name, QCResult.WARN,
                            f"Caption coverage is {coverage:.0%} of video. Last {(1 - coverage) * video_duration:.1f}s will have no captions.")
        else:
            return QCResult(name, QCResult.PASS,
                            f"Caption coverage: {coverage:.0%} of video duration")

    except (json.JSONDecodeError, OSError, KeyError) as e:
        return QCResult(name, QCResult.WARN, f"Could not analyze caption coverage: {e}")
