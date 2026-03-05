#!/usr/bin/env python3
"""
analyze_sessions.py -- Extract production patterns from completed video sessions.

Parses completed session JSON files and generates aggregate statistics
for populating brand context files (video-style.md, DESIGN-SYSTEM.md).

Usage:
    python3 analyze_sessions.py [--profile-root <path>] [--format markdown|json]

Derives profile root from script location if not specified.
"""

import collections
import json
import os
import sys
from pathlib import Path


def analyze_sessions(profile_root: str, output_format: str = "markdown") -> dict:
    """Analyze all completed sessions and return aggregate stats."""
    sessions_dir = Path(profile_root) / "workspace" / ".video-sessions" / "completed"
    if not sessions_dir.exists():
        print(f"No completed sessions directory at {sessions_dir}")
        return {}

    voices = collections.Counter()
    captions = collections.Counter()
    aspects = collections.Counter()
    modes = collections.Counter()
    moods = collections.Counter()
    durations = []
    scene_counts = []
    music_volumes = []
    footage_sources = collections.Counter()
    delivered = 0
    total = 0

    for f in sorted(sessions_dir.iterdir()):
        if not f.name.endswith(".json") or "catalog" in f.name:
            continue
        total += 1
        try:
            session = json.loads(f.read_text())
        except (json.JSONDecodeError, OSError):
            continue

        voices[session.get("voice_name") or "none"] += 1
        captions[session.get("caption_style") or "none"] += 1
        aspects[session.get("aspect_ratio") or "none"] += 1
        modes[session.get("mode") or "none"] += 1

        if session.get("delivered"):
            delivered += 1

        mv = session.get("music_volume")
        if mv is not None:
            music_volumes.append(float(mv))

        sb = session.get("storyboard") or {}
        mood = sb.get("mood", "")
        if mood:
            moods[mood] += 1

        dur = sb.get("total_duration")
        if dur:
            durations.append(float(dur))

        scenes = sb.get("scenes", [])
        if scenes:
            scene_counts.append(len(scenes))
            for scene in scenes:
                src = scene.get("footage_source", "")
                prefix = src.split(":")[0] if ":" in src else "raw"
                footage_sources[prefix] += 1

    stats = {
        "total_sessions": total,
        "delivered": delivered,
        "delivery_rate": f"{delivered / max(total, 1) * 100:.0f}%",
        "voices": dict(voices.most_common()),
        "captions": dict(captions.most_common()),
        "aspects": dict(aspects.most_common()),
        "modes": dict(modes.most_common()),
        "moods": dict(moods.most_common(10)),
        "footage_sources": dict(footage_sources.most_common()),
        "duration_min": min(durations) if durations else 0,
        "duration_max": max(durations) if durations else 0,
        "duration_avg": sum(durations) / len(durations) if durations else 0,
        "scenes_min": min(scene_counts) if scene_counts else 0,
        "scenes_max": max(scene_counts) if scene_counts else 0,
        "scenes_avg": sum(scene_counts) / len(scene_counts) if scene_counts else 0,
        "music_volume_avg": sum(music_volumes) / len(music_volumes) if music_volumes else 0,
    }

    if output_format == "json":
        print(json.dumps(stats, indent=2))
    else:
        _print_markdown(stats)

    return stats


def _print_markdown(stats: dict):
    """Print stats as readable markdown."""
    print("# Video Session Analysis Report")
    print()
    print(f"**Total sessions:** {stats['total_sessions']}")
    print(f"**Delivered:** {stats['delivered']} ({stats['delivery_rate']})")
    print()

    print("## Voice Distribution")
    for name, count in stats["voices"].items():
        pct = count / max(stats["total_sessions"], 1) * 100
        print(f"- {name}: {count} ({pct:.0f}%)")

    print()
    print("## Caption Styles")
    for style, count in stats["captions"].items():
        pct = count / max(stats["total_sessions"], 1) * 100
        print(f"- {style}: {count} ({pct:.0f}%)")

    print()
    print("## Aspect Ratios")
    for ar, count in stats["aspects"].items():
        pct = count / max(stats["total_sessions"], 1) * 100
        print(f"- {ar}: {count} ({pct:.0f}%)")

    print()
    print("## Duration")
    print(f"- Min: {stats['duration_min']:.0f}s")
    print(f"- Max: {stats['duration_max']:.0f}s")
    print(f"- Average: {stats['duration_avg']:.0f}s")

    print()
    print("## Scene Count")
    print(f"- Min: {stats['scenes_min']}")
    print(f"- Max: {stats['scenes_max']}")
    print(f"- Average: {stats['scenes_avg']:.1f}")

    print()
    print("## Moods (top 10)")
    for mood, count in stats["moods"].items():
        print(f"- \"{mood}\": {count}")

    print()
    print("## Footage Sources")
    for src, count in stats["footage_sources"].items():
        print(f"- {src}: {count}")

    print()
    print(f"## Music Volume")
    print(f"- Average: {stats['music_volume_avg']:.2f}")


if __name__ == "__main__":
    # Derive profile root from script location
    # IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
    script_dir = Path(__file__).parent
    default_root = str(script_dir.parent.parent.parent)

    profile_root = default_root
    fmt = "markdown"

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--profile-root" and i + 1 < len(args):
            profile_root = args[i + 1]
            i += 2
        elif args[i] == "--format" and i + 1 < len(args):
            fmt = args[i + 1]
            i += 2
        else:
            print(f"Unknown arg: {args[i]}")
            sys.exit(1)

    analyze_sessions(profile_root, fmt)
