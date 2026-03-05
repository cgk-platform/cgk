#!/usr/bin/env python3
"""Scan session JSONL for image attachments associated with a Slack thread.

Usage: python3 scan_thread_media.py <thread_ts>
Output: One absolute path per line for each image found.
Exit 0 always (empty output = no images found).
"""
import sys, os, re, glob
from pathlib import Path

IMAGE_MIMES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
MEDIA_PATTERN = re.compile(
    r'\[media attached \d+/\d+: (media/inbound/[a-f0-9-]+\.\w+) \(([^)]+)\)'
)


def main():
    if len(sys.argv) < 2:
        sys.exit(0)  # No thread_ts = no images, not an error

    thread_ts = sys.argv[1]
    # IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
    profile_root = Path(__file__).parent.parent.parent.parent
    sessions_dir = profile_root / "agents" / "main" / "sessions"

    if not sessions_dir.exists():
        sys.exit(0)

    found = set()

    # Strategy 1: Topic-named session files (most reliable)
    for fpath in glob.glob(str(sessions_dir / f"*-topic-{thread_ts}.jsonl")):
        scan_file(fpath, found)

    # Strategy 2: Scan all current JSONL files for this thread_ts
    if not found:
        for fpath in sessions_dir.glob("*.jsonl"):
            if ".lock" in str(fpath):
                continue
            scan_file_by_thread(str(fpath), thread_ts, found)

    # Filter to existing image files, resolve to absolute paths
    for rel_path, mime in sorted(found):
        if mime not in IMAGE_MIMES:
            continue
        abs_path = profile_root / rel_path
        if abs_path.exists():
            print(str(abs_path))


def scan_file(fpath, found):
    try:
        with open(fpath) as f:
            for line in f:
                if "media attached" not in line:
                    continue
                for m in MEDIA_PATTERN.finditer(line):
                    found.add((m.group(1), m.group(2)))
    except Exception:
        pass


def scan_file_by_thread(fpath, thread_ts, found):
    try:
        with open(fpath) as f:
            for line in f:
                if thread_ts not in line or "media attached" not in line:
                    continue
                for m in MEDIA_PATTERN.finditer(line):
                    found.add((m.group(1), m.group(2)))
    except Exception:
        pass


if __name__ == "__main__":
    main()
